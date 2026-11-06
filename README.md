# Tienda 3479

Sistema de ventas con base de datos Oracle normalizada (3FN), API REST en Node.js y página web.

**En línea:** https://187-127-254-87.sslip.io

## Requisitos

- Node.js 20 o superior
- Una base Oracle (local, en la nube o la que den en el examen)

## Cómo ejecutar

1. Copiar `.env.example` como `.env` y poner las credenciales de la base.
2. Instalar dependencias y crear las tablas con datos de ejemplo:

```
npm install
npm run db:init
```

3. Arrancar y abrir http://localhost:3000

```
npm start
```

`npm run db:init` borra y vuelve a crear las tablas. También se puede ejecutar `sql/schema.sql` en SQL Developer.

## Base de datos

`CATEGORIAS` 1─N `PRODUCTOS` 1─N `DETALLE_VENTA` N─1 `VENTAS` N─1 `CLIENTES`

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
sql/schema.sql         Tablas, restricciones y datos de ejemplo
docs/normalizacion.md  Normalización paso a paso
scripts/init-db.js     Ejecuta schema.sql (npm run db:init)
src/server.js          Servidor Express y rutas
src/db.js              Pool de conexiones y transacciones
src/routes/crud.js     CRUD genérico para tablas simples
src/routes/ventas.js   Ventas con transacción y control de stock
src/validacion.js      Validación de datos recibidos
src/errores.js         Errores claros (incluye errores de Oracle)
public/                Página web (HTML, CSS y módulos JS)
requests.http          Ejemplos de llamadas a la API
Dockerfile             Imagen de la app para producción
docker-compose.yml     Servicio de producción
```

## Producción

VPS (Ubuntu 24.04) con Docker. La app corre en `/opt/tienda3479` y usa la infraestructura compartida
del servidor (`/opt/infra`): Oracle 23ai Free (`oracle:1521`) y HTTPS con Caddy, unidos por la red `web`.
En el servidor, `/opt/tienda3479/.env` define `DB_USER` y `DB_PASSWORD`.

Publicar cambios:

```
npm run deploy
```
