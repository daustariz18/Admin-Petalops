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

export function parsePrice(value: string): number {
  return Number(value.replace(/\D/g, ''))
}

export function isDraftComplete(draft: DraftProduct): boolean {
  const hasNombre = draft.nombre.trim().length > 0
  const price = parsePrice(draft.precio)
  return hasNombre && Number.isFinite(price) && price > 0
}

export function formatPrice(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function getMissingFields(draft: DraftProduct): string[] {
  const missing: string[] = []

  if (!draft.nombre.trim()) {
    missing.push('nombre')
  }

  if (!parsePrice(draft.precio)) {
    missing.push('precio')
  }

  return missing
}
