import { useEffect, useMemo, useRef, useState } from 'react'
import { useBarrios } from '../hooks/useBarrios'
import type { Barrio } from '../services/barrioService'
import { listSucursales, type Sucursal } from '../services/sucursalService'
import './BarriosPage.css'

type ToastType = 'success' | 'error' | 'info'

type ToastState = {
  message: string
  type: ToastType
} | null

type ViewMode = 'compact' | 'table'
type SortBy = 'nombre' | 'costo' | 'estado' | 'recientes'
type DrawerMode = 'create' | 'edit'

type BarrioFormState = {
  nombre_barrio: string
  sucursal_id: string
  zona_id: string
  costo_domicilio: string
  activo: boolean
}

type BarriosPageProps = {
  empresaID: string
  tiendaNombre?: string
  storeLogoUrl?: string
  onLogout: () => void
  onNavigateToProductos: () => void
}

function formatCop(value: number): string {
  return `$ ${value.toLocaleString('es-CO')}`
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin actualizar'
  return value.replace('T', ' ').slice(0, 19)
}

function FlowerIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <g fill="#D4477A">
        <ellipse cx="24" cy="10" rx="4.4" ry="7" />
        <ellipse cx="24" cy="38" rx="4.4" ry="7" />
        <ellipse cx="10" cy="24" rx="7" ry="4.4" />
        <ellipse cx="38" cy="24" rx="7" ry="4.4" />
        <ellipse cx="14.2" cy="14.2" rx="4.2" ry="6.5" transform="rotate(-45 14.2 14.2)" />
        <ellipse cx="33.8" cy="33.8" rx="4.2" ry="6.5" transform="rotate(-45 33.8 33.8)" />
        <ellipse cx="33.8" cy="14.2" rx="4.2" ry="6.5" transform="rotate(45 33.8 14.2)" />
        <ellipse cx="14.2" cy="33.8" rx="4.2" ry="6.5" transform="rotate(45 14.2 33.8)" />
      </g>
      <circle cx="24" cy="24" r="4.8" fill="#F7A7C3" />
    </svg>
  )
}

function getStoreInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'P'
}

