// ── Request types ────────────────────────────────────────────────────────────

export interface CreateProductRequest {
  nombre: string
  precio: number
  categoriaID: number
  mimeType: string
  descripcion?: string
}

export interface ConfirmProductImageRequest {
  s3Key: string
}

// ── Response types ────────────────────────────────────────────────────────────

/** Respuesta de POST /admin/productos */
export interface CreateProductResponse {
  productoID: number
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
  productoID: number
  imagenUrl: string
  imagenS3Key: string
}
