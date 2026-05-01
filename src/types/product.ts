// ── Request types ────────────────────────────────────────────────────────────

export interface CreateProductRequest {
  name: string
  price: number
  category_id: number
  description?: string
}

export interface ConfirmProductImageRequest {
  s3Key: string
}

// ── Response types ────────────────────────────────────────────────────────────

/** Respuesta de POST /admin/productos */
export interface CreateProductResponse {
  id: number
  codigo_producto: string
  uploadUrl: string
  s3Key: string
  expiresIn: number
}

/** Respuesta de POST /admin/productos/{productoID}/imagen */
export interface ConfirmProductImageResponse {
  productoID: number
  imagenS3Key: string
  imagenUrl: string
}

// ── UI / hook types ───────────────────────────────────────────────────────────

/** Pasos del flujo de creación con imagen. */
export type CreateProductStep =
  | 'idle'
  | 'creating'
  | 'uploading'
  | 'confirming'
  | 'success'
  | 'error'

/** Resultado final expuesto al componente tras un flujo exitoso. */
export interface CreateProductResult {
  id: number
  codigo_producto: string
  imagenUrl: string
  imagenS3Key: string
}
