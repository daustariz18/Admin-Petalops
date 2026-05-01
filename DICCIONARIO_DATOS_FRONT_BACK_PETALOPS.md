# Diccionario de Datos Frontend <-> Backend (Petalops)

## 1) Autenticación

### Endpoint
`POST /auth/login`

### Request (obligatorio)
```json
{
  "email": "admin@flora.com",
  "password": "Junior2018*:2",
  "slug": "flora"
}
```

### Response 200
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer"
}
```

### Errores comunes
- `401 Empresa no encontrada` -> `slug` incorrecto
- `401 Credenciales invalidas` -> `email` o `password` incorrectos
- `422` -> falta campo (`email/password/slug`) o formato inválido

---

## 2) Crear Producto (flujo actual)

### Endpoint
`POST /admin/productos?empresa_id=3`

### Request aceptado (recomendado desde frontend)
```json
{
  "nombre": "Rosa Premium Web",
  "precio": 18900,
  "categoria": 1,
  "descripcion": "opcional"
}
```

### Alias aceptados por backend
- Nombre: `nombre` | `name` | `nombre_producto`
- Precio: `precio` | `price`
- Categoría: `categoria` | `category_id` | `categoryId` | `categoria_id` | `categoriaId`
- Descripción: `descripcion` | `description`

### Response 200
```json
{
  "id": 113,
  "productoID": 113,
  "productId": 113,
  "uploadUrl": null,
  "s3Key": null
}
```

### Regla frontend recomendada para ID
```ts
const id = resp.id ?? resp.productoID ?? resp.productId;
```

---

## 3) Tablas Reales BD

### `petalops.producto`
- `id_producto`
- `empresa_id`
- `categoria_id`
- `codigo_producto`
- `nombre_producto`
- `descripcion`
- `porcentaje_iva`
- `iva_incluido`
- `tiempo_base_min`
- `nivel_complejidad`
- `activo`
- `created_at`
- `updated_at`

### `petalops.producto_sucursal`
- `id_producto_sucursal`
- `producto_id`
- `sucursal_id`
- `precio`
- `activo`
- `es_destacado`
- `orden_catalogo`
- `imagen_url`
- `imagen_s3_key`
- `created_at`
- `updated_at`

---

## 4) Mapeo recomendado (Frontend legado -> Backend actual)

### Envío a backend
```ts
const payload = {
  nombre: form.nombre ?? form.name ?? form.nombre_producto,
  precio: Number(form.precio ?? form.price),
  categoria: Number(form.categoria ?? form.category_id ?? form.categoria_id),
  descripcion: form.descripcion ?? form.description ?? null,
};
```

### Lectura de respuesta
```ts
const productoID = resp.id ?? resp.productoID ?? resp.productId;
```

---

## 5) Validaciones mínimas en frontend

- `nombre` no vacío
- `precio > 0`
- `categoria` numérica
- URL API correcta: `http://localhost:8000` (no `5500`)

---

## 6) Nota de compatibilidad

El backend actualmente inserta en ambas tablas:
- `producto`
- `producto_sucursal`

Con una sola llamada a `/admin/productos`.