const express = require('express');
const db = require('../db');
const { ErrorApi } = require('../errores');
const { convertir, leerId } = require('../validacion');

const router = express.Router();

async function buscarVenta(id) {
  const { rows } = await db.query(
    `SELECT v.id, v.fecha, v.cliente_id, c.nombre AS cliente, c.nit_dpi
       FROM ventas v
       JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = $1`,
    [id]
  );
  if (!rows.length) throw new ErrorApi(404, 'Venta no encontrada.');

  const detalle = await db.query(
    `SELECT d.producto_id, p.nombre AS producto, d.cantidad, d.precio_unitario,
            d.cantidad * d.precio_unitario AS subtotal
       FROM detalle_venta d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.venta_id = $1
      ORDER BY p.nombre`,
    [id]
  );
  const total = detalle.rows.reduce((suma, linea) => suma + linea.subtotal, 0);
  return { ...rows[0], total, detalle: detalle.rows };
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
  const { rows } = await db.query(
    `SELECT v.id, v.fecha, c.nombre AS cliente,
            COUNT(d.producto_id) AS productos,
            COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total
       FROM ventas v
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN detalle_venta d ON d.venta_id = v.id
      GROUP BY v.id, c.nombre
      ORDER BY v.id DESC`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  res.json(await buscarVenta(leerId(req.params.id)));
});

// Registra la venta, su detalle y descuenta el stock en una sola transacción
router.post('/', async (req, res) => {
  const { clienteId, cantidades } = leerPedido(req.body);

  const ventaId = await db.transaccion(async ejecutar => {
    const venta = await ejecutar('INSERT INTO ventas (cliente_id) VALUES ($1) RETURNING id', [clienteId]);
    const id = venta.rows[0].id;

    for (const [productoId, cantidad] of cantidades) {
      // FOR UPDATE bloquea el producto para que dos ventas no vendan el mismo stock a la vez
      const { rows } = await ejecutar('SELECT nombre, precio, stock FROM productos WHERE id = $1 FOR UPDATE', [productoId]);
      if (!rows.length) throw new ErrorApi(400, `El producto ${productoId} no existe.`);
      const producto = rows[0];
      if (producto.stock < cantidad) {
        throw new ErrorApi(409, `Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stock}).`);
      }

      await ejecutar(
        'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
        [id, productoId, cantidad, producto.precio]
      );
      await ejecutar('UPDATE productos SET stock = stock - $1 WHERE id = $2', [cantidad, productoId]);
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
          SET stock = p.stock + d.cantidad
         FROM detalle_venta d
        WHERE d.producto_id = p.id AND d.venta_id = $1`,
      [id]
    );
    const { rowCount } = await ejecutar('DELETE FROM ventas WHERE id = $1', [id]);
    if (!rowCount) throw new ErrorApi(404, 'Venta no encontrada.');
  });

  res.status(204).end();
});

module.exports = router;