function StoreFallback({ name, className = '' }: { name: string; className?: string }) {
  return (
    <div className={`bp-store-fallback ${className}`.trim()}>
      <span className="bp-store-fallback__initial">{getStoreInitial(name)}</span>
      <div className="bp-store-fallback__copy">
        <strong>{name}</strong>
        <span>Marca activa</span>
      </div>
    </div>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="bp-icon">
      <path
        d="M12 21s5-4.8 5-10a5 5 0 10-10 0c0 5.2 5 10 5 10zm0-13a3 3 0 110 6 3 3 0 010-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function BarriosPage({
  empresaID,
  tiendaNombre = 'Flora',
  storeLogoUrl,
  onLogout,
  onNavigateToProductos,
}: BarriosPageProps) {
  const {
    barrios,
    barriosLoading,
    barriosError,
    savingBarrio,
    deletingBarrio,
    createBarrio,
    updateBarrio,
    toggleBarrioStatus,
    deleteBarrio,
    reloadBarrios,
  } = useBarrios()

  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [sucursalFilter, setSucursalFilter] = useState('todas')
  const [zonaFilter, setZonaFilter] = useState('todas')
  const [viewMode, setViewMode] = useState<ViewMode>('compact')
  const [sortBy, setSortBy] = useState<SortBy>('nombre')
  const [toast, setToast] = useState<ToastState>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [editingBarrio, setEditingBarrio] = useState<Barrio | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Barrio | null>(null)
  const [formError, setFormError] = useState('')
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalesLoading, setSucursalesLoading] = useState(false)
  const [sucursalesError, setSucursalesError] = useState('')
  const [form, setForm] = useState<BarrioFormState>({
    nombre_barrio: '',
    sucursal_id: '',
    zona_id: '',
    costo_domicilio: '',
    activo: true,
  })
  const [logoIndex, setLogoIndex] = useState(0)
  const menuAnchorRef = useRef<HTMLDivElement | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const logoCandidates = useMemo(() => [storeLogoUrl?.trim() || ''].filter(Boolean), [storeLogoUrl])
  const defaultSucursalId = sucursales.length === 1 ? String(sucursales[0].id_sucursal) : ''

  useEffect(() => {
    void reloadBarrios()
  }, [reloadBarrios])

  useEffect(() => {
    let cancelled = false

    async function loadSucursales() {
      setSucursalesLoading(true)
      setSucursalesError('')

      try {
        const items = await listSucursales()
        if (cancelled) return
        setSucursales(items)
        if (items.length === 0) {
          setSucursalesError('No hay sucursales registradas para esta tienda.')
        }
      } catch (error) {
        if (cancelled) return
        setSucursales([])
        setSucursalesError(error instanceof Error ? error.message : 'No se pudieron cargar las sucursales.')
      } finally {
        if (!cancelled) {
          setSucursalesLoading(false)
        }
      }
    }

    void loadSucursales()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!defaultSucursalId) return
    setForm((current) => (current.sucursal_id ? current : { ...current, sucursal_id: defaultSucursalId }))
  }, [defaultSucursalId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    setLogoIndex(0)
  }, [logoCandidates])

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  const openCreateModal = () => {
    setEditingBarrio(null)
    setDrawerMode('create')
    setForm({
      nombre_barrio: '',
      sucursal_id: defaultSucursalId,
      zona_id: '',
      costo_domicilio: '',
      activo: true,
    })
    setFormError('')
    setDrawerOpen(true)
  }

  const openEditModal = (barrio: Barrio) => {
    setEditingBarrio(barrio)
    setDrawerMode('edit')
    setForm({
      nombre_barrio: barrio.nombre_barrio,
      sucursal_id: String(barrio.sucursal_id),
      zona_id: barrio.zona_id === null ? '' : String(barrio.zona_id),
      costo_domicilio: String(barrio.costo_domicilio),
      activo: barrio.activo === 1,
    })
    setFormError('')
    setDrawerOpen(true)
    setOpenMenuId(null)
  }

  const closeForm = () => {
    if (savingBarrio) return
    setDrawerOpen(false)
    setEditingBarrio(null)
    setFormError('')
    setOpenMenuId(null)
  }

  useEffect(() => {
    if (openMenuId === null) return

    const onOutside = (event: MouseEvent) => {
      if (!menuAnchorRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    window.addEventListener('mousedown', onOutside)
    return () => window.removeEventListener('mousedown', onOutside)
  }, [openMenuId])

  const filteredBarrios = useMemo(() => {
    const term = search.trim().toLowerCase()

    return barrios.filter((barrio) => {
      const matchesSearch = term
        ? `${barrio.nombre_barrio} ${barrio.sucursal_id} ${barrio.zona_id ?? ''}`.toLowerCase().includes(term)
        : true
      const matchesEstado =
        estadoFilter === 'todos'
          ? true
          : estadoFilter === 'activo'
            ? barrio.activo === 1
            : barrio.activo === 0
      const matchesSucursal = sucursalFilter === 'todas' ? true : String(barrio.sucursal_id) === sucursalFilter
      const matchesZona =
        zonaFilter === 'todas'
          ? true
          : zonaFilter === 'sin-zona'
            ? barrio.zona_id === null
            : String(barrio.zona_id ?? '') === zonaFilter

      return matchesSearch && matchesEstado && matchesSucursal && matchesZona
    })
  }, [barrios, search, estadoFilter, sucursalFilter, zonaFilter])

  const sortedBarrios = useMemo(() => {
    const copy = [...filteredBarrios]
    return copy.sort((a, b) => {
      if (sortBy === 'nombre') return a.nombre_barrio.localeCompare(b.nombre_barrio, 'es')
      if (sortBy === 'costo') return b.costo_domicilio - a.costo_domicilio
      if (sortBy === 'estado') return b.activo - a.activo
      return new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
    })
  }, [filteredBarrios, sortBy])

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (estadoFilter !== 'todos') chips.push({ key: 'estado', label: estadoFilter === 'activo' ? 'Disponibles' : 'Ocultos' })
    if (sucursalFilter !== 'todas') chips.push({ key: 'sucursal', label: `Sucursal ${sucursalFilter}` })
    if (zonaFilter !== 'todas') chips.push({ key: 'zona', label: zonaFilter === 'sin-zona' ? 'Sin zona' : `Zona ${zonaFilter}` })
    if (search.trim()) chips.push({ key: 'search', label: `“${search.trim()}”` })
    return chips
  }, [estadoFilter, sucursalFilter, zonaFilter, search])

  const stats = useMemo(() => {
    const total = barrios.length
    const activos = barrios.filter((barrio) => barrio.activo === 1).length
    const sinZona = barrios.filter((barrio) => barrio.zona_id === null).length
    const costoPromedio =
      total === 0 ? 0 : Math.round(barrios.reduce((acc, barrio) => acc + barrio.costo_domicilio, 0) / total)

    return { total, activos, sinZona, costoPromedio }
  }, [barrios])

  const uniqueSucursales = useMemo(
    () => {
      const fromSucursales = sucursales.map((sucursal) => sucursal.id_sucursal)
      const fromBarrios = barrios.map((barrio) => barrio.sucursal_id)
      return Array.from(new Set([...fromSucursales, ...fromBarrios])).sort((a, b) => a - b)
    },
    [barrios, sucursales],
  )

  const sucursalNameById = useMemo(() => {
    return new Map(sucursales.map((sucursal) => [sucursal.id_sucursal, sucursal.nombre]))
  }, [sucursales])

  const selectedSucursalIsAvailable = useMemo(() => {
    if (!form.sucursal_id) return true
    return sucursales.some((sucursal) => String(sucursal.id_sucursal) === form.sucursal_id)
  }, [form.sucursal_id, sucursales])

  const zoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          barrios
            .map((barrio) => barrio.zona_id)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
        ),
      ).sort((a, b) => a - b),
    [barrios],
  )

  const saveBarrio = async () => {
    const nombre = form.nombre_barrio.trim()
    const sucursal = Number(form.sucursal_id)
    const costo = Number(form.costo_domicilio)
    const zona = form.zona_id.trim() === '' ? null : Number(form.zona_id)

    if (!nombre) {
      setFormError('El nombre del barrio es obligatorio.')
      return
    }

    if (!Number.isFinite(sucursal) || sucursal <= 0) {
      setFormError('La sucursal es obligatoria.')
      return
    }

    if (!sucursales.some((item) => item.id_sucursal === sucursal)) {
      setFormError('Selecciona una sucursal valida.')
      return
    }

    if (!Number.isFinite(costo) || costo < 0) {
      setFormError('Ingresa un costo de domicilio valido.')
      return
    }

    if (zona !== null && (!Number.isFinite(zona) || zona <= 0)) {
      setFormError('La zona debe ser numerica o quedar vacia.')
      return
    }

    const duplicated = barrios.some((barrio) => {
      if (editingBarrio && barrio.id_barrio === editingBarrio.id_barrio) return false
      return barrio.sucursal_id === sucursal && barrio.nombre_barrio.trim().toLowerCase() === nombre.toLowerCase()
    })

    if (duplicated) {
      setFormError('Ya existe un barrio con ese nombre en la misma sucursal.')
      return
    }

    setFormError('')

    try {
      if (editingBarrio) {
        await updateBarrio(editingBarrio.id_barrio, {
          sucursal_id: sucursal,
          nombre_barrio: nombre,
          costo_domicilio: costo,
          zona_id: zona,
          activo: form.activo,
        })
        showToast('Barrio actualizado con exito.', 'success')
      } else {
        await createBarrio({
          sucursal_id: sucursal,
          nombre_barrio: nombre,
          costo_domicilio: costo,
          zona_id: zona,
          activo: form.activo,
        })
        showToast('Barrio creado con exito.', 'success')
      }

      setDrawerOpen(false)
      setEditingBarrio(null)
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'No se pudo guardar el barrio.'
      setFormError(message)
      showToast(message, 'error')
    }
  }

  const handleToggleStatus = async (barrio: Barrio) => {
    try {
      await toggleBarrioStatus(barrio.id_barrio, barrio.activo === 0)
      showToast(`Barrio marcado como ${barrio.activo === 1 ? 'inactivo' : 'activo'}.`, 'info')
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'No se pudo actualizar el estado.'
      showToast(message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteBarrio(deleteTarget.id_barrio)
      showToast('Barrio eliminado correctamente.', 'info')
      setDeleteTarget(null)
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'No se pudo eliminar el barrio.'
      showToast(message, 'error')
    }
  }

  const emptyStateTitle =
    barrios.length === 0 ? 'No hay barrios aun' : 'No encontramos barrios con esos filtros'

  const clearFilters = () => {
    setSearch('')
    setEstadoFilter('todos')
    setSucursalFilter('todas')
    setZonaFilter('todas')
    setSortBy('nombre')
  }

  const toggleMenu = (id: number) => {
    setOpenMenuId((current) => (current === id ? null : id))
  }

  return (
    <main className="bp-page" aria-label="Gestion de barrios Petalops">
      <section className="bp-container">
        <header className="bp-header">
          <div className="bp-brand-row">
            <div className="bp-brand-left">
              {logoCandidates[logoIndex] ? (
                <>
                  <img
                    src={logoCandidates[logoIndex]}
                    alt={`Logo ${tiendaNombre}`}
                    className="bp-store-logo"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    decoding="async"
                    onError={() => setLogoIndex((current) => Math.min(current + 1, logoCandidates.length))}
                  />
                  <span className="bp-store-name">{tiendaNombre}</span>
                </>
              ) : (
                <StoreFallback name={tiendaNombre} />
              )}
            </div>

            <div className="bp-header-actions">
              <button type="button" className="bp-btn bp-btn--ghost" onClick={onNavigateToProductos}>
                Productos
              </button>
              <button type="button" className="bp-btn bp-btn--primary" onClick={openCreateModal}>
                + Nuevo barrio
              </button>
              <button type="button" className="bp-btn bp-btn--ghost" onClick={onLogout}>
                Salir
              </button>
            </div>
          </div>

          <div className="bp-title-row">
            <div>
              <p className="bp-eyebrow">Operacion</p>
              <h1>Barrios</h1>
              <p>
                {filteredBarrios.length} barrios visibles · {stats.activos} disponibles · {stats.sinZona} sin zona
              </p>
            </div>
            <div className="bp-title-chip">
              <PinIcon />
              <div>
                <strong>Todo listo</strong>
                <span>Administracion simple y directa</span>
              </div>
            </div>
          </div>
        </header>

        <section className="bp-hero">
          <div className="bp-hero__copy">
            <p className="bp-hero__eyebrow">Domicilios</p>
            <h2>Administra barrios con rapidez y sin perder contexto.</h2>
            <p>Crea, ajusta costos y cambia el estado de cada barrio desde una vista limpia y pensada para trabajo diario.</p>
          </div>
          <div className="bp-hero__meta">
            <div>
              <strong>{empresaID}</strong>
              <span>empresa</span>
            </div>
            <div>
              <strong>{stats.total}</strong>
              <span>barrios</span>
            </div>
            <div>
              <strong>{formatCop(stats.costoPromedio)}</strong>
              <span>costo promedio</span>
            </div>
          </div>
        </section>

        <section className="bp-stats-grid" aria-label="Resumen de barrios">
          <article className="bp-stat-card">
            <p>Total barrios</p>
            <strong>{stats.total}</strong>
          </article>

          <article className="bp-stat-card">
            <p>Activos</p>
            <strong className="is-success">{stats.activos}</strong>
          </article>

          <article className="bp-stat-card">
            <p>Sin zona</p>
            <strong className="is-muted">{stats.sinZona}</strong>
          </article>

          <article className="bp-stat-card">
            <p>Costo promedio</p>
            <strong>{formatCop(stats.costoPromedio)}</strong>
          </article>
        </section>

        <section className="bp-toolbar" aria-label="Controles de barrios">
          <div className="bp-toolbar__top">
            <label className="bp-input-wrap bp-input-wrap--search">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="bp-search-icon">
                <path
                  d="M11 4a7 7 0 015.4 11.5L20 19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <input
                type="search"
                placeholder="Buscar barrio, sucursal o zona"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="bp-toolbar__actions">
              <button
                type="button"
                className={`bp-segment ${viewMode === 'compact' ? 'is-active' : ''}`}
                onClick={() => setViewMode('compact')}
              >
                Compacta
              </button>
              <button
                type="button"
                className={`bp-segment ${viewMode === 'table' ? 'is-active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                Tabla
              </button>
              <button type="button" className="bp-btn bp-btn--primary" onClick={openCreateModal}>
                + Agregar barrio
              </button>
            </div>
          </div>

          <div className="bp-toolbar__filters">
            <label className="bp-input-wrap">
              <select value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value as typeof estadoFilter)}>
                <option value="todos">Estado</option>
                <option value="activo">Disponibles</option>
                <option value="inactivo">Ocultos</option>
              </select>
            </label>

            <label className="bp-input-wrap">
              <select value={sucursalFilter} onChange={(event) => setSucursalFilter(event.target.value)}>
                <option value="todas">Sucursal</option>
                {uniqueSucursales.map((sucursal) => (
                  <option key={sucursal} value={String(sucursal)}>
                    {sucursalNameById.get(sucursal) ?? `Sucursal ${sucursal}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="bp-input-wrap">
              <select value={zonaFilter} onChange={(event) => setZonaFilter(event.target.value)}>
                <option value="todas">Zona</option>
                <option value="sin-zona">Sin zona</option>
                {zoneOptions.map((zona) => (
                  <option key={zona} value={String(zona)}>
                    Zona {zona}
                  </option>
                ))}
              </select>
            </label>

            <label className="bp-input-wrap">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
                <option value="nombre">Ordenar: nombre</option>
                <option value="costo">Ordenar: costo</option>
                <option value="estado">Ordenar: estado</option>
                <option value="recientes">Ordenar: recientes</option>
              </select>
            </label>
          </div>

          <div className="bp-toolbar__chips">
            {activeFilters.length > 0 ? (
              <>
                {activeFilters.map((chip) => (
                  <button key={chip.key} type="button" className="bp-chip" onClick={clearFilters}>
                    {chip.label}
                  </button>
                ))}
                <button type="button" className="bp-chip bp-chip--soft" onClick={clearFilters}>
                  Limpiar
                </button>
              </>
            ) : (
              <span className="bp-toolbar__hint">Usa filtros para encontrar barrios más rápido.</span>
            )}
          </div>
        </section>

        <section className="bp-panel" aria-label="Listado de barrios">
          <label className="bp-input-wrap bp-input-wrap--search">
            <span className="bp-panel__eyebrow">Listado</span>
            <h2>Barrios registrados</h2>
          </label>
          <div className="bp-panel__header">
            <div className="bp-panel__header-copy">
              <p className="bp-panel__hint">{viewMode === 'table' ? 'Perfecta para revisar muchos barrios de un vistazo.' : 'Pensada para leer rápido y actuar en uno o dos clics.'}</p>
            </div>
            <div className="bp-panel__header-copy bp-panel__header-copy--right">
              <p className="bp-panel__hint">{sortedBarrios.length} resultados</p>
            </div>
          </div>

          {barriosLoading ? (
            <section className="bp-empty-state" aria-label="Cargando barrios">
              <FlowerIcon className="bp-empty-flower" />
              <h2>Cargando barrios...</h2>
              <p>Estamos preparando la lista para mostrarla en pantalla.</p>
            </section>
          ) : sortedBarrios.length === 0 ? (
            <section className="bp-empty-state" aria-label="Estado vacio">
              <FlowerIcon className="bp-empty-flower" />
              <h2>{emptyStateTitle}</h2>
              <p>Prueba limpiando los filtros o agrega un barrio nuevo para empezar.</p>
              <button type="button" className="bp-btn bp-btn--primary" onClick={openCreateModal}>
                Agregar barrio
              </button>
            </section>
          ) : (
            <>
              {viewMode === 'compact' ? (
                <div className="bp-compact-list">
                  {sortedBarrios.map((barrio) => (
                    <article key={barrio.id_barrio} className="bp-row">
                      <div className="bp-row__main">
                        <div className="bp-row__title-wrap">
                          <div className="bp-row__title-block">
                            <h3>{barrio.nombre_barrio}</h3>
                            <div className="bp-row__subline">
                              <span>{formatCop(barrio.costo_domicilio)}</span>
                              <span>·</span>
                              <span>{barrio.zona_id === null ? 'Sin zona' : `Zona ${barrio.zona_id}`}</span>
                              <span>·</span>
                              <span>Sucursal {barrio.sucursal_id}</span>
                            </div>
                          </div>
                          <span className={`bp-status ${barrio.activo === 1 ? 'is-active' : 'is-inactive'}`}>
                            {barrio.activo === 1 ? 'Disponible' : 'Oculto'}
                          </span>
                        </div>
                        <div className="bp-row__meta">
                          <span>ID {barrio.id_barrio}</span>
                          <span>Creado {formatDate(barrio.created_at)}</span>
                          {barrio.updated_at ? <span>Actualizado {formatDate(barrio.updated_at)}</span> : null}
                        </div>
                      </div>

                      <div className="bp-row__actions" ref={menuAnchorRef}>
                        <button type="button" className="bp-icon-btn" title="Editar barrio" onClick={() => openEditModal(barrio)} aria-label="Editar barrio">
                          ✎
                        </button>
                        <button
                          type="button"
                          className="bp-icon-btn"
                          title={barrio.activo === 1 ? 'Ocultar barrio' : 'Mostrar barrio'}
                          onClick={() => void handleToggleStatus(barrio)}
                          aria-label={barrio.activo === 1 ? 'Ocultar barrio' : 'Mostrar barrio'}
                        >
                          {barrio.activo === 1 ? '◔' : '◕'}
                        </button>
                        <div className="bp-menu-wrap">
                          <button
                            type="button"
                            className="bp-icon-btn"
                            title="Más acciones"
                            aria-label="Más acciones"
                            onClick={() => toggleMenu(barrio.id_barrio)}
                          >
                            ⋮
                          </button>
                          {openMenuId === barrio.id_barrio ? (
                            <div className="bp-menu">
                              <button type="button" onClick={() => openEditModal(barrio)}>
                                Editar
                              </button>
                              <button type="button" onClick={() => void handleToggleStatus(barrio)}>
                                {barrio.activo === 1 ? 'Ocultar' : 'Mostrar'}
                              </button>
                              <button type="button" className="is-danger" onClick={() => setDeleteTarget(barrio)}>
                                Eliminar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="bp-table-shell">
                  <table className="bp-table">
                    <thead>
                      <tr>
                        <th>Barrio</th>
                        <th>Costo</th>
                        <th>Estado</th>
                        <th>Sucursal</th>
                        <th>Zona</th>
                        <th>Actualizado</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBarrios.map((barrio) => (
                        <tr key={barrio.id_barrio}>
                          <td>
                            <div className="bp-table__primary">
                              <strong>{barrio.nombre_barrio}</strong>
                              <span>ID {barrio.id_barrio}</span>
                            </div>
                          </td>
                          <td>
                            <button type="button" className="bp-table__price" onClick={() => openEditModal(barrio)}>
                              {formatCop(barrio.costo_domicilio)}
                            </button>
                          </td>
                          <td>
                            <span className={`bp-status ${barrio.activo === 1 ? 'is-active' : 'is-inactive'}`}>
                              {barrio.activo === 1 ? 'Disponible' : 'Oculto'}
                            </span>
                          </td>
                          <td>Sucursal {barrio.sucursal_id}</td>
                          <td>{barrio.zona_id === null ? 'Sin zona' : `Zona ${barrio.zona_id}`}</td>
                          <td>{formatDate(barrio.updated_at ?? barrio.created_at)}</td>
                          <td>
                            <div className="bp-row__actions bp-row__actions--table" ref={menuAnchorRef}>
                              <button type="button" className="bp-icon-btn" title="Editar barrio" onClick={() => openEditModal(barrio)} aria-label="Editar barrio">
                                ✎
                              </button>
                              <button
                                type="button"
                                className="bp-icon-btn"
                                title={barrio.activo === 1 ? 'Ocultar barrio' : 'Mostrar barrio'}
                                onClick={() => void handleToggleStatus(barrio)}
                                aria-label={barrio.activo === 1 ? 'Ocultar barrio' : 'Mostrar barrio'}
                              >
                                {barrio.activo === 1 ? '◔' : '◕'}
                              </button>
                              <button type="button" className="bp-icon-btn" title="Eliminar barrio" onClick={() => setDeleteTarget(barrio)} aria-label="Eliminar barrio">
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {barriosError ? <p className="bp-panel__error">{barriosError}</p> : null}
        </section>
      </section>

      {drawerOpen ? (
        <div className="bp-drawer-scrim" role="presentation" onClick={closeForm}>
          <aside
            className="bp-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawerMode === 'edit' ? 'Editar barrio' : 'Agregar barrio'}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bp-modal__header">
              <p className="bp-modal__eyebrow">Barrio</p>
              <h3>{drawerMode === 'edit' ? 'Cambiar barrio' : 'Agregar barrio'}</h3>
              <p>Completa los datos del barrio para que aparezca en la lista de tu tienda.</p>
            </header>

            <label className="bp-form-field">
              <span>Nombre del barrio</span>
              <input
                type="text"
                value={form.nombre_barrio}
                onChange={(event) => setForm((current) => ({ ...current, nombre_barrio: event.target.value }))}
                placeholder="Ej: Centro"
                disabled={savingBarrio}
              />
            </label>

            <label className="bp-form-field">
              <span>Sucursal</span>
              <select
                value={form.sucursal_id}
                onChange={(event) => setForm((current) => ({ ...current, sucursal_id: event.target.value }))}
                disabled={savingBarrio || sucursalesLoading || sucursales.length === 0}
              >
                <option value="">{sucursalesLoading ? 'Cargando sucursales...' : 'Selecciona una sucursal'}</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={String(sucursal.id_sucursal)}>
                    {sucursal.nombre}
                  </option>
                ))}
                {!selectedSucursalIsAvailable && form.sucursal_id ? (
                  <option value={form.sucursal_id}>Sucursal {form.sucursal_id}</option>
                ) : null}
              </select>
              <small>Elige una sucursal registrada para esta tienda.</small>
            </label>

            {sucursalesError ? <p className="bp-form-error">{sucursalesError}</p> : null}

            <label className="bp-form-field">
              <span>Zona</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.zona_id}
                onChange={(event) => setForm((current) => ({ ...current, zona_id: event.target.value }))}
                placeholder="Opcional"
                disabled={savingBarrio}
              />
              <small>Déjala vacía si no aplica.</small>
            </label>

            <label className="bp-form-field">
              <span>Costo domicilio</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costo_domicilio}
                onChange={(event) => setForm((current) => ({ ...current, costo_domicilio: event.target.value }))}
                placeholder="Ej. 3500.50"
                disabled={savingBarrio}
              />
            </label>

            <label className="bp-switch-row">
              <div>
                <strong>Disponible para pedidos</strong>
                <span>Actívalo si el barrio debe aparecer al tomar pedidos.</span>
              </div>
              <button
                type="button"
                className={`bp-switch ${form.activo ? 'is-on' : 'is-off'}`}
                aria-pressed={form.activo}
                onClick={() => setForm((current) => ({ ...current, activo: !current.activo }))}
                disabled={savingBarrio}
              >
                <span className="bp-switch__thumb" />
              </button>
            </label>

            {formError ? <p className="bp-form-error">{formError}</p> : null}

            <div className="bp-modal__actions">
              <button type="button" className="bp-btn bp-btn--ghost" onClick={closeForm} disabled={savingBarrio}>
                Cancelar
              </button>
              <button type="button" className="bp-btn bp-btn--primary" onClick={() => void saveBarrio()} disabled={savingBarrio}>
                {savingBarrio ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="bp-modal" role="dialog" aria-modal="true" aria-label="Confirmar eliminacion">
          <div className="bp-modal__overlay" onClick={() => setDeleteTarget(null)} />
          <div className="bp-modal__confirm">
            <PinIcon />
            <h3>Eliminar barrio?</h3>
            <p>Esta acción quitará el barrio de la lista.</p>
            <div className="bp-modal__actions">
              <button type="button" className="bp-btn bp-btn--ghost" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="bp-btn bp-btn--danger" onClick={() => void handleDelete()} disabled={deletingBarrio}>
                {deletingBarrio ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`bp-toast bp-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </main>
  )
}

