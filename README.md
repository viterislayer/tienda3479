# Tienda 3479

Sistema de ventas con base de datos **PostgreSQL** normalizada (3FN), API REST en Node.js y página web.

Incluye ventas y compras con control de stock, gastos de operación, ingresos/egresos con balance,
panel de resumen con gráfica, comprobante imprimible, buscador y exportación a CSV.

**En línea:** https://187-127-254-87.sslip.io

## Tecnologías

| Capa          | Tecnología                                   |
|---------------|----------------------------------------------|
| Base de datos | PostgreSQL 17                                |
| Backend       | Node.js 20+, Express 5, `pg` (node-postgres) |
| Frontend      | HTML, CSS y JavaScript (módulos ES), sin frameworks |
| Producción    | Docker Compose, Caddy (HTTPS automático), VPS Ubuntu |

## Cómo ejecutar en local

1. Crear el usuario y la base (una sola vez, como administrador de PostgreSQL):

```
psql -U postgres -h localhost -v clave='LA_CONTRASEÑA' -f sql/crear-base.sql
```

2. Copiar `.env.example` como `.env` y poner esa misma contraseña en `DB_PASSWORD`.
3. Instalar dependencias y crear la estructura con los datos de la tienda:

```
npm install
npm run db:init
```

4. Arrancar y abrir http://localhost:3000

```
npm start
```

| Comando | Qué hace |
|---|---|
| `npm run db:init` | Base desde cero: aplica todas las migraciones y carga `sql/datos.sql` (**borra los datos**) |
| `npm run db:init -- --vacia` | Igual, pero sin datos |
| `npm run db:migrar` | Aplica solo las migraciones pendientes, **sin borrar datos** |

### Migraciones

Cada cambio de estructura es un archivo numerado en `sql/migraciones/`. `db:migrar` aplica en orden los que faltan,
cada uno en su propia transacción, y los registra en la tabla `schema_migraciones`. El despliegue las aplica solo.

## Base de datos

```
CATEGORIAS 1─N PRODUCTOS 1─N DETALLE_VENTA  N─1 VENTAS  N─1 CLIENTES
                PRODUCTOS 1─N DETALLE_COMPRA N─1 COMPRAS N─1 PROVEEDORES
TIPOS_GASTO 1─N GASTOS
```

- **Ingresos:** ventas. **Egresos:** compras a proveedores (aumentan el stock) y gastos de operación.

- Llaves primarias `GENERATED ALWAYS AS IDENTITY` y llaves foráneas en todas las relaciones.
- Reglas `CHECK`: precio y stock no negativos, cantidad mayor que cero, nombres no vacíos, formato de correo y de NIT/DPI.
- Únicos sin distinguir mayúsculas (índices sobre `lower()`): nombre de categoría y correo; NIT/DPI único.
- Índices en las llaves foráneas y en la fecha de venta.
- Auditoría: `creado_en` en categorías, productos y clientes; `ventas.fecha` es `TIMESTAMPTZ`.
- Vistas: `vista_ventas`, `vista_compras` (totales calculados), `vista_inventario` (estado del stock),
  `vista_movimientos` (ingresos y egresos en un solo listado) y `vista_balance_mensual`.
- Tablas, columnas y vistas documentadas con `COMMENT` (visible en pgAdmin).
- Consultas útiles para revisar la base en `sql/consultas.sql`.

El paso a paso de la normalización (1FN, 2FN, 3FN) está en [docs/normalizacion.md](docs/normalizacion.md).

## API

