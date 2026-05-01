import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ProductForm } from '../features/products/ProductForm'
import { useProducts, type ProductItem } from '../features/products/useProducts'
import { useCategorias, type Categoria } from '../hooks/useCategorias'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import './ProductosPage.css'

type FiltroEstado = 'todos' | 'activo' | 'inactivo'
type FiltroPrecio = 'todos' | 'lt200' | '200to400' | 'gt400'
type ToastType = 'success' | 'error' | 'info'

type ToastState = {
  message: string
  type: ToastType
} | null

type ProductCategoryGroup = {
  label: string
  products: ProductItem[]
}

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

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false)
  const isBlob = src.startsWith('blob:')
  const isInvalidSrc = !src || src === 'undefined' || src === 'null'

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (isInvalidSrc || hasError) {
    return <div className="pp-no-image pp-no-image--card">Sin imagen</div>
  }

  // blob: URLs are in-memory previews and can expire after navigation/reloads.
  return (
    <img
      src={src}
      alt={alt}
      loading={isBlob ? 'eager' : 'lazy'}
      onError={() => setHasError(true)}
      className="pp-product-image"
    />
  )
}

export default function ProductosPage({
  empresaID,
  tiendaNombre = 'Flora',
  storeLogoUrl,
  onLogout,
}: ProductosPageProps) {
  const {
    products,
    isLoading,
    reloadProducts,
    updateProduct,
    toggleProductStatus,
    removeProduct,
    replaceProductImage,
  } = useProducts(empresaID)
  const {
    categorias,
    categoriasLoading,
    categoriasError,
    createCategoria,
    creatingCategoria,
    updateCategoria,
    updatingCategoria,
  } = useCategorias(empresaID)

  const [currentView, setCurrentView] = useState<'list' | 'new'>('list')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroPrecio, setFiltroPrecio] = useState<FiltroPrecio>('todos')
  const [modalEliminar, setModalEliminar] = useState<ProductItem | null>(null)
  const [modalEditar, setModalEditar] = useState<ProductItem | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editCodigoProducto, setEditCodigoProducto] = useState('')
  const [editImageS3Key, setEditImageS3Key] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [categoryToEdit, setCategoryToEdit] = useState<Categoria | null>(null)
  const [categoryEditName, setCategoryEditName] = useState('')
  const [categoryEditError, setCategoryEditError] = useState('')
  const [isSavingCategoryEdit, setIsSavingCategoryEdit] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false)
  const [isProductsPanelOpen, setIsProductsPanelOpen] = useState(false)
  const [openProductGroups, setOpenProductGroups] = useState<string[]>([])

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const logoCandidates = useMemo(() => {
    const candidates = [storeLogoUrl?.trim() || ''].filter(Boolean)
    return Array.from(new Set(candidates))
  }, [storeLogoUrl])

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

  const categoriasEditables = useMemo(() => {
    const term = categorySearch.trim().toLowerCase()
    return [...categorias]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .filter((categoria) =>
        term ? `${categoria.nombre} ${categoria.idCategoria}`.toLowerCase().includes(term) : true,
      )
  }, [categorias, categorySearch])

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

  const productGroups = useMemo<ProductCategoryGroup[]>(() => {
    const grouped = new Map<string, ProductItem[]>()

    for (const producto of productosFiltrados) {
      const label = getCategoriaLabel(producto).trim() || 'Sin categoria'
      const current = grouped.get(label)
      if (current) {
        current.push(producto)
      } else {
        grouped.set(label, [producto])
      }
    }

    return Array.from(grouped.entries())
      .map(([label, groupedProducts]) => ({
        label,
        products: groupedProducts,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [productosFiltrados, categorias])

  const toggleProductGroup = (label: string) => {
    setOpenProductGroups((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    )
  }

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

  const confirmarEliminar = async () => {
    if (!modalEliminar) return
    const result = await removeProduct(modalEliminar.id)
    setModalEliminar(null)
    if (result === 'deleted') {
      showToast('Producto eliminado correctamente.', 'info')
      return
    }

    if (result === 'backend_locked') {
      showToast('Solo puedes eliminar productos creados localmente.', 'info')
      return
    }

    if (result === 'not_found') {
      showToast('El producto no existe en esta empresa.', 'info')
      return
    }

    showToast('No se pudo eliminar el producto. Intenta de nuevo.', 'error')
  }

  const openEditarModal = (producto: ProductItem) => {
    setModalEditar(producto)
    setEditNombre(producto.nombre)
    setEditPrecio(String(producto.precio))
    setEditCodigoProducto(producto.codigo_producto ?? '')
    setEditImageS3Key(producto.image_s3_key ?? '')
    const currentCategoriaId =
      (typeof producto.categoriaID === 'number' ? producto.categoriaID : undefined) ??
      (producto.categoria && /^\d+$/.test(producto.categoria) ? Number(producto.categoria) : undefined)
    setEditCategoriaId(currentCategoriaId && Number.isFinite(currentCategoriaId) ? String(currentCategoriaId) : '')
    setEditDescripcion(producto.descripcion ?? '')
    setEditError('')
    setImageError('')
    setIsSavingEdit(false)
    setIsSavingImage(false)
  }

  const closeEditarModal = () => {
    if (isSavingEdit || isSavingImage) return
    setModalEditar(null)
    setEditError('')
    setImageError('')
  }

  const commitImageUpdate = async (input: { file?: File; s3Key?: string }) => {
    if (!modalEditar) return

    setIsSavingImage(true)
    setImageError('')

    try {
      const result = await replaceProductImage(modalEditar.id, input)
      setModalEditar((current) =>
        current ? { ...current, image_url: result.image_url, image_s3_key: result.image_s3_key } : current,
      )
      setEditImageS3Key(result.image_s3_key ?? '')
      showToast('Foto actualizada con exito.', 'success')
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'No se pudo actualizar la foto.'
      setImageError(message)
      showToast(message, 'error')
    } finally {
      setIsSavingImage(false)
    }
  }

  const handleEditImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !modalEditar) return

    await commitImageUpdate({ file })
  }

  const handleEditImageS3KeySave = async () => {
    const nextS3Key = editImageS3Key.trim()
    if (!nextS3Key) {
      setImageError('Ingresa un s3Key valido.')
      return
    }

    await commitImageUpdate({ s3Key: nextS3Key })
  }

  const openCategoryEditModal = (categoria: Categoria) => {
    setCategoryToEdit(categoria)
    setCategoryEditName(categoria.nombre)
    setCategoryEditError('')
  }

  const closeCategoryEditModal = () => {
    if (isSavingCategoryEdit || updatingCategoria) return
    setCategoryToEdit(null)
    setCategoryEditName('')
    setCategoryEditError('')
  }

  const guardarCategoriaEdicion = async () => {
    if (!categoryToEdit) return

    const nombre = categoryEditName.trim()
    if (!nombre) {
      setCategoryEditError('El nombre es obligatorio.')
      return
    }

    setIsSavingCategoryEdit(true)
    setCategoryEditError('')

    try {
      await updateCategoria(categoryToEdit.idCategoria, nombre)
      setToast({ message: 'Categoria actualizada con exito.', type: 'success' })
      setCategoryToEdit(null)
      setCategoryEditName('')
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'No se pudo actualizar la categoria.'
      setCategoryEditError(message)
      setToast({ message, type: 'error' })
    } finally {
      setIsSavingCategoryEdit(false)
    }
  }

  const guardarEdicion = async () => {
    if (!modalEditar) return

    const nombre = editNombre.trim()
    const precio = Number(editPrecio)
    const categoriaId = Number(editCategoriaId)
    const descripcion = editDescripcion.trim()
    const categoriaSeleccionada = categorias.find((categoria) => categoria.idCategoria === categoriaId)
    const categoriaActual = getCategoriaLabel(modalEditar).trim().toLowerCase()
    const isPersonalizados =
      categoriaSeleccionada?.nombre.trim().toLowerCase() === 'personalizado' ||
      categoriaActual === 'personalizado'

    if (!nombre) {
      setEditError('El nombre es obligatorio.')
      return
    }

    if (!Number.isFinite(precio) || (precio < 0 || (precio === 0 && !isPersonalizados))) {
      setEditError('Ingresa un precio valido.')
      return
    }

    if (!Number.isFinite(categoriaId) || categoriaId <= 0) {
      setEditError('Selecciona una categoria.')
      return
    }

    const codigoProducto = editCodigoProducto.trim()
    const categoriaParaEnviar = categoriaSeleccionada?.nombre ?? getCategoriaLabel(modalEditar)

    setIsSavingEdit(true)
    setEditError('')

    const ok = await updateProduct(modalEditar.id, {
      nombre,
      codigo_producto: codigoProducto || undefined,
      precio,
      categoriaID: categoriaId,
      categoria: categoriaParaEnviar,
      descripcion,
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
            categorias={categorias}
            categoriasLoading={categoriasLoading}
            categoriasError={categoriasError}
            creatingCategoria={creatingCategoria}
            createCategoria={createCategoria}
            onBack={() => setCurrentView('list')}
            onCreatedMany={(createdProducts) => {
              void (async () => {
                const latestProducts = await reloadProducts()
                setCurrentView('list')

                const directCodes = createdProducts
                  .map((product) => product.codigo_producto)
                  .filter((code): code is string => Boolean(code?.trim()))

                const createdBackendIds = createdProducts
                  .map((product) => product.backend_id)
                  .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))

                const derivedCodes = latestProducts
                  .filter((product) => createdBackendIds.includes(product.backend_id ?? -1))
                  .map((product) => product.codigo_producto)
                  .filter((code): code is string => Boolean(code?.trim()))

                const codes = Array.from(new Set([...directCodes, ...derivedCodes]))

                if (codes.length === 1) {
                  showToast(`Producto creado correctamente. Código generado: ${codes[0]}`, 'success')
                  return
                }

                if (codes.length > 1) {
                  showToast(
                    `Productos creados correctamente. Códigos generados: ${codes.join(', ')}`,
                    'success',
                  )
                  return
                }

                showToast('Producto creado correctamente.', 'success')
              })()
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

        <section className="pp-category-panel" aria-label="Gestion de categorias">
          <div className="pp-category-panel__header">
            <div className="pp-category-panel__header-copy">
              <p className="pp-category-panel__eyebrow">Categorias</p>
              <h2>Editar categorias</h2>
              <p className="pp-category-panel__hint">
                Aqui puedes cambiar el nombre de una categoria sin volver a crearla.
              </p>
            </div>
            <div className="pp-category-panel__stats">
              <strong>{categoriasEditables.length}</strong>
              <span>{categorySearch.trim() ? 'coincidencias' : 'categorias'}</span>
            </div>
            <button
              type="button"
              className="pp-category-panel__toggle"
              onClick={() => setIsCategoryPanelOpen((current) => !current)}
              aria-expanded={isCategoryPanelOpen}
              aria-controls="categories-accordion"
            >
              <span>{isCategoryPanelOpen ? 'Ocultar' : 'Mostrar'}</span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`pp-category-panel__chevron ${isCategoryPanelOpen ? 'is-open' : ''}`}
              >
                <path
                  d="M6 9l6 6 6-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div
            id="categories-accordion"
            className={`pp-category-panel__body ${isCategoryPanelOpen ? 'is-open' : ''}`}
            aria-hidden={!isCategoryPanelOpen}
          >
            <div className="pp-category-panel__body-inner">
              <div className="pp-category-panel__toolbar">
                <label className="pp-input-wrap pp-input-wrap--search pp-category-panel__search">
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
                    placeholder="Buscar categoria..."
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                  />
                </label>
                <p className="pp-category-panel__toolbar-note">
                  Busca una categoria por nombre o por ID para encontrarla mas rapido.
                </p>
              </div>

              {categorias.length === 0 ? (
                <p className="pp-category-panel__empty">No hay categorias cargadas para esta tienda.</p>
              ) : categoriasEditables.length === 0 ? (
                <p className="pp-category-panel__empty">
                  No encontramos coincidencias con tu busqueda.
                </p>
              ) : (
                <div className="pp-category-panel__list">
                  {categoriasEditables.map((categoria, index) => (
                    <article key={categoria.idCategoria} className="pp-category-row">
                      <div className="pp-category-row__index">{String(index + 1).padStart(2, '0')}</div>
                      <div className="pp-category-row__copy">
                        <div className="pp-category-row__title">
                          <strong>{categoria.nombre}</strong>
                          {categoria.nombre.trim().toLowerCase() === 'personalizado' ? (
                            <span className="pp-category-row__badge">Especial</span>
                          ) : null}
                        </div>
                        <span>ID {categoria.idCategoria}</span>
                      </div>
                      <button
                        type="button"
                        className="pp-btn pp-btn--ghost pp-category-row__button"
                        onClick={() => openCategoryEditModal(categoria)}
                      >
                        Editar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <section
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 justify-items-center"
            aria-label="Cargando productos"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <article
                key={`skeleton-${index}`}
                className="w-full max-w-[250px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md"
              >
                <div className="h-[200px] w-full animate-pulse bg-slate-200" />
                <div className="flex flex-col gap-3 p-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
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
          <section className="pp-products-accordion" aria-label="Catalogo de productos por categoria">
            <div className="pp-products-accordion__header">
              <div className="pp-products-accordion__header-copy">
                <p className="pp-products-accordion__eyebrow">Catalogo</p>
                <h2>Productos por categoria</h2>
                <p className="pp-products-accordion__hint">
                  Revisa tus productos por categoria y abre solo los que quieras ver.
                </p>
              </div>
              <button
                type="button"
                className="pp-products-accordion__toggle"
                onClick={() => setIsProductsPanelOpen((current) => !current)}
                aria-expanded={isProductsPanelOpen}
                aria-controls="products-accordion"
              >
                <span>{isProductsPanelOpen ? 'Ocultar' : 'Mostrar'}</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={`pp-products-accordion__chevron ${isProductsPanelOpen ? 'is-open' : ''}`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              id="products-accordion"
              className={`pp-products-accordion__body ${isProductsPanelOpen ? 'is-open' : ''}`}
              aria-hidden={!isProductsPanelOpen}
            >
              <div className="pp-products-accordion__body-inner">
                <div className="pp-products-accordion__stats">
                  <strong>{productGroups.length}</strong>
                  <span>categorias visibles</span>
                </div>

                {productGroups.map((group) => {
                  const isOpen = openProductGroups.includes(group.label)
                  return (
                    <article key={group.label} className="pp-product-group">
                      <button
                        type="button"
                        className="pp-product-group__header"
                        onClick={() => toggleProductGroup(group.label)}
                        aria-expanded={isOpen}
                        aria-controls={`group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div className="pp-product-group__copy">
                          <strong>{group.label}</strong>
                          <span>{group.products.length} producto(s)</span>
                        </div>
                        <div className="pp-product-group__actions">
                          <span className="pp-product-group__badge">
                            {isOpen ? 'Abierto' : 'Plegado'}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className={`pp-product-group__chevron ${isOpen ? 'is-open' : ''}`}
                          >
                            <path
                              d="M6 9l6 6 6-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </button>

                      <div
                        id={`group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}
                        className={`pp-product-group__body ${isOpen ? 'is-open' : ''}`}
                        aria-hidden={!isOpen}
                      >
                        <div className="pp-product-group__body-inner">
                          <section className="pp-products-grid" aria-label={`Productos de ${group.label}`}>
                            {isOpen
                              ? group.products.map((producto) => (
                                  <article
                                    key={producto.id}
                                    className="pp-product-card pp-product-card--catalog"
                                  >
                                    <div className="pp-product-media">
                                      <ProductImage src={producto.image_url} alt={producto.nombre} />
                                      <div className="pp-product-media__overlay">
                                        <span
                                          className={`pp-status-badge ${
                                            producto.estado === 'activo' ? 'is-active' : 'is-inactive'
                                          }`}
                                        >
                                          {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="pp-product-info">
                                      {producto.codigo_producto ? (
                                        <span className="pp-code-badge">{producto.codigo_producto}</span>
                                      ) : null}

                                      <h3 className="pp-product-title" title={producto.nombre}>
                                        {producto.nombre}
                                      </h3>
                                      <div className="pp-product-meta">
                                        <p className="pp-product-price">{formatCop(producto.precio)}</p>
                                        <span className="pp-category-tag">{getCategoriaLabel(producto)}</span>
                                      </div>

                                      <div className="pp-card-actions">
                                        <div className="pp-card-actions__main">
                                          <button
                                            type="button"
                                            className="pp-btn pp-btn--outline"
                                            onClick={() => openEditarModal(producto)}
                                          >
                                            Editar
                                          </button>

                                          <button
                                            type="button"
                                            className="pp-btn pp-btn--danger-soft"
                                            onClick={() => setModalEliminar(producto)}
                                          >
                                            <TrashIcon />
                                            <span>Eliminar</span>
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          className={`pp-switch ${
                                            producto.estado === 'activo' ? 'is-on' : 'is-off'
                                          }`}
                                          aria-label={
                                            producto.estado === 'activo'
                                              ? 'Desactivar producto'
                                              : 'Activar producto'
                                          }
                                          onClick={() => void handleToggleStatus(producto)}
                                        >
                                          <span className="pp-switch-thumb" />
                                        </button>
                                      </div>
                                    </div>
                                  </article>
                                ))
                              : null}
                          </section>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
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
              <button type="button" className="pp-btn pp-btn--danger" onClick={() => void confirmarEliminar()}>
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
            <header className="pp-modal-card__header">
              <p className="pp-modal-card__eyebrow">Producto</p>
              <h3>Editar producto</h3>
              <p>Actualiza la informacion principal del producto.</p>
            </header>

            <div className="pp-edit-image">
              {modalEditar.image_url ? (
                <img src={modalEditar.image_url} alt={modalEditar.nombre} className="pp-edit-image__preview" />
              ) : (
                <div className="pp-edit-image__empty">Sin imagen</div>
              )}
              <div className="pp-edit-image__section">
                <div className="pp-edit-image__section-head">
                  <strong>Subir nueva foto</strong>
                  <span>Reemplaza la imagen usando un archivo.</span>
                </div>
                <label className="pp-edit-image__button">
                  <span>{isSavingImage ? 'Actualizando foto...' : 'Elegir archivo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleEditImageChange(event)}
                    disabled={isSavingEdit || isSavingImage}
                  />
                </label>
              </div>
              <div className="pp-edit-image__section">
                <div className="pp-edit-image__section-head">
                  <strong>Reasociar por s3Key</strong>
                  <span>Usa esta opción si ya tienes la ruta guardada en S3.</span>
                </div>
                <label className="pp-form-field">
                  <span>S3 Key de imagen</span>
                  <input
                    type="text"
                    value={editImageS3Key}
                    onChange={(event) => setEditImageS3Key(event.target.value)}
                    disabled={isSavingEdit || isSavingImage}
                    placeholder="tenants/flora/productos/123/imagen.jpg"
                  />
                </label>
                <button
                  type="button"
                  className="pp-btn pp-btn--ghost"
                  onClick={() => void handleEditImageS3KeySave()}
                  disabled={isSavingEdit || isSavingImage}
                >
                  {isSavingImage ? 'Guardando...' : 'Reasociar imagen'}
                </button>
              </div>
              <small>Si el backend responde con error, la imagen actual no se reemplaza y se muestra el mensaje devuelto.</small>
            </div>

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
              <span>Código del producto</span>
              <input
                type="text"
                value={editCodigoProducto}
                onChange={(event) => setEditCodigoProducto(event.target.value)}
                disabled={isSavingEdit}
                placeholder="Ej: PROD-001"
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

            <label className="pp-form-field">
              <span>Descripcion</span>
              <textarea
                value={editDescripcion}
                onChange={(event) => setEditDescripcion(event.target.value)}
                disabled={isSavingEdit}
                rows={4}
                placeholder="Agrega una descripcion para el producto"
              />
            </label>

            {editError ? <p className="pp-form-error">{editError}</p> : null}
            {imageError ? <p className="pp-form-error">{imageError}</p> : null}

            <div className="pp-modal-actions">
              <button type="button" className="pp-btn pp-btn--ghost" onClick={closeEditarModal} disabled={isSavingEdit}>
                Cancelar
              </button>
              <button
                type="button"
                className="pp-btn pp-btn--primary"
                onClick={() => void guardarEdicion()}
                disabled={isSavingEdit || isSavingImage}
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NewCategoryDialog
        open={Boolean(categoryToEdit)}
        nombre={categoryEditName}
        error={categoryEditError}
        isSaving={isSavingCategoryEdit}
        title="Editar categoría"
        submitLabel="Guardar cambios"
        onNombreChange={(value) => {
          setCategoryEditName(value)
          if (categoryEditError) setCategoryEditError('')
        }}
        onCancel={closeCategoryEditModal}
        onSubmit={() => void guardarCategoriaEdicion()}
      />

      {toast ? (
        <div className={`pp-toast pp-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </main>
  )
}
