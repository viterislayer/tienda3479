const express = require('express');
const db = require('../db');
const { ErrorApi, restriccion } = require('../errores');
const { convertir, leerId } = require('../validacion');

const router = express.Router();

async function buscarCompra(id) {
  const { rows } = await db.query(
    'SELECT id, fecha, proveedor_id, proveedor, nit, total FROM vista_compras WHERE id = :id',
    { id }
  );
  if (!rows.length) throw new ErrorApi(404, 'Compra no encontrada.');

  const detalle = await db.query(
    `SELECT d.producto_id, p.nombre AS producto, d.cantidad, d.costo_unitario,
            d.cantidad * d.costo_unitario AS subtotal
       FROM detalle_compra d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.compra_id = :id
      ORDER BY p.nombre`,
    { id }
  );
  return { ...rows[0], detalle: detalle.rows };
}

// Valida la compra; si un producto se repite, suma las cantidades (el costo debe ser el mismo)
function leerCompra(body = {}) {
  const proveedorId = convertir('proveedor_id', 'entero', body.proveedor_id);
  if (!proveedorId) throw new ErrorApi(400, 'El campo "proveedor_id" es obligatorio.');
  if (!Array.isArray(body.productos) || !body.productos.length) {
    throw new ErrorApi(400, 'La compra debe tener al menos un producto.');
  }

  const lineas = new Map();
  for (const linea of body.productos) {
    const productoId = convertir('producto_id', 'entero', linea.producto_id);
    const cantidad = convertir('cantidad', 'entero', linea.cantidad);
    const costo = convertir('costo_unitario', 'numero', linea.costo_unitario);
    if (!productoId) throw new ErrorApi(400, 'Cada producto necesita "producto_id".');
    if (!cantidad || cantidad <= 0) throw new ErrorApi(400, 'La cantidad debe ser mayor que cero.');
    if (costo === null || costo < 0) throw new ErrorApi(400, 'El costo unitario es obligatorio y no puede ser negativo.');

    const existente = lineas.get(productoId);
    if (existente && existente.costo !== costo) {
      throw new ErrorApi(400, `El producto ${productoId} aparece dos veces con costos distintos.`);
    }
    lineas.set(productoId, { cantidad: (existente?.cantidad || 0) + cantidad, costo });
  }
  return { proveedorId, lineas };
}

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT id, fecha, proveedor, productos, total FROM vista_compras ORDER BY id DESC');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  res.json(await buscarCompra(leerId(req.params.id)));
});

// Registra la compra y su detalle, y aumenta el stock, en una sola transacción
router.post('/', async (req, res) => {
  const { proveedorId, lineas } = leerCompra(req.body);

  const compraId = await db.transaccion(async ejecutar => {
    const { outBinds } = await ejecutar(
      'INSERT INTO compras (proveedor_id) VALUES (:proveedor_id) RETURNING id INTO :nuevo_id',
      { proveedor_id: proveedorId, nuevo_id: db.ID_SALIDA }
    );
    const id = outBinds.nuevo_id[0];

    for (const [productoId, { cantidad, costo }] of lineas) {
      const { rowCount } = await ejecutar('UPDATE productos SET stock = stock + :cantidad WHERE id = :id', { cantidad, id: productoId });
      if (!rowCount) throw new ErrorApi(400, `El producto ${productoId} no existe.`);
      await ejecutar(
        `INSERT INTO detalle_compra (compra_id, producto_id, cantidad, costo_unitario)
         VALUES (:compra_id, :producto_id, :cantidad, :costo)`,
        { compra_id: id, producto_id: productoId, cantidad, costo }
      );
    }
    return id;
  });

  res.status(201).json(await buscarCompra(compraId));
});

// Anula la compra: retira del stock lo que entró. Si ya se vendió parte, el stock quedaría negativo y no se permite.
router.delete('/:id', async (req, res) => {
  const id = leerId(req.params.id);

  try {
    await db.transaccion(async ejecutar => {
      await ejecutar(
        `UPDATE productos p
            SET stock = stock - (SELECT d.cantidad FROM detalle_compra d
                                  WHERE d.compra_id = :id AND d.producto_id = p.id)
          WHERE p.id IN (SELECT producto_id FROM detalle_compra WHERE compra_id = :id)`,
        { id }
      );
      const { rowCount } = await ejecutar('DELETE FROM compras WHERE id = :id', { id });
      if (!rowCount) throw new ErrorApi(404, 'Compra no encontrada.');
    });
  } catch (err) {
    if (restriccion(err) === 'ck_productos_stock') {
      throw new ErrorApi(409, 'No se puede anular: parte de esa mercadería ya se vendió.');
    }
    throw err;
  }

  res.status(204).end();
});

module.exports = router;
