const express = require('express');
const db = require('../db');
const { ErrorApi } = require('../errores');
const { convertir, leerId } = require('../validacion');

const router = express.Router();

async function buscarVenta(id) {
  const { rows } = await db.query(
    'SELECT id, fecha, cliente_id, cliente, nit_dpi, total FROM vista_ventas WHERE id = :id',
    { id }
  );
  if (!rows.length) throw new ErrorApi(404, 'Venta no encontrada.');

  const detalle = await db.query(
    `SELECT d.producto_id, p.nombre AS producto, d.cantidad, d.precio_unitario,
            d.cantidad * d.precio_unitario AS subtotal
       FROM detalle_venta d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.venta_id = :id
      ORDER BY p.nombre`,
    { id }
  );
  return { ...rows[0], detalle: detalle.rows };
}

// Valida el pedido y junta las líneas repetidas del mismo producto
function leerPedido(body = {}) {
  const clienteId = convertir('cliente_id', 'entero', body.cliente_id);
  if (!clienteId) throw new ErrorApi(400, 'El campo "cliente_id" es obligatorio.');
  if (!Array.isArray(body.productos) || !body.productos.length) {
    throw new ErrorApi(400, 'La venta debe tener al menos un producto.');
  }

  const cantidades = new Map();
  for (const linea of body.productos) {
    const productoId = convertir('producto_id', 'entero', linea.producto_id);
    const cantidad = convertir('cantidad', 'entero', linea.cantidad);
    if (!productoId) throw new ErrorApi(400, 'Cada producto necesita "producto_id".');
    if (!cantidad || cantidad <= 0) throw new ErrorApi(400, 'La cantidad debe ser mayor que cero.');
    cantidades.set(productoId, (cantidades.get(productoId) || 0) + cantidad);
  }
  return { clienteId, cantidades };
}

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT id, fecha, cliente, productos, total FROM vista_ventas ORDER BY id DESC');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  res.json(await buscarVenta(leerId(req.params.id)));
});

// Registra la venta, su detalle y descuenta el stock en una sola transacción
router.post('/', async (req, res) => {
  const { clienteId, cantidades } = leerPedido(req.body);

  const ventaId = await db.transaccion(async ejecutar => {
    const { outBinds } = await ejecutar(
      'INSERT INTO ventas (cliente_id) VALUES (:cliente_id) RETURNING id INTO :nuevo_id',
      { cliente_id: clienteId, nuevo_id: db.ID_SALIDA }
    );
    const id = outBinds.nuevo_id[0];

    for (const [productoId, cantidad] of cantidades) {
      // FOR UPDATE bloquea el producto para que dos ventas no vendan el mismo stock a la vez
      const { rows } = await ejecutar('SELECT nombre, precio, stock FROM productos WHERE id = :id FOR UPDATE', { id: productoId });
      if (!rows.length) throw new ErrorApi(400, `El producto ${productoId} no existe.`);
      const producto = rows[0];
      if (producto.stock < cantidad) {
        throw new ErrorApi(409, `Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stock}).`);
      }

      await ejecutar(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario)
         VALUES (:venta_id, :producto_id, :cantidad, :precio)`,
        { venta_id: id, producto_id: productoId, cantidad, precio: producto.precio }
      );
      await ejecutar('UPDATE productos SET stock = stock - :cantidad WHERE id = :id', { cantidad, id: productoId });
    }
    return id;
  });

  res.status(201).json(await buscarVenta(ventaId));
});

// Anula la venta: devuelve el stock y borra la venta (el detalle se borra en cascada)
router.delete('/:id', async (req, res) => {
  const id = leerId(req.params.id);

  await db.transaccion(async ejecutar => {
    await ejecutar(
      `UPDATE productos p
          SET stock = stock + (SELECT d.cantidad FROM detalle_venta d
                                WHERE d.venta_id = :id AND d.producto_id = p.id)
        WHERE p.id IN (SELECT producto_id FROM detalle_venta WHERE venta_id = :id)`,
      { id }
    );
    const { rowCount } = await ejecutar('DELETE FROM ventas WHERE id = :id', { id });
    if (!rowCount) throw new ErrorApi(404, 'Venta no encontrada.');
  });

  res.status(204).end();
});

module.exports = router;
