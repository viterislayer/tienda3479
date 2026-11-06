# Tienda 3479

Página web conectada a la base Oracle `DB_TIENDA3479` (Oracle 23ai Free, servicio `FREEPDB1`).

**En línea:** https://187-127-254-87.sslip.io

## Requisitos

- Node.js 20 o superior
- Una base Oracle (local u Oracle Cloud)

## Cómo ejecutar

1. Crear las tablas ejecutando `sql/schema.sql` en la base.
2. Copiar `.env.example` como `.env` y poner las credenciales.
3. Instalar y arrancar:

```
npm install
npm start
```

4. Abrir http://localhost:3000

## Producción

Servidor VPS (Ubuntu 24.04) con Docker Compose. La app corre en `/opt/tienda3479` y usa la
infraestructura compartida del servidor (`/opt/infra`): Oracle 23ai Free (`oracle:1521`) y HTTPS con Caddy,
conectados por la red Docker `web`.

En el servidor, `/opt/tienda3479/.env` define `DB_USER` y `DB_PASSWORD`.

Publicar cambios:

```
npm run deploy
```

## Estructura

```
Dockerfile         Imagen de la app Node.js
docker-compose.yml Servicio de producción de la app
.env.example       Plantilla de credenciales (copiar como .env)
sql/schema.sql     Creación de tablas y datos de ejemplo
src/db.js          Pool de conexiones a Oracle
src/server.js      Servidor Express + API REST
public/            Página web (HTML, CSS, JS)
requests.http      Ejemplos de llamadas a la API
```

## API

| Método | Ruta                  | Acción              |
|--------|-----------------------|---------------------|
| GET    | /api/estado           | Estado de conexión  |
| GET    | /api/productos        | Listar productos    |
| GET    | /api/productos/:id    | Obtener un producto |
| POST   | /api/productos        | Crear producto      |
| PUT    | /api/productos/:id    | Actualizar producto |
| DELETE | /api/productos/:id    | Eliminar producto   |

Las mismas rutas existen para `/api/clientes`.

Cuerpo JSON de producto: `{ "NOMBRE": "...", "PRECIO": 10.5, "STOCK": 3 }`
Cuerpo JSON de cliente: `{ "NOMBRE": "...", "NIT_DPI": "...", "CORREO": "..." }`
