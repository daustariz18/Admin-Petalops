# Admin PetalOps

Frontend administrativo para PetalOps, construido con React + Vite + TypeScript.

## Descripcion

Esta aplicacion cubre dos flujos principales:

1. Login de administrador contra la API usando exclusivamente `usuario.login`.
2. Creacion de producto con carga de imagen a S3 mediante signed URL.

El frontend funciona con autenticacion JWT, obtiene empresaID desde el token y usa ese valor en headers para operaciones de productos.

## Stack

- React 18
- Vite 5
- TypeScript
- Axios

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalacion

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev -- --host
```

## Build de produccion

```bash
npm run build
```

## Preview local de build

```bash
npm run preview
```

## Variables de entorno

Crea un archivo .env con una base similar a esta:

```env
VITE_API_URL=https://tu-api.com
VITE_PRODUCTS_BASE_PATH=/admin/productos
VITE_AVAILABLE_PRODUCT_ENDPOINT=/api/productos/disponible
VITE_RESERVE_PRODUCT_ENDPOINT=/api/productos/reservar-disponible
VITE_USE_UPLOAD_MOCK=false
VITE_FALLBACK_CATEGORIAS=[]
```

Notas:

- En desarrollo, el cliente usa rutas relativas para facilitar proxy/local API.
- VITE_USE_UPLOAD_MOCK=true habilita flujo mock para pruebas sin backend/S3.

## Flujo funcional

1. Usuario inicia sesion en /auth/login con `usuario` y contrasena.
2. El backend valida ese identificador contra la columna `login` de la tabla `usuario`.
3. Se guarda el token y se decodifica para obtener tenantSlug y empresaID.
4. Usuario completa formulario de nuevo producto.
5. Frontend crea producto en API (header X-Empresa-Id).
6. API responde con productoID + uploadUrl + s3Key.
7. Frontend sube archivo directo a S3 con PUT usando signed URL.
8. Frontend confirma imagen en API para asociarla al producto.

## Endpoints esperados por el frontend

Autenticacion:

- POST /auth/login

Payload esperado:

```json
{
  "usuario": "usuario_admin",
  "password": "contrasena"
}
```

Productos e imagenes:

- POST {VITE_PRODUCTS_BASE_PATH} (ej: /admin/productos)
- POST {VITE_PRODUCTS_BASE_PATH}/{productoID}/imagen

Reserva de identificador de producto:

- POST /api/productos/reservar-disponible
- GET /api/productos/disponible?empresaID=...

Signed URL y confirmacion:

- POST /api/uploads/signed-url
- POST /api/productos/{productoID}/imagenes

## Estructura principal

```text
src/
  auth/
    AuthContext.tsx
    authStorage.ts
  components/
    LoginForm.tsx
    ProductCreateForm.tsx
    ImageUploader.tsx
  hooks/
    useAuth.ts
    useCategorias.ts
    useCreateProductWithImage.ts
  pages/
    ProductCreatePage.tsx
  services/
    apiClient.ts
    productService.ts
    uploadService.ts
  types/
    product.ts
  App.tsx
```

## Comportamiento de autenticacion

- Si la API devuelve 401, el interceptor limpia token y cierra sesion.
- El usuario se redirige a /login cuando no hay token valido.
- El login no envia slug almacenado en localStorage, email ni username; tampoco restaura acceso desde una sesion previa guardada en localStorage.
- El identificador de acceso debe ser exclusivamente `usuario.login`.
- Al loguear, se navega a /products.

## Archivos de apoyo de datos

Este repositorio tambien incluye artefactos de analisis y documentacion:

- DATA_MODEL_SUMMARY.md
- diccionario-datos-postgresql.csv
- diccionario-datos-postgresql.limpio.csv
- schema-diccionario-limpio.sql
- MANUAL_USUARIO_CLIENTE.html

## Estado

Proyecto listo para integrarse con backend real o ejecutarse en modo mock para validaciones de UI y flujo end-to-end.