| Método | Ruta                   | Acción                                         |
|--------|------------------------|------------------------------------------------|
| GET    | /api/estado            | Estado de la conexión                          |
| GET    | /api/{tabla}           | Listar: `categorias`, `productos`, `clientes`, `proveedores`, `tipos-gasto`, `gastos` |
| GET    | /api/{tabla}/:id       | Obtener uno                                    |
| POST   | /api/{tabla}           | Crear                                          |
| PUT    | /api/{tabla}/:id       | Actualizar                                     |
| DELETE | /api/{tabla}/:id       | Eliminar                                       |
| GET    | /api/ventas            | Historial con total por venta                  |
| GET    | /api/ventas/:id        | Venta con su detalle                           |
| POST   | /api/ventas            | Registrar venta (descuenta stock)              |
| DELETE | /api/ventas/:id        | Anular venta (devuelve stock)                  |
| GET    | /api/compras           | Historial de compras con total                 |
| GET    | /api/compras/:id       | Compra con su detalle                          |
| POST   | /api/compras           | Registrar compra (aumenta stock)               |
| DELETE | /api/compras/:id       | Anular compra (si la mercadería no se vendió)  |
| GET    | /api/finanzas/movimientos?desde=&hasta= | Ingresos, egresos y balance de un rango |
| GET    | /api/finanzas/balance-mensual | Balance de los últimos 12 meses         |
| GET    | /api/reportes/resumen  | Indicadores, ventas por día y rankings         |

Cuerpos JSON:

- Categoría: `{ "nombre": "Accesorios" }`
- Producto: `{ "nombre": "Mouse", "precio": 85.5, "stock": 10, "categoria_id": 2 }`
- Cliente: `{ "nombre": "Ana Lopez", "nit_dpi": "1234567-8", "correo": "ana@correo.com" }`
- Venta: `{ "cliente_id": 1, "productos": [{ "producto_id": 1, "cantidad": 2 }] }`
- Proveedor: `{ "nombre": "Distribuidora", "nit": "1234567-8", "telefono": "5555-5555" }`
- Compra: `{ "proveedor_id": 1, "productos": [{ "producto_id": 1, "cantidad": 5, "costo_unitario": 40 }] }`
- Gasto: `{ "fecha": "2026-11-05", "tipo_gasto_id": 1, "descripcion": "Alquiler", "monto": 1500 }`

Los errores responden con `{ "error": "mensaje" }` y el código HTTP correspondiente
(400 datos inválidos, 404 no existe, 409 duplicado, sin stock o con registros relacionados).

Ejemplos listos para probar en `requests.http` (extensión REST Client).

## Estructura

```
sql/
  crear-base.sql       Usuario y base de datos (una sola vez)
  migraciones/         Estructura versionada: 001 tablas, 002 reglas y vistas, 003 ingresos y egresos
  datos.sql            Datos de la tienda
  consultas.sql        Consultas para revisar la base (estructura, relaciones, vistas)
docs/normalizacion.md  Normalización paso a paso
scripts/
  migrar.js            Aplica migraciones pendientes (npm run db:migrar)
  init-db.js           Base desde cero (npm run db:init)
src/
  server.js            Servidor Express y montaje de rutas
  db.js                Pool de conexiones y transacciones
  validacion.js        Validación de datos recibidos
  errores.js           Errores claros (traduce los códigos de PostgreSQL)
  routes/
    crud.js            CRUD genérico para tablas simples
    ventas.js          Ventas con transacción y control de stock
    compras.js         Compras a proveedores: aumentan el stock
    finanzas.js        Ingresos, egresos y balance
    reportes.js        Reportes con JOIN, GROUP BY y generate_series
public/
  index.html           Página
  styles.css           Estilos
  js/                  Módulos: app, comun, resumen, ventas, compras, finanzas, crud
requests.http          Ejemplos de llamadas a la API
Dockerfile             Imagen de la app para producción
docker-compose.yml     Servicio de producción
```

## Producción

VPS (Ubuntu 24.04) con Docker. La app corre en `/opt/tienda3479` y usa la infraestructura compartida
del servidor (`/opt/infra`): PostgreSQL 17 (`postgres:5432`) y HTTPS con Caddy, unidos por la red `web`.
En el servidor, `/opt/tienda3479/.env` define `DB_NAME`, `DB_USER` y `DB_PASSWORD`.

Publicar cambios:

```
npm run deploy
```
