# Tienda 3479

Página web conectada a la base Oracle `DB_TIENDA3479` (Oracle 23ai Free, servicio `FREEPDB1`).

## Requisitos

- Node.js 18 o superior
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

## Despliegue (producción)

- **Frontend + API:** Vercel, conectado a este repositorio. Cada push a `main` se despliega solo.
- **Base de datos:** Oracle Autonomous Database (Oracle Cloud Always Free).

Variables de entorno en Vercel:

| Variable               | Valor                                                  |
|------------------------|--------------------------------------------------------|
| `DB_USER`              | Usuario de la base                                     |
| `DB_PASSWORD`          | Contraseña del usuario                                 |
| `DB_CONNECT_STRING`    | Cadena de conexión del wallet (servicio `_low`)        |
| `DB_WALLET_PEM_BASE64` | Contenido de `ewallet.pem` del wallet, en base64       |
| `DB_WALLET_PASSWORD`   | Contraseña del wallet                                  |

## Estructura

```
api/index.js       Entrada de la API en Vercel
vercel.json        Configuración de Vercel
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
