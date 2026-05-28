import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createBarrio,
  deleteBarrio,
  listBarrios,
  type Barrio,
  type BarrioListFilters,
  type BarrioPayload,
  updateBarrio,
  updateBarrioStatus,
} from '../services/barrioService'

export type BarrioFormInput = BarrioPayload

type BarrioCacheEntry = {
  items: Barrio[]
  loadedAt: number
}

const barriosCache = new Map<string, BarrioCacheEntry>()
const CACHE_TTL_MS = 2 * 60 * 1000

function getCacheKey(): string {
  return 'barrios'
}

function getCachedBarrios(): Barrio[] | null {
  const cached = barriosCache.get(getCacheKey())
  if (!cached) return null
  if (Date.now() - cached.loadedAt > CACHE_TTL_MS) {
    barriosCache.delete(getCacheKey())
    return null
  }
  return cached.items
}

function storeCachedBarrios(items: Barrio[]): void {
  barriosCache.set(getCacheKey(), {
    items,
    loadedAt: Date.now(),
  })
}

export function useBarrios(filters?: BarrioListFilters) {
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [barriosLoading, setBarriosLoading] = useState(false)
  const [barriosError, setBarriosError] = useState('')
  const [savingBarrio, setSavingBarrio] = useState(false)
  const [deletingBarrio, setDeletingBarrio] = useState(false)

  const loadBarrios = useCallback(async () => {
    const cached = getCachedBarrios()
    if (cached) {
      setBarrios(cached)
      setBarriosError('')
      return
    }

    setBarriosLoading(true)
    setBarriosError('')

    try {
      const items = await listBarrios(filters)
      setBarrios(items)
      storeCachedBarrios(items)
      if (items.length === 0) {
        setBarriosError('No hay barrios registrados.')
      }
    } catch (error) {
      setBarrios([])
      setBarriosError(error instanceof Error ? error.message : 'No se pudieron cargar los barrios.')
    } finally {
      setBarriosLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadBarrios()
  }, [loadBarrios])

  const create = useCallback(async (payload: BarrioPayload) => {
    setSavingBarrio(true)
    try {
      const created = await createBarrio(payload)
      setBarrios((prev) => {
        const next = [created, ...prev.filter((item) => item.id_barrio !== created.id_barrio)]
        storeCachedBarrios(next)
        return next
      })
      setBarriosError('')
      return created
    } finally {
      setSavingBarrio(false)
    }
  }, [])

  const update = useCallback(async (id: number, payload: BarrioPayload) => {
    setSavingBarrio(true)
    try {
      const updated = await updateBarrio(id, payload)
      setBarrios((prev) => {
        const next = prev.map((item) => (item.id_barrio === id ? updated : item))
        storeCachedBarrios(next)
        return next
      })
      setBarriosError('')
      return updated
    } finally {
      setSavingBarrio(false)
    }
  }, [])

  const changeStatus = useCallback(async (id: number, activo: boolean) => {
    setSavingBarrio(true)
    try {
      const updated = await updateBarrioStatus(id, activo)
      setBarrios((prev) => {
        const next = prev.map((item) => (item.id_barrio === id ? updated : item))
        storeCachedBarrios(next)
        return next
      })
      setBarriosError('')
      return updated
    } finally {
      setSavingBarrio(false)
    }
  }, [])

  const remove = useCallback(async (id: number) => {
    setDeletingBarrio(true)
    try {
      await deleteBarrio(id)
      setBarrios((prev) => {
        const next = prev.filter((item) => item.id_barrio !== id)
        storeCachedBarrios(next)
        return next
      })
      setBarriosError('')
    } finally {
      setDeletingBarrio(false)
    }
  }, [])

  return useMemo(
    () => ({
      barrios,
      barriosLoading,
      barriosError,
      savingBarrio,
      deletingBarrio,
      reloadBarrios: loadBarrios,
      createBarrio: create,
      updateBarrio: update,
      toggleBarrioStatus: changeStatus,
      deleteBarrio: remove,
      setBarrios,
    }),
    [barrios, barriosLoading, barriosError, savingBarrio, deletingBarrio, loadBarrios, create, update, changeStatus, remove],
  )
}
