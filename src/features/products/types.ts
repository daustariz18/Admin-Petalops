export type DraftProduct = {
  id: string
  file: File
  preview: string
  fileKey: string
  nombre: string
  precio: string
  categoria: string
  descripcion: string
}

export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error'

export type DraftSaveMeta = {
  state: DraftSaveState
  message?: string
}

type CategoryLike = {
  idCategoria: number
  nombre: string
}

export type DraftValidationOptions = {
  allowZeroPrice?: boolean
}

export function parsePrice(value: string): number {
  return Number(value.replace(/\D/g, ''))
}

export function getDraftCategoryLabel(
  categoryValue: string,
  categories: CategoryLike[],
): string {
  const rawValue = categoryValue.trim()
  if (!rawValue) return ''

  const numericId = Number(rawValue)
  if (Number.isFinite(numericId) && numericId > 0) {
    const match = categories.find((category) => category.idCategoria === numericId)
    return match?.nombre.trim() ?? ''
  }

  return rawValue
}

function isAllowedPrice(price: number, options?: DraftValidationOptions): boolean {
  if (!Number.isFinite(price)) return false
  return options?.allowZeroPrice ? price >= 0 : price > 0
}

export function isDraftComplete(draft: DraftProduct, options?: DraftValidationOptions): boolean {
  const hasNombre = draft.nombre.trim().length > 0
  const price = parsePrice(draft.precio)
  return hasNombre && isAllowedPrice(price, options)
}

export function formatPrice(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function getMissingFields(draft: DraftProduct, options?: DraftValidationOptions): string[] {
  const missing: string[] = []

  if (!draft.nombre.trim()) {
    missing.push('nombre')
  }

  if (!isAllowedPrice(parsePrice(draft.precio), options)) {
    missing.push('precio')
  }

  return missing
}
