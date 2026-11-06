# Tienda 3479

Sistema de ventas con base de datos **PostgreSQL** normalizada (3FN), API REST en Node.js y página web.

Incluye panel de resumen con gráfica de ventas, registro de ventas con control de stock,
comprobante imprimible, buscador y exportación a CSV.

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
3. Instalar dependencias y crear las tablas con los datos de la tienda:

```
npm install
npm run db:init
```

4. Arrancar y abrir http://localhost:3000

```
npm start
```

`npm run db:init` borra y vuelve a crear las tablas (`sql/schema.sql`) y carga los datos (`sql/datos.sql`)
en una sola transacción. Para crear solo las tablas vacías: `npm run db:init -- --vacia`.

## Base de datos

`CATEGORIAS` 1─N `PRODUCTOS` 1─N `DETALLE_VENTA` N─1 `VENTAS` N─1 `CLIENTES`

- Llaves primarias `GENERATED ALWAYS AS IDENTITY`, llaves foráneas, `UNIQUE` y `CHECK`.
- Índices en las llaves foráneas y en la fecha de venta.
- `ventas.fecha` es `TIMESTAMPTZ`; los reportes cuentan los días en hora de Guatemala.

El paso a paso de la normalización (1FN, 2FN, 3FN) está en [docs/normalizacion.md](docs/normalizacion.md).

## API

| Método | Ruta                   | Acción                                         |
|--------|------------------------|------------------------------------------------|
| GET    | /api/estado            | Estado de la conexión                          |
| GET    | /api/{tabla}           | Listar (`categorias`, `productos`, `clientes`) |
| GET    | /api/{tabla}/:id       | Obtener uno                                    |
| POST   | /api/{tabla}           | Crear                                          |
| PUT    | /api/{tabla}/:id       | Actualizar                                     |
| DELETE | /api/{tabla}/:id       | Eliminar                                       |
| GET    | /api/ventas            | Historial con total por venta                  |
| GET    | /api/ventas/:id        | Venta con su detalle                           |
| POST   | /api/ventas            | Registrar venta (descuenta stock)              |
| DELETE | /api/ventas/:id        | Anular venta (devuelve stock)                  |
| GET    | /api/reportes/resumen  | Indicadores, ventas por día y rankings         |

Cuerpos JSON:

- Categoría: `{ "nombre": "Accesorios" }`
- Producto: `{ "nombre": "Mouse", "precio": 85.5, "stock": 10, "categoria_id": 2 }`
- Cliente: `{ "nombre": "Ana Lopez", "nit_dpi": "1234567-8", "correo": "ana@correo.com" }`
- Venta: `{ "cliente_id": 1, "productos": [{ "producto_id": 1, "cantidad": 2 }] }`

Los errores responden con `{ "error": "mensaje" }` y el código HTTP correspondiente
(400 datos inválidos, 404 no existe, 409 duplicado, sin stock o con registros relacionados).

Ejemplos listos para probar en `requests.http` (extensión REST Client).

## Estructura

```
sql/
  crear-base.sql       Usuario y base de datos (una sola vez)
  schema.sql           Tablas, restricciones e índices
  datos.sql            Datos de la tienda
docs/normalizacion.md  Normalización paso a paso
scripts/init-db.js     Ejecuta schema.sql y datos.sql (npm run db:init)
src/
  server.js            Servidor Express y montaje de rutas
  db.js                Pool de conexiones y transacciones
  validacion.js        Validación de datos recibidos
  errores.js           Errores claros (traduce los códigos de PostgreSQL)
  routes/
    crud.js            CRUD genérico para tablas simples
    ventas.js          Ventas con transacción y control de stock
    reportes.js        Reportes con JOIN, GROUP BY y generate_series
public/
  index.html           Página
  styles.css           Estilos
  js/                  Módulos: app, comun, resumen, ventas, crud
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
