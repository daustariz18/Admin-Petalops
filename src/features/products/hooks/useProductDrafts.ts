import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DraftProduct } from '../types'

type SavedDraft = {
  nombre: string
  precio: string
  categoria: string
  descripcion: string
}

const AUTOSAVE_KEY = 'petalops.product-drafts.v1'

function readAutosave(): Record<string, SavedDraft> {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, SavedDraft>
  } catch {
    return {}
  }
}

function writeAutosave(map: Record<string, SavedDraft>): void {
  window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(map))
}

function buildFileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`
}

function inferNameFromFile(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '')
  return withoutExt.replace(/[\-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function useProductDrafts(maxItems: number) {
  const autosaveRef = useRef<Record<string, SavedDraft>>(readAutosave())
  const draftsRef = useRef<DraftProduct[]>([])
  const [drafts, setDrafts] = useState<DraftProduct[]>([])

  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => {
        URL.revokeObjectURL(draft.preview)
      })
    }
  }, [])

  useEffect(() => {
    if (drafts.length === 0) return

    const nextMap = { ...autosaveRef.current }
    drafts.forEach((draft) => {
      nextMap[draft.fileKey] = {
        nombre: draft.nombre,
        precio: draft.precio,
        categoria: draft.categoria,
        descripcion: draft.descripcion,
      }
    })

    autosaveRef.current = nextMap
    writeAutosave(nextMap)
  }, [drafts])

  const handleImageUpload = useCallback(
    (files: File[]) => {
      setDrafts((prev) => {
        const slots = Math.max(0, maxItems - prev.length)
        if (slots === 0) return prev

        const incoming = files.filter((file) => file.type.startsWith('image/')).slice(0, slots)
        if (incoming.length === 0) return prev

        const nextProducts = incoming.map((file) => {
          const fileKey = buildFileKey(file)
          const saved = autosaveRef.current[fileKey]
          const preview = URL.createObjectURL(file)

          return {
            id: `${fileKey}-${crypto.randomUUID()}`,
            file,
            preview,
            fileKey,
            nombre: saved?.nombre ?? inferNameFromFile(file.name),
            precio: saved?.precio ?? '',
            categoria: saved?.categoria ?? '',
            descripcion: saved?.descripcion ?? '',
          }
        })

        return [...prev, ...nextProducts]
      })
    },
    [maxItems],
  )

  const updateDraft = useCallback(
    (draftId: string, patch: Partial<Omit<DraftProduct, 'id' | 'file' | 'fileKey' | 'preview'>>) => {
      setDrafts((prev) =>
        prev.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)),
      )
    },
    [],
  )

  const removeDraft = useCallback((draftId: string) => {
    setDrafts((prev) => {
      const target = prev.find((draft) => draft.id === draftId)
      if (target?.preview) {
        URL.revokeObjectURL(target.preview)
      }
      return prev.filter((draft) => draft.id !== draftId)
    })
  }, [])

  const removeDrafts = useCallback((draftIds: string[]) => {
    const ids = new Set(draftIds)

    setDrafts((prev) => {
      prev.forEach((draft) => {
        if (ids.has(draft.id) && draft.preview) {
          URL.revokeObjectURL(draft.preview)
        }
      })

      return prev.filter((draft) => !ids.has(draft.id))
    })
  }, [])

  const slotsLeft = Math.max(0, maxItems - drafts.length)

  const stats = useMemo(() => {
    const total = drafts.length
    const withNombre = drafts.filter((draft) => draft.nombre.trim()).length
    const withPrecio = drafts.filter((draft) => Number(draft.precio.replace(/\D/g, '')) > 0).length

    return {
      total,
      withNombre,
      withPrecio,
      incomplete: drafts.filter(
        (draft) => !draft.nombre.trim() || Number(draft.precio.replace(/\D/g, '')) <= 0,
      ).length,
    }
  }, [drafts])

  return {
    drafts,
    slotsLeft,
    stats,
    handleImageUpload,
    updateDraft,
    removeDraft,
    removeDrafts,
  }
}
