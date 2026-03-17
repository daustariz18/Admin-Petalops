# Admin PetalOps

Frontend administrativo para PetalOps, construido con React + Vite + TypeScript.

## Descripcion

Esta aplicacion cubre dos flujos principales:

1. Login por tenant contra la API.
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

1. Usuario inicia sesion en /auth/login.
2. Se guarda el token y se decodifica para obtener tenantSlug y empresaID.
3. Usuario completa formulario de nuevo producto.
4. Frontend crea producto en API (header X-Empresa-Id).
5. API responde con productoID + uploadUrl + s3Key.
6. Frontend sube archivo directo a S3 con PUT usando signed URL.
7. Frontend confirma imagen en API para asociarla al producto.

## Endpoints esperados por el frontend

Autenticacion:

- POST /auth/login

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
- Al loguear, se navega a /{tenantSlug}/dashboard.

## Archivos de apoyo de datos

Este repositorio tambien incluye artefactos de analisis y documentacion:

- DATA_MODEL_SUMMARY.md
- diccionario-datos-postgresql.csv
- diccionario-datos-postgresql.limpio.csv
- schema-diccionario-limpio.sql
- MANUAL_USUARIO_CLIENTE.html

## Estado

Proyecto listo para integrarse con backend real o ejecutarse en modo mock para validaciones de UI y flujo end-to-end.
