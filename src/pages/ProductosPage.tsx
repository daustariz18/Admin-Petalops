import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ProductForm } from '../features/products/ProductForm'
import { useProducts, type ProductItem } from '../features/products/useProducts'
import { useCategorias, type Categoria } from '../hooks/useCategorias'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { getStoredCompanyLogo, setStoredCompanyLogo, uploadCompanyLogo } from '../services/companyLogoStorage'
import './ProductosPage.css'

type FiltroEstado = 'todos' | 'activo' | 'inactivo'
type FiltroPrecio = 'todos' | 'lt200' | '200to400' | 'gt400'
type ToastType = 'success' | 'error' | 'info'

type ToastState = {
  message: string
  type: ToastType
} | null

const LOGO_MAX_SIZE_MB = 15
const LOGO_MAX_SIZE_BYTES = LOGO_MAX_SIZE_MB * 1024 * 1024
const LOGO_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])
const LOGO_ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i
const LOGO_ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif'

type ProductosPageProps = {
  empresaID: string
  tiendaNombre?: string
  storeLogoUrl?: string
  userInitials?: string
  onCompanyLogoUpdated?: (logoUrl: string) => void
  onLogout: () => void
  onNavigateToBarrios: () => void
}

function formatCop(value: number): string {
  return `$ ${value.toLocaleString('es-CO')}`
}

function parseCurrencyInput(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCurrencyInput(value: string): string {
  const amount = Number(parseCurrencyInput(value))
  return Number.isFinite(amount) && value ? formatCop(amount) : ''
}
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('No pudimos leer el logo.'))
    reader.readAsDataURL(file)
  })
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
    <div className={`pp-store-fallback ${className}`.trim()}>
      <span className="pp-store-fallback__initial">{getStoreInitial(name)}</span>
      <div className="pp-store-fallback__copy">
        <strong>{name}</strong>
        <span>Marca activa</span>
      </div>
    </div>
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

function BoxIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className || 'pp-icon'}>
      <path
        d="M3.6 7.4L12 3l8.4 4.4v9.2L12 21l-8.4-4.4V7.4zM12 12l8.1-4.3M12 12L3.9 7.7M12 12v8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-icon">
      <path
        d="M12 8.2a3.8 3.8 0 110 7.6 3.8 3.8 0 010-7.6zm7.1 3.8a7.4 7.4 0 00-.1-1.1l2-1.5-2-3.4-2.4 1a8.3 8.3 0 00-1.9-1.1L14.4 3h-4.8l-.3 2.9A8.3 8.3 0 007.4 7L5 6 3 9.4l2 1.5a7.4 7.4 0 000 2.2l-2 1.5L5 18l2.4-1a8.3 8.3 0 001.9 1.1l.3 2.9h4.8l.3-2.9a8.3 8.3 0 001.9-1.1l2.4 1 2-3.4-2-1.5c.1-.4.1-.7.1-1.1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-icon">
      <path
        d="M12 21s6-5.3 6-11a6 6 0 10-12 0c0 5.7 6 11 6 11zm0-8.2a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-icon">
      <path
        d="M4 20h4.2L19.5 8.7a2 2 0 00-2.8-2.8L5.4 17.2 4 20zM14.8 7.8l1.4 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-icon">
      <path
        d="M3 3l18 18M10.6 10.7a2.2 2.2 0 003 2.8M7.2 7.5C4.7 8.8 3 11.1 3 12s3.4 5.5 9 5.5c1.4 0 2.7-.3 3.8-.7M12 6.5c5.6 0 9 4.6 9 5.5 0 .5-.9 1.8-2.3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pp-icon">
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 16.5V18a2 2 0 002 2h10a2 2 0 002-2v-1.5"
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
  userInitials = 'U',
  onCompanyLogoUpdated,
  onLogout,
  onNavigateToBarrios,
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
    toggleCategoriaStatus,
    deleteCategoria,
    deletingCategoria,
    orderingCategorias,
    reorderCategorias,
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
  const [editCodigoCatalogo, setEditCodigoCatalogo] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editEstado, setEditEstado] = useState<ProductItem['estado']>('activo')
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [localLogoUrl, setLocalLogoUrl] = useState(() => getStoredCompanyLogo(empresaID))
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [deleteConflictProduct, setDeleteConflictProduct] = useState<ProductItem | null>(null)
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<Categoria | null>(null)
  const [categoryDeleteConflict, setCategoryDeleteConflict] = useState<Categoria | null>(null)
  const [categoryToEdit, setCategoryToEdit] = useState<Categoria | null>(null)
  const [categoryEditName, setCategoryEditName] = useState('')
  const [categoryEditError, setCategoryEditError] = useState('')
  const [isSavingCategoryEdit, setIsSavingCategoryEdit] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false)

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    setLocalLogoUrl(getStoredCompanyLogo(empresaID))
  }, [empresaID])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const logoCandidates = useMemo(() => {
    const candidates = [localLogoUrl.trim(), storeLogoUrl?.trim() || ''].filter(Boolean)
    return Array.from(new Set(candidates))
  }, [localLogoUrl, storeLogoUrl])

  const [logoIndex, setLogoIndex] = useState(0)
  const avatarMenuRef = useRef<HTMLDivElement | null>(null)
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleStoreLogoUpload = async (file: File) => {
    const normalizedType = file.type.trim().toLowerCase()

    if (!LOGO_ALLOWED_MIME_TYPES.has(normalizedType) && !LOGO_ALLOWED_EXTENSIONS.test(file.name)) {
      showToast('Formato no permitido. Usa JPG, PNG, WebP, HEIC o HEIF.', 'error')
      return
    }

    if (file.size > LOGO_MAX_SIZE_BYTES) {
      showToast(`El logo debe pesar maximo ${LOGO_MAX_SIZE_MB}MB.`, 'error')
      return
    }

    setIsUploadingLogo(true)

    try {
      const result = await uploadCompanyLogo({ file })
      const nextLogoUrl = result.logoUrl || (await readFileAsDataUrl(file))
      setStoredCompanyLogo(empresaID, nextLogoUrl)
      setLocalLogoUrl(nextLogoUrl)
      onCompanyLogoUpdated?.(nextLogoUrl)
      showToast('Logo subido a S3 correctamente.', 'success')
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'No se pudo subir el logo.'
      showToast(message, 'error')
    } finally {
      setIsUploadingLogo(false)
    }
  }

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

  const getCategoriaEstado = (categoria: Categoria): 'activo' | 'inactivo' => {
    if (typeof categoria.active === 'boolean') {
      return categoria.active ? 'activo' : 'inactivo'
    }

    if (typeof categoria.activo === 'boolean') {
      return categoria.activo ? 'activo' : 'inactivo'
    }

    return categoria.estado === 'inactivo' ? 'inactivo' : 'activo'
  }

  const orderedCategorias = useMemo(() => {
    return [...categorias].sort((a, b) => {
      const orderA = Number.isFinite(a.orden_catalogo) ? Number(a.orden_catalogo) : Number.MAX_SAFE_INTEGER
      const orderB = Number.isFinite(b.orden_catalogo) ? Number(b.orden_catalogo) : Number.MAX_SAFE_INTEGER

      if (orderA !== orderB) return orderA - orderB
      return a.nombre.localeCompare(b.nombre, 'es')
    })
  }, [categorias])

  const categoryOrderIndex = useMemo(() => {
    return new Map(orderedCategorias.map((categoria, index) => [categoria.nombre.trim().toLowerCase(), index]))
  }, [orderedCategorias])

  const categoriasFiltrables = useMemo(() => {
    const unique = Array.from(new Set(products.map((producto) => getCategoriaLabel(producto))))
    return unique.sort((a, b) => {
      const orderA = categoryOrderIndex.get(a.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER
      const orderB = categoryOrderIndex.get(b.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER

      if (orderA !== orderB) return orderA - orderB
      return a.localeCompare(b, 'es')
    })
  }, [products, categorias, categoryOrderIndex])

  const categoriasEditables = useMemo(() => {
    const term = categorySearch.trim().toLowerCase()
    return orderedCategorias.filter((categoria) =>
      term ? `${categoria.nombre} ${categoria.idCategoria}`.toLowerCase().includes(term) : true,
    )
  }, [orderedCategorias, categorySearch])

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

    return { total, activos, inactivos }
  }, [products])

  const isEditDirty = useMemo(() => {
    if (!modalEditar) return false

    const categoriaByName = categorias.find(
      (categoria) => modalEditar.categoria?.trim().toLowerCase() === categoria.nombre.trim().toLowerCase(),
    )
    const originalCategoriaId =
      (typeof modalEditar.categoriaID === 'number' ? modalEditar.categoriaID : undefined) ??
      (modalEditar.categoria && /^\d+$/.test(modalEditar.categoria) ? Number(modalEditar.categoria) : undefined) ??
      categoriaByName?.idCategoria
    const originalCategoria = originalCategoriaId && Number.isFinite(originalCategoriaId) ? String(originalCategoriaId) : ''

    return (
      editNombre.trim() !== modalEditar.nombre.trim() ||
      Number(editPrecio) !== modalEditar.precio ||
      editCategoriaId !== originalCategoria ||
      editDescripcion.trim() !== (modalEditar.descripcion ?? '').trim() ||
      editEstado !== modalEditar.estado
    )
  }, [categorias, editCategoriaId, editDescripcion, editEstado, editNombre, editPrecio, modalEditar])

  const confirmarEliminar = async () => {
    if (!modalEliminar) return
    const result = await removeProduct(modalEliminar.id)
    if (result === 'deleted') {
      setModalEliminar(null)
      setDeleteConflictProduct(null)
      showToast('Producto eliminado correctamente.', 'info')
      return
    }

    if (result === 'backend_locked') {
      setModalEliminar(null)
      setDeleteConflictProduct(null)
      showToast('No se pudo eliminar el producto.', 'error')
      return
    }

    if (result === 'conflict') {
      setDeleteConflictProduct(modalEliminar)
      return
    }

    if (result === 'not_found') {
      setModalEliminar(null)
      setDeleteConflictProduct(null)
      showToast('El producto no existe en esta empresa.', 'info')
      return
    }

    setModalEliminar(null)
    setDeleteConflictProduct(null)
    showToast('No se pudo eliminar el producto. Intenta de nuevo.', 'error')
  }

  const handleDeactivateInsteadOfDelete = async () => {
    if (!modalEliminar) return

    const ok = await toggleProductStatus(modalEliminar.id)
    if (!ok) {
      showToast('No se pudo desactivar el producto.', 'error')
      return
    }

    setModalEliminar(null)
    setDeleteConflictProduct(null)
    showToast('Producto desactivado correctamente.', 'success')
  }

  const openEditarModal = (producto: ProductItem) => {
    setModalEditar(producto)
    setEditNombre(producto.nombre)
    setEditPrecio(String(producto.precio))
    setEditCodigoCatalogo(producto.codigo_catalogo ?? '')
    setEditEstado(producto.estado)
    const categoriaByName = categorias.find(
      (categoria) =>
        producto.categoria?.trim().toLowerCase() === categoria.nombre.trim().toLowerCase(),
    )
    const currentCategoriaId =
      (typeof producto.categoriaID === 'number' ? producto.categoriaID : undefined) ??
      (producto.categoria && /^\d+$/.test(producto.categoria) ? Number(producto.categoria) : undefined) ??
      categoriaByName?.idCategoria
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

  const handleToggleCategoriaStatus = async (categoria: Categoria) => {
    try {
      await toggleCategoriaStatus(categoria.idCategoria)
      await reloadProducts()
      const nextEstado = getCategoriaEstado(categoria) === 'activo' ? 'inactivo' : 'activo'
      showToast(`Categoria marcada como ${nextEstado}.`, 'success')
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'No se pudo actualizar el estado de la categoria.'
      showToast(message, 'error')
    }
  }

  const handleMoveCategoria = async (categoria: Categoria, direction: -1 | 1) => {
    const currentIndex = orderedCategorias.findIndex((item) => item.idCategoria === categoria.idCategoria)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedCategorias.length) return

    const next = [...orderedCategorias]
    const [moved] = next.splice(currentIndex, 1)
    next.splice(nextIndex, 0, moved)

    try {
      await reorderCategorias(next.map((item) => item.idCategoria))
      showToast('Orden de categorias actualizado.', 'success')
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'No se pudo guardar el orden de las categorias.'
      showToast(message, 'error')
    }
  }

  const handleDeleteCategoria = async () => {
    if (!categoryDeleteTarget) return

    const result = await deleteCategoria(categoryDeleteTarget.idCategoria)

    if (result === 'deleted') {
      setCategoryDeleteTarget(null)
      setCategoryDeleteConflict(null)
      showToast('Categoria eliminada correctamente.', 'info')
      await reloadProducts()
      return
    }

    if (result === 'conflict') {
      setCategoryDeleteConflict(categoryDeleteTarget)
      return
    }

    if (result === 'not_found') {
      setCategoryDeleteTarget(null)
      setCategoryDeleteConflict(null)
      showToast('La categoria no existe o ya fue eliminada.', 'info')
      return
    }

    setCategoryDeleteTarget(null)
    setCategoryDeleteConflict(null)
    showToast('No se pudo eliminar la categoria. Intenta de nuevo.', 'error')
  }

  const handleDeactivateCategoryInsteadOfDelete = async () => {
    if (!categoryDeleteTarget) return

    try {
      await toggleCategoriaStatus(categoryDeleteTarget.idCategoria)
      await reloadProducts()
      setCategoryDeleteTarget(null)
      setCategoryDeleteConflict(null)
      showToast('Categoria desactivada correctamente.', 'success')
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'No se pudo desactivar la categoria.'
      showToast(message, 'error')
    }
  }

  const guardarEdicion = async () => {
    if (!modalEditar) return
    if (!isEditDirty) return

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

    const codigoCatalogo = editCodigoCatalogo.trim()
    const categoriaParaEnviar = categoriaSeleccionada?.nombre ?? getCategoriaLabel(modalEditar)
    const categoriaOriginalPorNombre = categorias.find(
      (categoria) => modalEditar.categoria?.trim().toLowerCase() === categoria.nombre.trim().toLowerCase(),
    )
    const originalCategoriaId =
      (typeof modalEditar.categoriaID === 'number' ? modalEditar.categoriaID : undefined) ??
      (modalEditar.categoria && /^\d+$/.test(modalEditar.categoria) ? Number(modalEditar.categoria) : undefined) ??
      categoriaOriginalPorNombre?.idCategoria
    const originalCategoriaValue = originalCategoriaId && Number.isFinite(originalCategoriaId) ? String(originalCategoriaId) : ''
    const hasDataChanges =
      nombre !== modalEditar.nombre.trim() ||
      precio !== modalEditar.precio ||
      editCategoriaId !== originalCategoriaValue ||
      descripcion !== (modalEditar.descripcion ?? '').trim()
    const hasStatusChange = editEstado !== modalEditar.estado

    setIsSavingEdit(true)
    setEditError('')

    const ok = hasDataChanges
      ? await updateProduct(modalEditar.id, {
          nombre,
          codigo_catalogo: codigoCatalogo || undefined,
          precio,
          categoriaID: categoriaId,
          categoria: categoriaParaEnviar,
          descripcion,
        })
      : true

    const statusOk = ok && hasStatusChange ? await toggleProductStatus(modalEditar.id) : true

    setIsSavingEdit(false)

    if (!ok || !statusOk) {
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
        <section className="pp-container pp-container--wide">
          <ProductForm
            empresaID={empresaID}
            categorias={categorias}
            categoriasLoading={categoriasLoading}
            categoriasError={categoriasError}
            creatingCategoria={creatingCategoria}
            createCategoria={createCategoria}
            tiendaNombre={tiendaNombre}
            storeLogoUrl={logoCandidates[0] || ''}
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
                  showToast(`Producto creado correctamente. Codigo generado: ${codes[0]}`, 'success')
                  return
                }

                if (codes.length > 1) {
                  showToast(
                    `Productos creados correctamente. Codigos generados: ${codes.join(', ')}`,
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
                <>
                  <img
                    src={logoCandidates[logoIndex]}
                    alt={`Logo ${tiendaNombre}`}
                    className="pp-store-logo"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    decoding="async"
                    onError={() => {
                      setLogoIndex((current) => {
                        const next = current + 1
                        if (next < logoCandidates.length) return next
                        return logoCandidates.length
                      })
                    }}
                  />
                  <span className="pp-store-name">{tiendaNombre}</span>
                </>
              ) : (
                <StoreFallback name={tiendaNombre} />
              )}
            </div>

            <div className="pp-avatar-menu" ref={avatarMenuRef}>
              <button
                type="button"
                className="pp-avatar"
                aria-label={`Menu de usuario ${userInitials}`}
                aria-expanded={avatarOpen}
                onClick={() => setAvatarOpen((current) => !current)}
              >
                {userInitials}
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
            <div className="pp-title-cluster">
              <div className="pp-section-icon">
                <BoxIcon />
              </div>
              <div>
                <h1>Productos</h1>
                <p>
                  <strong>{stats.total}</strong> productos <span>-</span>{' '}
                  <strong>{stats.activos}</strong> activos <span>-</span>{' '}
                  <strong>{stats.inactivos}</strong> inactivos
                </p>
              </div>
            </div>

            <div className="pp-title-actions">
              <input
                ref={companyLogoInputRef}
                type="file"
                accept={LOGO_ACCEPT}
                className="pp-logo-upload-input"
                aria-label="Subir logo de la empresa a S3"
                disabled={isUploadingLogo}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void handleStoreLogoUpload(file)
                }}
              />
              <button
                type="button"
                className="pp-btn pp-btn--logo-upload"
                onClick={() => companyLogoInputRef.current?.click()}
                disabled={isUploadingLogo}
                title="Subir logo de la empresa a S3"
              >
                <UploadIcon />
                <span>{isUploadingLogo ? 'Subiendo logo...' : logoCandidates[0] ? 'Cambiar logo' : 'Subir logo'}</span>
              </button>
              <button type="button" className="pp-btn pp-btn--primary" onClick={() => setCurrentView('new')}>
                <span aria-hidden="true">+</span>
                <span>Nuevo producto</span>
              </button>
              <button type="button" className="pp-btn pp-btn--zones" onClick={onNavigateToBarrios}>
                <PinIcon />
                <span>Zonas de entrega</span>
              </button>
              <button
                type="button"
                className="pp-btn pp-btn--ghost"
                onClick={() => setIsCategoryPanelOpen((current) => !current)}
                aria-expanded={isCategoryPanelOpen}
                aria-controls="categories-accordion"
              >
                <GearIcon />
                <span>Gestionar categorias</span>
              </button>
            </div>
          </div>
        </header>

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
              <option value="todos">Estado</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>

          <label className="pp-input-wrap">
            <select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
              <option value="todas">Categoria</option>
              {categoriasFiltrables.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>

          <label className="pp-input-wrap">
            <select value={filtroPrecio} onChange={(event) => setFiltroPrecio(event.target.value as FiltroPrecio)}>
              <option value="todos">Precio</option>
              <option value="lt200">Menos de $200.000</option>
              <option value="200to400">$200.000 - $400.000</option>
              <option value="gt400">Mas de $400.000</option>
            </select>
          </label>

          <div className="pp-filter-tabs" aria-label="Filtro rapido por estado">
            <button
              type="button"
              className={filtroEstado === 'todos' ? 'is-active' : ''}
              onClick={() => setFiltroEstado('todos')}
            >
              Todos
            </button>
            <button
              type="button"
              className={filtroEstado === 'activo' ? 'is-active' : ''}
              onClick={() => setFiltroEstado('activo')}
            >
              Activos
            </button>
            <button
              type="button"
              className={filtroEstado === 'inactivo' ? 'is-active' : ''}
              onClick={() => setFiltroEstado('inactivo')}
            >
              Inactivos
            </button>
          </div>
        </section>

        <section className={`pp-category-panel ${isCategoryPanelOpen ? 'is-open' : ''}`} aria-label="Gestion de categorias">
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
                  {categorySearch.trim()
                    ? 'Limpia la busqueda para cambiar el orden del catalogo.'
                    : 'Usa las flechas para definir como apareceran las categorias en el catalogo.'}
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
                      <div className="pp-category-row__order">
                        <div className="pp-category-row__index">{String(index + 1).padStart(2, '0')}</div>
                        <div className="pp-category-row__order-actions" aria-label={`Ordenar ${categoria.nombre}`}>
                          <button
                            type="button"
                            className="pp-order-btn"
                            aria-label={`Subir ${categoria.nombre}`}
                            onClick={() => void handleMoveCategoria(categoria, -1)}
                            disabled={orderingCategorias || Boolean(categorySearch.trim()) || index === 0}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M7 14l5-5 5 5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="pp-order-btn"
                            aria-label={`Bajar ${categoria.nombre}`}
                            onClick={() => void handleMoveCategoria(categoria, 1)}
                            disabled={
                              orderingCategorias ||
                              Boolean(categorySearch.trim()) ||
                              index === categoriasEditables.length - 1
                            }
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M7 10l5 5 5-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="pp-category-row__copy">
                        <div className="pp-category-row__title">
                          <strong>{categoria.nombre}</strong>
                          {categoria.nombre.trim().toLowerCase() === 'personalizado' ? (
                            <span className="pp-category-row__badge">Especial</span>
                          ) : null}
                        </div>
                        <span>ID {categoria.idCategoria}</span>
                      </div>
                      <div className="pp-category-row__actions">
                        <span
                          className={`pp-status-badge ${
                            getCategoriaEstado(categoria) === 'activo' ? 'is-active' : 'is-inactive'
                          }`}
                        >
                          {getCategoriaEstado(categoria) === 'activo' ? 'Activa' : 'Inactiva'}
                        </span>
                        <button
                          type="button"
                          className={`pp-switch ${getCategoriaEstado(categoria) === 'activo' ? 'is-on' : 'is-off'}`}
                          aria-label={
                            getCategoriaEstado(categoria) === 'activo'
                              ? 'Desactivar categoria'
                              : 'Activar categoria'
                          }
                          onClick={() => void handleToggleCategoriaStatus(categoria)}
                          disabled={updatingCategoria}
                        >
                          <span className="pp-switch-thumb" />
                        </button>
                        <button
                          type="button"
                          className="pp-btn pp-btn--ghost pp-category-row__button"
                          onClick={() => openCategoryEditModal(categoria)}
                          disabled={updatingCategoria}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="pp-btn pp-btn--danger-soft pp-category-row__button"
                          onClick={() => {
                            setCategoryDeleteConflict(null)
                            setCategoryDeleteTarget(categoria)
                          }}
                          disabled={updatingCategoria || deletingCategoria}
                        >
                          <TrashIcon />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <section className="pp-products-table pp-products-table--loading" aria-label="Cargando productos">
            <div className="pp-table-head">
              <span>Producto</span>
              <span>Categoria</span>
              <span>Precio</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="pp-table-row pp-table-row--skeleton">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
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
          <section className="pp-products-list" aria-label="Listado de productos">
            <p className="pp-results-count">{productosFiltrados.length} productos encontrados</p>
            <div className="pp-products-table" role="table" aria-label="Productos">
              <div className="pp-table-head" role="row">
                <span role="columnheader">Producto</span>
                <span role="columnheader">Categoria</span>
                <span role="columnheader">Precio</span>
                <span role="columnheader">Estado</span>
                <span role="columnheader">Acciones</span>
              </div>

              {productosFiltrados.map((producto) => {
                const productCode = producto.codigo_producto || producto.codigo_catalogo || 'Sin codigo'

                return (
                  <article key={producto.id} className="pp-table-row" role="row">
                    <div className="pp-table-product" role="cell">
                      <div className="pp-product-thumb">
                        <ProductImage src={producto.image_url} alt={producto.nombre} />
                      </div>
                      <div className="pp-table-product__copy">
                        <strong title={producto.nombre}>{producto.nombre}</strong>
                        <span>{productCode}</span>
                      </div>
                    </div>

                    <div className="pp-table-cell" role="cell">{getCategoriaLabel(producto)}</div>
                    <div className="pp-table-cell pp-table-price" role="cell">{formatCop(producto.precio)}</div>
                    <div className="pp-table-cell" role="cell">
                      <span
                        className={`pp-status-badge ${
                          producto.estado === 'activo' ? 'is-active' : 'is-inactive'
                        }`}
                      >
                        {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="pp-row-actions" role="cell">
                      <button
                        type="button"
                        className="pp-mini-action"
                        onClick={() => openEditarModal(producto)}
                        aria-label={`Editar ${producto.nombre}`}
                        title="Editar"
                      >
                        <EditIcon />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        className="pp-mini-action"
                        onClick={() => void handleToggleStatus(producto)}
                        aria-label={producto.estado === 'activo' ? `Desactivar ${producto.nombre}` : `Activar ${producto.nombre}`}
                        title={producto.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      >
                        <EyeOffIcon />
                        <span>{producto.estado === 'activo' ? 'Desactivar' : 'Activar'}</span>
                      </button>
                      <button
                        type="button"
                        className="pp-mini-action pp-mini-action--danger"
                        onClick={() => {
                          setDeleteConflictProduct(null)
                          setModalEliminar(producto)
                        }}
                        aria-label={`Eliminar ${producto.nombre}`}
                        title="Eliminar"
                      >
                        <TrashIcon />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </section>

      {modalEliminar ? (
        <div className="pp-modal" role="dialog" aria-modal="true" aria-label="Confirmar eliminacion">
          <div
            className="pp-modal-overlay"
            onClick={() => {
              setModalEliminar(null)
              setDeleteConflictProduct(null)
            }}
          />
          <div className="pp-modal-card">
            <WarningIcon />
            <h3>{deleteConflictProduct ? 'No se puede eliminar este producto' : 'Eliminar producto?'}</h3>
            <p>
              {deleteConflictProduct
                ? 'Este producto ya tiene pedidos asociados. Puedes desactivarlo para ocultarlo del catalogo sin borrar su historial.'
                : 'Esta accion no se puede deshacer. El producto sera eliminado permanentemente.'}
            </p>
            <div className="pp-modal-actions">
              <button
                type="button"
                className="pp-btn pp-btn--ghost"
                onClick={() => {
                  setModalEliminar(null)
                  setDeleteConflictProduct(null)
                }}
              >
                Cancelar
              </button>
              {deleteConflictProduct ? (
                <button
                  type="button"
                  className="pp-btn pp-btn--primary"
                  onClick={() => void handleDeactivateInsteadOfDelete()}
                >
                  Desactivar
                </button>
              ) : (
                <button type="button" className="pp-btn pp-btn--danger" onClick={() => void confirmarEliminar()}>
                  Si, eliminar
                </button>
              )}
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
              <p>Revisa y actualiza la informacion principal del producto.</p>
            </header>

            <div className="pp-edit-layout">
              <aside className="pp-edit-image">
                <div className="pp-edit-image__frame">
                  {modalEditar.image_url ? (
                    <img src={modalEditar.image_url} alt={modalEditar.nombre} className="pp-edit-image__preview" />
                  ) : (
                    <div className="pp-edit-image__empty">Sin imagen</div>
                  )}
                </div>
                <label className="pp-edit-image__button">
                  <span>{isSavingImage ? 'Cambiando imagen...' : 'Cambiar imagen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleEditImageChange(event)}
                    disabled={isSavingEdit || isSavingImage}
                  />
                </label>
                <small>Formatos permitidos: JPG, PNG o WebP.</small>
              </aside>

              <section className="pp-edit-main" aria-label="Informacion principal">
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
                  <span>Precio</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(editPrecio)}
                    onChange={(event) => setEditPrecio(parseCurrencyInput(event.target.value))}
                    disabled={isSavingEdit}
                    placeholder="$ 0"
                  />
                </label>

                <div className="pp-form-field">
                  <span>Estado</span>
                  <div className="pp-status-segment" role="group" aria-label="Estado del producto">
                    <button
                      type="button"
                      className={editEstado === 'activo' ? 'is-active' : ''}
                      onClick={() => setEditEstado('activo')}
                      disabled={isSavingEdit}
                    >
                      Activo
                    </button>
                    <button
                      type="button"
                      className={editEstado === 'inactivo' ? 'is-active' : ''}
                      onClick={() => setEditEstado('inactivo')}
                      disabled={isSavingEdit}
                    >
                      Inactivo
                    </button>
                  </div>
                </div>

                <label className="pp-form-field pp-form-field--readonly">
                  <span>Codigo del producto</span>
                  <input
                    type="text"
                    value={modalEditar.codigo_producto || editCodigoCatalogo || 'Sin codigo'}
                    readOnly
                    disabled={isSavingEdit}
                  />
                </label>

                <label className="pp-form-field pp-form-field--wide">
                  <span>Descripcion</span>
                  <textarea
                    value={editDescripcion}
                    onChange={(event) => setEditDescripcion(event.target.value)}
                    disabled={isSavingEdit}
                    rows={4}
                    placeholder="Agrega una descripcion para el producto"
                  />
                </label>
              </section>
            </div>

            {editError ? <p className="pp-form-error">{editError}</p> : null}
            {imageError ? <p className="pp-form-error">{imageError}</p> : null}

            <div className="pp-modal-actions">
              <span className={`pp-dirty-note ${isEditDirty ? 'is-visible' : ''}`}>
                Cambios sin guardar
              </span>
              <button type="button" className="pp-btn pp-btn--ghost" onClick={closeEditarModal} disabled={isSavingEdit}>
                Cancelar
              </button>
              <button
                type="button"
                className="pp-btn pp-btn--primary"
                onClick={() => void guardarEdicion()}
                disabled={isSavingEdit || isSavingImage || !isEditDirty}
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
        title="Editar categoria"
        submitLabel="Guardar cambios"
        onNombreChange={(value) => {
          setCategoryEditName(value)
          if (categoryEditError) setCategoryEditError('')
        }}
        onCancel={closeCategoryEditModal}
        onSubmit={() => void guardarCategoriaEdicion()}
      />

      {categoryDeleteTarget ? (
        <div className="pp-modal" role="dialog" aria-modal="true" aria-label="Confirmar eliminacion de categoria">
          <div
            className="pp-modal-overlay"
            onClick={() => {
              setCategoryDeleteTarget(null)
              setCategoryDeleteConflict(null)
            }}
          />
          <div className="pp-modal-card">
            <WarningIcon />
            <h3>{categoryDeleteConflict ? 'No se puede eliminar esta categoria' : 'Eliminar categoria?'}</h3>
            <p>
              {categoryDeleteConflict
                ? 'Esta categoria tiene productos asociados. Puedes desactivarla para ocultarla sin borrar su historial.'
                : 'Esta accion no se puede deshacer. La categoria sera eliminada solo si no tiene productos asociados.'}
            </p>
            <div className="pp-modal-actions">
              <button
                type="button"
                className="pp-btn pp-btn--ghost"
                onClick={() => {
                  setCategoryDeleteTarget(null)
                  setCategoryDeleteConflict(null)
                }}
              >
                Cancelar
              </button>
              {categoryDeleteConflict ? (
                <button
                  type="button"
                  className="pp-btn pp-btn--primary"
                  onClick={() => void handleDeactivateCategoryInsteadOfDelete()}
                >
                  Desactivar
                </button>
              ) : (
                <button
                  type="button"
                  className="pp-btn pp-btn--danger"
                  onClick={() => void handleDeleteCategoria()}
                  disabled={deletingCategoria}
                >
                  Si, eliminar
                </button>
              )}
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
