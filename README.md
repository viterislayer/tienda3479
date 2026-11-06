# Tienda 3479

Página web conectada a la base Oracle `DB_TIENDA3479` (Oracle 23ai Free, servicio `FREEPDB1`).

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

## Estructura

```
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
