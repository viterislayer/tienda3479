# Normalización de la base de datos — Tienda 3479

Partimos de cómo se anotaría una venta en una sola hoja de cálculo y la llevamos paso a paso hasta la **Tercera Forma Normal (3FN)**.

## 0. Tabla sin normalizar

| no_venta | fecha      | cliente   | nit_cliente | correo_cliente  | productos                         | categorias                 | precios        | total   |
|----------|------------|-----------|-------------|-----------------|-----------------------------------|----------------------------|----------------|---------|
| 1        | 05/11/2026 | Ana Lopez | 1234567-8   | ana@correo.com  | Laptop HP x1, Mouse inalambrico x2 | Computadoras, Accesorios   | 4500, 85.50    | 4671.00 |
| 2        | 06/11/2026 | Ana Lopez | 1234567-8   | ana@correo.com  | Mouse inalambrico x1              | Accesorios                 | 85.50          | 85.50   |

**Problemas:**
- Una celda guarda varios valores (`productos`, `categorias`, `precios`).
- Los datos de Ana se repiten en cada venta: si cambia su correo, hay que cambiarlo en muchas filas (**anomalía de actualización**).
- No se puede registrar un producto que todavía no se ha vendido (**anomalía de inserción**).
- Si se borra la única venta de un producto, se pierde el producto (**anomalía de eliminación**).

## 1FN — Valores atómicos

**Regla:** cada celda tiene un solo valor y no hay grupos repetidos.

Se crea una fila por cada producto vendido. La llave primaria pasa a ser **(no_venta, producto)**.

| no_venta | fecha      | cliente   | nit_cliente | correo_cliente | producto          | categoria    | precio_unitario | cantidad |
|----------|------------|-----------|-------------|----------------|-------------------|--------------|-----------------|----------|
| 1        | 05/11/2026 | Ana Lopez | 1234567-8   | ana@correo.com | Laptop HP         | Computadoras | 4500.00         | 1        |
| 1        | 05/11/2026 | Ana Lopez | 1234567-8   | ana@correo.com | Mouse inalambrico | Accesorios   | 85.50           | 2        |
| 2        | 06/11/2026 | Ana Lopez | 1234567-8   | ana@correo.com | Mouse inalambrico | Accesorios   | 85.50           | 1        |

El `total` se elimina porque se puede **calcular** (suma de cantidad × precio_unitario).

## 2FN — Sin dependencias parciales

**Regla:** estar en 1FN y que cada columna dependa de **toda** la llave primaria, no solo de una parte.

Con la llave **(no_venta, producto)**:

| Columna                                | Depende de          | ¿Parcial? |
|----------------------------------------|---------------------|-----------|
| fecha, cliente, nit, correo            | solo `no_venta`     | Sí        |
| categoria                              | solo `producto`     | Sí        |
| cantidad, precio_unitario              | `no_venta` + `producto` | No    |

Se separa en tres tablas:

- **VENTAS** (`id`, fecha, cliente, nit_cliente, correo_cliente)
- **PRODUCTOS** (`id`, nombre, categoria, precio, stock)
- **DETALLE_VENTA** (`venta_id`, `producto_id`, cantidad, precio_unitario)

`precio_unitario` se queda en el detalle a propósito: es el precio **en el momento de la venta**. Si mañana el producto sube de precio, las ventas pasadas no deben cambiar. Por eso no es un dato repetido.

## 3FN — Sin dependencias transitivas

**Regla:** estar en 2FN y que ninguna columna que no es llave dependa de otra columna que tampoco es llave.

- En **VENTAS**: `cliente` y `correo_cliente` dependen de `nit_cliente`, no de la venta (venta → nit → nombre). Se crea **CLIENTES** y la venta solo guarda `cliente_id`.
- En **PRODUCTOS**: el nombre de la categoría se repetiría en cada producto. Se crea **CATEGORIAS** y el producto solo guarda `categoria_id`.

## Resultado final (3FN)

```
CATEGORIAS (id PK, nombre UNIQUE)
     1
     │
     N
PRODUCTOS (id PK, nombre, precio, stock, categoria_id FK)
     1
     │
     N
DETALLE_VENTA (venta_id PK/FK, producto_id PK/FK, cantidad, precio_unitario)
     N
     │
     1
VENTAS (id PK, cliente_id FK, fecha)
     N
     │
     1
CLIENTES (id PK, nombre, nit_dpi UNIQUE, correo UNIQUE)
```

## Ingresos y egresos

Se aplican las mismas reglas a las compras y a los gastos:

```
PROVEEDORES (id PK, nombre, nit UNIQUE, telefono)
     1 ─ N  COMPRAS (id PK, proveedor_id FK, fecha)
                 1 ─ N  DETALLE_COMPRA (compra_id PK/FK, producto_id PK/FK, cantidad, costo_unitario)
TIPOS_GASTO (id PK, nombre UNIQUE)
     1 ─ N  GASTOS (id PK, tipo_gasto_id FK, descripcion, monto, fecha)
```

- `DETALLE_COMPRA` resuelve la relación N:M entre compras y productos, igual que `DETALLE_VENTA`.
- El nombre del tipo de gasto vive en `TIPOS_GASTO` (no se repite en cada gasto) → 3FN.
- Los totales y el balance **no se guardan**: se calculan en `vista_movimientos` y `vista_balance_mensual`.

**Relaciones:**
- Una categoría tiene muchos productos (1:N).
- Un cliente tiene muchas ventas (1:N).
- Una venta tiene muchos productos y un producto aparece en muchas ventas (N:M). **DETALLE_VENTA** resuelve esa relación.

**Reglas de integridad** (`sql/migraciones/`):
- Llaves primarias `IDENTITY` (Oracle genera el id).
- Índices en las llaves foráneas y en la fecha de venta para acelerar los JOIN y los reportes.
- Llaves foráneas: no se puede vender a un cliente ni un producto que no existe.
- `UNIQUE` en el nombre de categoría, en el NIT/DPI y en el correo.
- `CHECK`: precio y stock no negativos, cantidad mayor que cero.
- `ON DELETE CASCADE`: al anular una venta se borra su detalle.
- El total de una venta **no se guarda**: se calcula en la vista `vista_ventas` a partir del detalle (evita datos derivados, 3FN).
