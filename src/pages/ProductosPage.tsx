import { useEffect, useMemo, useRef, useState } from 'react'
import { ProductForm } from '../features/products/ProductForm'
import { useProducts, type ProductItem } from '../features/products/useProducts'
import { useCategorias } from '../hooks/useCategorias'
import './ProductosPage.css'

type FiltroEstado = 'todos' | 'activo' | 'inactivo'
type FiltroPrecio = 'todos' | 'lt200' | '200to400' | 'gt400'
type ToastType = 'success' | 'error' | 'info'

type ToastState = {
  message: string
  type: ToastType
} | null

type ProductosPageProps = {
  empresaID: string
  tiendaNombre?: string
  storeLogoUrl?: string
  onLogout: () => void
}

function formatCop(value: number): string {
  return `$ ${value.toLocaleString('es-CO')}`
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-icon">
      <path
        d="M4 7h16m-10 0V5.7a1.7 1.7 0 011.7-1.7h.6A1.7 1.7 0 0114 5.7V7m-6 0l.6 11a2 2 0 002 1.9h2.8a2 2 0 002-1.9L16 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-warning-icon">
      <path
        d="M12 3l9.5 16.5A1.2 1.2 0 0120.5 21h-17a1.2 1.2 0 01-1-1.8L12 3zm0 6v5m0 3h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ProductosPage({
  empresaID,
  tiendaNombre = 'Flora',
  storeLogoUrl,
  onLogout,
}: ProductosPageProps) {
  const { products, isLoading, createProduct, updateProduct, toggleProductStatus, removeProduct } = useProducts(empresaID)
  const { categorias } = useCategorias(empresaID)

  const [currentView, setCurrentView] = useState<'list' | 'new'>('list')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroPrecio, setFiltroPrecio] = useState<FiltroPrecio>('todos')
  const [modalEliminar, setModalEliminar] = useState<ProductItem | null>(null)
  const [modalEditar, setModalEditar] = useState<ProductItem | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const logoCandidates = useMemo(() => {
    const slug = tiendaNombre.trim().toLowerCase()
    const titleSlug = tiendaNombre.trim()
    const base = `https://ddy2osi8uorg4.cloudfront.net/tenants/${encodeURIComponent(slug)}/logos`

    const candidates = [
      storeLogoUrl || '',
      `${base}/${encodeURIComponent(titleSlug)}+Logo.png`,
      `${base}/${encodeURIComponent(slug)}+Logo.png`,
      `${base}/Logo.png`,
      `${base}/logo.png`,
      'https://ddy2osi8uorg4.cloudfront.net/tenants/petalops/logos/PetalOps+Logo.png',
    ].filter(Boolean)

    return Array.from(new Set(candidates))
  }, [storeLogoUrl, tiendaNombre])

  const [logoIndex, setLogoIndex] = useState(0)
  const avatarMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!avatarOpen) return

    const onOutside = (event: MouseEvent) => {
      if (!avatarMenuRef.current?.contains(event.target as Node)) {
        setAvatarOpen(false)
      }
    }

    window.addEventListener('mousedown', onOutside)
    return () => window.removeEventListener('mousedown', onOutside)
  }, [avatarOpen])

  useEffect(() => {
    setLogoIndex(0)
  }, [logoCandidates])

  const getCategoriaLabel = (producto: ProductItem): string => {
    const rawName = producto.categoria?.trim()

    if (rawName && !/^\d+$/.test(rawName)) {
      return rawName
    }

    const categoriaId =
      (typeof producto.categoriaID === 'number' ? producto.categoriaID : undefined) ??
      (rawName && /^\d+$/.test(rawName) ? Number(rawName) : undefined)

    if (typeof categoriaId === 'number' && Number.isFinite(categoriaId)) {
      const match = categorias.find((categoria) => categoria.idCategoria === categoriaId)
      if (match?.nombre) return match.nombre
    }

    return 'Sin categoria'
  }

  const categoriasFiltrables = useMemo(() => {
    const unique = Array.from(new Set(products.map((producto) => getCategoriaLabel(producto))))
    return unique.sort((a, b) => a.localeCompare(b, 'es'))
  }, [products, categorias])

  const productosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()

    return products.filter((producto) => {
      const byBusqueda = term ? producto.nombre.toLowerCase().includes(term) : true

      const byEstado =
        filtroEstado === 'todos'
          ? true
          : filtroEstado === 'activo'
            ? producto.estado === 'activo'
            : producto.estado === 'inactivo'

      const categoriaProducto = getCategoriaLabel(producto)
      const byCategoria = filtroCategoria === 'todas' ? true : categoriaProducto === filtroCategoria

      const byPrecio =
        filtroPrecio === 'todos'
          ? true
          : filtroPrecio === 'lt200'
            ? producto.precio < 200000
            : filtroPrecio === '200to400'
              ? producto.precio >= 200000 && producto.precio <= 400000
              : producto.precio > 400000

      return byBusqueda && byEstado && byCategoria && byPrecio
    })
  }, [products, busqueda, filtroEstado, filtroCategoria, filtroPrecio, categorias])

  const stats = useMemo(() => {
    const total = products.length
    const activos = products.filter((p) => p.estado === 'activo').length
    const inactivos = total - activos

    const masCaro = products.reduce<ProductItem | null>((acc, curr) => {
      if (!acc || curr.precio > acc.precio) return curr
      return acc
    }, null)

    return { total, activos, inactivos, masCaro }
  }, [products])

  const confirmarEliminar = () => {
    if (!modalEliminar) return
    removeProduct(modalEliminar.id)
    setModalEliminar(null)
    showToast('Producto eliminado correctamente.', 'info')
  }

  const openEditarModal = (producto: ProductItem) => {
    setModalEditar(producto)
    setEditNombre(producto.nombre)
    setEditPrecio(String(producto.precio))
    const currentCategoriaId =
      (typeof producto.categoriaID === 'number' ? producto.categoriaID : undefined) ??
      (producto.categoria && /^\d+$/.test(producto.categoria) ? Number(producto.categoria) : undefined)
    setEditCategoriaId(currentCategoriaId && Number.isFinite(currentCategoriaId) ? String(currentCategoriaId) : '')
    setEditError('')
    setIsSavingEdit(false)
  }

  const closeEditarModal = () => {
    if (isSavingEdit) return
    setModalEditar(null)
    setEditError('')
  }

  const guardarEdicion = async () => {
    if (!modalEditar) return

    const nombre = editNombre.trim()
    const precio = Number(editPrecio)
    const categoriaId = Number(editCategoriaId)

    if (!nombre) {
      setEditError('El nombre es obligatorio.')
      return
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      setEditError('Ingresa un precio valido.')
      return
    }

    if (!Number.isFinite(categoriaId) || categoriaId <= 0) {
      setEditError('Selecciona una categoria.')
      return
    }

    const categoriaSeleccionada = categorias.find((categoria) => categoria.idCategoria === categoriaId)

    setIsSavingEdit(true)
    setEditError('')

    const ok = await updateProduct(modalEditar.id, {
      nombre,
      precio,
      categoriaID: categoriaId,
      categoria: categoriaSeleccionada?.nombre ?? modalEditar.categoria,
    })

    setIsSavingEdit(false)

    if (!ok) {
      setEditError('No se pudo actualizar el producto. Intenta de nuevo.')
      showToast('No pudimos guardar los cambios.', 'error')
      return
    }

    setModalEditar(null)
    showToast('Producto actualizado con exito.', 'success')
  }

  const handleToggleStatus = async (producto: ProductItem) => {
    const ok = await toggleProductStatus(producto.id)
    if (!ok) {
      showToast('No se pudo actualizar el estado.', 'error')
      return
    }
    const next = producto.estado === 'activo' ? 'inactivo' : 'activo'
    showToast(`Producto marcado como ${next}.`, 'success')
  }

  const emptyStateTitle = products.length === 0 ? 'No hay productos aun' : 'Sin resultados para tu busqueda'
  const emptyStateCta = products.length === 0 ? '+ Agregar tu primer producto' : 'Limpiar filtros'

  if (currentView === 'new') {
    return (
      <main className="pp-page" aria-label="Gestion de productos Petalops">
        <section className="pp-container">
          <ProductForm
            empresaID={empresaID}
            onBack={() => setCurrentView('list')}
            onCreatedMany={(createdProducts) => {
              createdProducts.forEach((product) => createProduct(product))
              setCurrentView('list')
              showToast('Productos creados correctamente.', 'success')
            }}
          />
        </section>

        {toast ? (
          <div className={`pp-toast pp-toast--${toast.type}`} role="status" aria-live="polite">
            {toast.message}
          </div>
        ) : null}
      </main>
    )
  }

  return (
    <main className="pp-page" aria-label="Gestion de productos Petalops">
      <section className="pp-container">
        <header className="pp-header">
          <div className="pp-brand-row">
            <div className="pp-brand-left">
              {logoCandidates[logoIndex] ? (
                <img
                  src={logoCandidates[logoIndex]}
                  alt={`Logo ${tiendaNombre}`}
                  className="pp-store-logo"
                  onError={() => {
                    setLogoIndex((current) => {
                      const next = current + 1
                      if (next < logoCandidates.length) return next
                      return logoCandidates.length
                    })
                  }}
                />
              ) : (
                <FlowerIcon className="pp-brand-flower" />
              )}
              <span className="pp-brand-name">Petalops</span>
              <span className="pp-dot">·</span>
              <span className="pp-store">{tiendaNombre}</span>
            </div>

            <div className="pp-avatar-menu" ref={avatarMenuRef}>
              <button
                type="button"
                className="pp-avatar"
                aria-label="Menu de usuario"
                aria-expanded={avatarOpen}
                onClick={() => setAvatarOpen((current) => !current)}
              >
                DU
              </button>

              {avatarOpen ? (
                <div className="pp-avatar-dropdown">
                  <button type="button" onClick={onLogout}>
                    Cerrar sesion
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pp-title-row">
            <div>
              <h1>Mis productos</h1>
              <p>
                {productosFiltrados.length} productos visibles · {categoriasFiltrables.length} categorias
              </p>
            </div>

            <div className="pp-title-actions">
              <button type="button" className="pp-btn pp-btn--primary" onClick={() => setCurrentView('new')}>
                + Nuevo producto
              </button>
              <button type="button" className="pp-btn pp-btn--ghost" onClick={onLogout}>
                Salir
              </button>
            </div>
          </div>
        </header>

        <section className="pp-stats-grid" aria-label="Resumen de productos">
          <article className="pp-stat-card">
            <p>Total productos</p>
            <strong>{stats.total}</strong>
          </article>

          <article className="pp-stat-card">
            <p>Activos</p>
            <strong className="is-success">{stats.activos}</strong>
          </article>

          <article className="pp-stat-card">
            <p>Inactivos</p>
            <strong className="is-muted">{stats.inactivos}</strong>
          </article>

          <article className="pp-stat-card">
            <p>Producto mas caro</p>
            <h3 title={stats.masCaro?.nombre || ''}>{stats.masCaro?.nombre || '—'}</h3>
            <span>{stats.masCaro ? formatCop(stats.masCaro.precio) : '—'}</span>
          </article>
        </section>

        <section className="pp-filters" aria-label="Filtros de productos">
          <label className="pp-input-wrap pp-input-wrap--search">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-search-icon">
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
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
          </label>

          <label className="pp-input-wrap">
            <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value as FiltroEstado)}>
              <option value="todos">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>

          <label className="pp-input-wrap">
            <select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
              <option value="todas">Todas</option>
              {categoriasFiltrables.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>

          <label className="pp-input-wrap">
            <select value={filtroPrecio} onChange={(event) => setFiltroPrecio(event.target.value as FiltroPrecio)}>
              <option value="todos">Todos los precios</option>
              <option value="lt200">Menos de $200.000</option>
              <option value="200to400">$200.000 – $400.000</option>
              <option value="gt400">Mas de $400.000</option>
            </select>
          </label>
        </section>

        {isLoading ? (
          <section className="pp-products-grid" aria-label="Cargando productos">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={`skeleton-${index}`} className="pp-product-card pp-product-card--skeleton">
                <div className="pp-skeleton pp-skeleton--image" />
                <div className="pp-product-info">
                  <div className="pp-skeleton pp-skeleton--line" />
                  <div className="pp-skeleton pp-skeleton--line short" />
                </div>
              </article>
            ))}
          </section>
        ) : productosFiltrados.length === 0 ? (
          <section className="pp-empty-state" aria-label="Estado vacio">
            <FlowerIcon className="pp-empty-flower" />
            <h2>{emptyStateTitle}</h2>
            <button
              type="button"
              className="pp-btn pp-btn--primary"
              onClick={() => {
                if (products.length === 0) {
                  setCurrentView('new')
                  return
                }
                setBusqueda('')
                setFiltroEstado('todos')
                setFiltroCategoria('todas')
                setFiltroPrecio('todos')
              }}
            >
              {emptyStateCta}
            </button>
          </section>
        ) : (
          <section className="pp-products-grid" aria-label="Tarjetas de productos">
            {productosFiltrados.map((producto) => (
              <article key={producto.id} className="pp-product-card">
                <div className="pp-image-wrap">
                  {producto.image_url ? (
                    <img src={producto.image_url} alt={producto.nombre} loading="lazy" />
                  ) : (
                    <div className="pp-no-image">Sin imagen</div>
                  )}
                  <span className={`pp-status-badge ${producto.estado === 'activo' ? 'is-active' : 'is-inactive'}`}>
                    {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="pp-product-info">
                  <h3 title={producto.nombre}>{producto.nombre}</h3>
                  <p>{formatCop(producto.precio)}</p>
                  <span className="pp-category-tag">{getCategoriaLabel(producto)}</span>

                  <div className="pp-card-actions">
                    <button type="button" className="pp-btn pp-btn--outline" onClick={() => openEditarModal(producto)}>
                      Editar
                    </button>

                    <div className="pp-card-actions-right">
                      <button
                        type="button"
                        className="pp-icon-btn"
                        aria-label="Eliminar producto"
                        onClick={() => setModalEliminar(producto)}
                      >
                        <TrashIcon />
                      </button>

                      <button
                        type="button"
                        className={`pp-switch ${producto.estado === 'activo' ? 'is-on' : 'is-off'}`}
                        aria-label={producto.estado === 'activo' ? 'Desactivar producto' : 'Activar producto'}
                        onClick={() => void handleToggleStatus(producto)}
                      >
                        <span className="pp-switch-thumb" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      {modalEliminar ? (
        <div className="pp-modal" role="dialog" aria-modal="true" aria-label="Confirmar eliminacion">
          <div className="pp-modal-overlay" onClick={() => setModalEliminar(null)} />
          <div className="pp-modal-card">
            <WarningIcon />
            <h3>¿Eliminar producto?</h3>
            <p>Esta accion no se puede deshacer. El producto sera eliminado permanentemente.</p>
            <div className="pp-modal-actions">
              <button type="button" className="pp-btn pp-btn--ghost" onClick={() => setModalEliminar(null)}>
                Cancelar
              </button>
              <button type="button" className="pp-btn pp-btn--danger" onClick={confirmarEliminar}>
                Si, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalEditar ? (
        <div className="pp-modal" role="dialog" aria-modal="true" aria-label="Editar producto">
          <div className="pp-modal-overlay" onClick={closeEditarModal} />
          <div className="pp-modal-card pp-modal-card--edit">
            <h3>Editar producto</h3>
            <p>Actualiza la informacion principal del producto.</p>

            <label className="pp-form-field">
              <span>Nombre</span>
              <input
                type="text"
                value={editNombre}
                onChange={(event) => setEditNombre(event.target.value)}
                disabled={isSavingEdit}
              />
            </label>

            <label className="pp-form-field">
              <span>Precio</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={editPrecio}
                onChange={(event) => setEditPrecio(event.target.value)}
                disabled={isSavingEdit}
              />
            </label>

            <label className="pp-form-field">
              <span>Categoria</span>
              <select
                value={editCategoriaId}
                onChange={(event) => setEditCategoriaId(event.target.value)}
                disabled={isSavingEdit}
              >
                <option value="">Selecciona categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.idCategoria} value={String(categoria.idCategoria)}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            {editError ? <p className="pp-form-error">{editError}</p> : null}

            <div className="pp-modal-actions">
              <button type="button" className="pp-btn pp-btn--ghost" onClick={closeEditarModal} disabled={isSavingEdit}>
                Cancelar
              </button>
              <button
                type="button"
                className="pp-btn pp-btn--primary"
                onClick={() => void guardarEdicion()}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`pp-toast pp-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </main>
  )
}
