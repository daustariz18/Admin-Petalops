import { useMemo, useState } from 'react'
import { NewCategoryDialog } from '../../../components/NewCategoryDialog'
import { apiClient } from '../../../services/apiClient'
import { createProductWithImage, validateImageFile } from '../../../services/productService'
import { buildProductsEndpoint } from '../../../services/productPaths'
import type { DraftSaveMeta } from '../types'
import { getDraftCategoryLabel, isDraftComplete, parsePrice } from '../types'
import { useProductDrafts } from '../hooks/useProductDrafts'
import type { ProductItem } from '../useProducts'
import type { Categoria } from '../../../hooks/useCategorias'
import { ProductActionsFooter } from './ProductActionsFooter'
import { ProductPreviewList } from './ProductPreviewList'
import { UploadArea } from './UploadArea'
import './product-creation.css'

const MAX_PRODUCTS = 60
type DraftFilter = 'todos' | 'listos' | 'incompletos'

type CreatedProduct = Omit<ProductItem, 'id'> & {
  backend_id?: number
  codigo_producto?: string
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pc-icon">
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

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pc-icon">
      <path
        d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm2 11l3-3 2.5 2.5L15 12l4 4M8.5 8.5h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pc-icon">
      <path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

async function persistCreatedStatus(productId: number, empresaID: string, estado: ProductItem['estado']) {
  if (estado === 'activo') return

  const query = `empresa_id=${encodeURIComponent(empresaID)}`
  await apiClient.patch(`${buildProductsEndpoint(String(productId), 'estado')}?${query}`, { estado })
}

type ProductCreationBoardProps = {
  empresaID?: string
  categorias: Categoria[]
  categoriasLoading: boolean
  categoriasError: string
  creatingCategoria: boolean
  createCategoria: (nombre: string) => Promise<Categoria>
  onCreatedBatch?: (products: CreatedProduct[]) => void
}

export const ProductCreationBoard = ({
  empresaID,
  categorias,
  categoriasLoading,
  categoriasError,
  creatingCategoria,
  createCategoria,
  onCreatedBatch,
}: ProductCreationBoardProps) => {
  const { drafts, slotsLeft, handleImageUpload, updateDraft, removeDraft, removeDrafts } =
    useProductDrafts(MAX_PRODUCTS)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveMetaById, setSaveMetaById] = useState<Record<string, DraftSaveMeta>>({})
  const [progressText, setProgressText] = useState('')
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryError, setNewCategoryError] = useState('')
  const [categoryTargetDraftId, setCategoryTargetDraftId] = useState<string | null>(null)
  const [previewDraft, setPreviewDraft] = useState<(typeof drafts)[number] | null>(null)
  const [filter, setFilter] = useState<DraftFilter>('todos')

  const isPersonalizadosDraft = (draft: (typeof drafts)[number]) => {
    return getDraftCategoryLabel(draft.categoria, categorias).trim().toLowerCase() === 'personalizado'
  }

  const completeDrafts = useMemo(
    () =>
      drafts.filter((draft) =>
        isDraftComplete(draft, {
          allowZeroPrice: isPersonalizadosDraft(draft),
        }),
      ),
    [drafts, categorias],
  )
  const completeDraftIds = useMemo(() => new Set(completeDrafts.map((draft) => draft.id)), [completeDrafts])
  const incompleteDrafts = useMemo(
    () => drafts.filter((draft) => !completeDraftIds.has(draft.id)),
    [completeDraftIds, drafts],
  )
  const visibleDrafts = useMemo(() => {
    if (filter === 'listos') return drafts.filter((draft) => completeDraftIds.has(draft.id))
    if (filter === 'incompletos') return incompleteDrafts
    return drafts
  }, [completeDraftIds, drafts, filter, incompleteDrafts])

  const canSave =
    !isSaving &&
    drafts.length > 0 &&
    completeDrafts.length > 0 &&
    Boolean(empresaID?.trim()) &&
    categorias.length > 0

  const openNewCategoryDialog = (draftId?: string) => {
    setCategoryTargetDraftId(draftId ?? null)
    setNewCategoryName('')
    setNewCategoryError('')
    setIsCategoryDialogOpen(true)
  }

  const closeNewCategoryDialog = () => {
    if (creatingCategoria) return
    setIsCategoryDialogOpen(false)
    setCategoryTargetDraftId(null)
    setNewCategoryError('')
  }

  const handleCreateCategoria = async () => {
    const nombre = newCategoryName.trim()
    if (!nombre) {
      setNewCategoryError('Escribe un nombre de categoria.')
      return
    }

    if (categorias.some((categoria) => categoria.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setNewCategoryError('Esa categoria ya existe.')
      return
    }

    try {
      const created = await createCategoria(nombre)

      if (categoryTargetDraftId) {
        updateDraft(categoryTargetDraftId, { categoria: String(created.idCategoria) })
      }

      setIsCategoryDialogOpen(false)
      setCategoryTargetDraftId(null)
      setNewCategoryName('')
      setNewCategoryError('')
      setSaveError('')
    } catch (error) {
      setNewCategoryError(
        error instanceof Error ? error.message : 'No se pudo crear la categoria en este momento.',
      )
    }
  }

  const showIncompleteDrafts = () => {
    setFilter('incompletos')
    window.setTimeout(() => {
      const firstInvalid = incompleteDrafts[0]
      if (!firstInvalid) return
      const element = document.getElementById(`draft-${firstInvalid.id}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const focusTarget = element?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')
      focusTarget?.focus()
    }, 0)
  }

  const onSave = async () => {
    if (!empresaID?.trim()) {
      setSaveError('No pudimos identificar tu tienda. Cierra sesion y vuelve a entrar.')
      return
    }

    if (categorias.length === 0) {
      setSaveError('No hay categorias disponibles para guardar productos.')
      return
    }

    if (completeDrafts.length === 0) {
      setSaveError('Completa al menos nombre y precio en un producto para guardarlo.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    setSaveSuccess('')

    let okCount = 0
    const savedIds: string[] = []
    const createdProducts: CreatedProduct[] = []
    const createdCodes: string[] = []

    for (let index = 0; index < completeDrafts.length; index += 1) {
      const draft = completeDrafts[index]
      setProgressText(`Guardando ${index + 1} de ${completeDrafts.length}`)
      setSaveMetaById((prev) => ({ ...prev, [draft.id]: { state: 'saving' } }))

      try {
        const fileValidationError = validateImageFile(draft.file)
        if (fileValidationError) {
          throw new Error(fileValidationError)
        }

        const result = await createProductWithImage(
          empresaID.trim(),
          {
            name: draft.nombre.trim(),
            price: parsePrice(draft.precio),
            category_id: Number(draft.categoria || categorias[0].idCategoria),
            description: draft.descripcion.trim() || '.',
          },
          draft.file,
          () => undefined,
        )

        let createdEstado = draft.estado
        try {
          await persistCreatedStatus(result.id, empresaID.trim(), draft.estado)
        } catch {
          createdEstado = 'activo'
        }

        okCount += 1
        savedIds.push(draft.id)
        createdCodes.push(result.codigo_producto)
        createdProducts.push({
          backend_id: result.id,
          image_url: result.imagenUrl || draft.preview,
          nombre: draft.nombre.trim(),
          precio: parsePrice(draft.precio),
          estado: createdEstado,
          categoria: draft.categoria,
          descripcion: draft.descripcion.trim(),
          codigo_producto: result.codigo_producto,
        })
        setSaveMetaById((prev) => ({ ...prev, [draft.id]: { state: 'saved' } }))
      } catch (error) {
        setSaveMetaById((prev) => ({
          ...prev,
          [draft.id]: {
            state: 'error',
            message: error instanceof Error ? error.message : 'No se pudo guardar.',
          },
        }))
      }
    }

    if (savedIds.length > 0) {
      removeDrafts(savedIds)
      onCreatedBatch?.(createdProducts)
    }

    if (okCount > 0) {
      const codeLine =
        createdCodes.length === 1
          ? `Codigo generado: ${createdCodes[0]}`
          : `Codigos generados: ${createdCodes.join(', ')}`
      setSaveSuccess(`Producto creado correctamente\n${codeLine}`)
    }

    if (okCount < completeDrafts.length) {
      setSaveError('Algunos productos no se pudieron guardar. Revisa los que quedaron en la lista.')
    }

    setProgressText('')
    setIsSaving(false)
  }

  return (
    <section className="pc-shell" aria-label="Creacion de productos">
      <div className="pc-page-header">
        <div className="pc-page-header__icon">
          <BoxIcon />
        </div>
        <div className="pc-page-header__copy">
          <p className="pc-kicker">Productos</p>
          <h2 className="pc-title">Crear productos</h2>
          <p className="pc-subtitle">Sube imagenes, completa la informacion y publicalas en lote.</p>
        </div>
        <div className="pc-flow" aria-label="Flujo de creacion">
          <span className="is-active"><b>1</b> Subir imagenes</span>
          <span className={drafts.length > 0 ? 'is-active' : ''}><b>2</b> Completar datos</span>
          <span className={completeDrafts.length > 0 ? 'is-active' : ''}><b>3</b> Publicar</span>
        </div>
      </div>

      <div className="pc-layout">
        <section className="pc-panel pc-panel--upload">
          <div className="pc-section-head">
            <span className="pc-section-head__icon">
              <ImageIcon />
            </span>
            <div>
              <h3>Subir imagenes</h3>
              <small>Arrastra, suelta o selecciona archivos</small>
            </div>
          </div>

          <UploadArea
            disabled={isSaving}
            slotsLeft={slotsLeft}
            maxPhotos={MAX_PRODUCTS}
            onUpload={handleImageUpload}
            onCreateCategory={() => openNewCategoryDialog()}
          />
        </section>

        <section className="pc-panel pc-panel--preview">
          <div className="pc-section-head">
            <span className="pc-section-head__icon pc-section-head__icon--blue">
              <ListIcon />
            </span>
            <div>
              <h3>Completar productos</h3>
              <small>Revisa y completa la informacion de cada producto.</small>
            </div>
            <div className="pc-preview-tools">
              <div className="pc-filter-tabs" aria-label="Filtrar productos">
                <button type="button" className={filter === 'todos' ? 'is-active' : ''} onClick={() => setFilter('todos')}>
                  Todos {drafts.length}
                </button>
                <button type="button" className={filter === 'listos' ? 'is-active' : ''} onClick={() => setFilter('listos')}>
                  Listos {completeDrafts.length}
                </button>
                <button
                  type="button"
                  className={filter === 'incompletos' ? 'is-active' : ''}
                  onClick={() => setFilter('incompletos')}
                >
                  Incompletos {incompleteDrafts.length}
                </button>
              </div>
              <button type="button" className="pc-icon-menu" aria-label="Opciones de vista">
                ...
              </button>
            </div>
          </div>

          <ProductPreviewList
            drafts={visibleDrafts}
            disabled={isSaving}
            categories={categorias}
            categoryLoading={categoriasLoading}
            saveMetaById={saveMetaById}
            onRequestNewCategory={openNewCategoryDialog}
            onPreviewImage={setPreviewDraft}
            onCommit={updateDraft}
            onRemove={removeDraft}
          />
        </section>
      </div>

      {saveSuccess ? <p className="pc-alert pc-alert--success">{saveSuccess}</p> : null}
      {saveError ? <p className="pc-alert pc-alert--error">{saveError}</p> : null}
      {categoriasError ? <p className="pc-alert pc-alert--error">{categoriasError}</p> : null}

      <ProductActionsFooter
        isSaving={isSaving}
        readyCount={completeDrafts.length}
        totalCount={drafts.length}
        incompleteCount={incompleteDrafts.length}
        canSave={canSave}
        progressText={progressText}
        onShowIncomplete={showIncompleteDrafts}
        onSave={onSave}
      />

      <NewCategoryDialog
        open={isCategoryDialogOpen}
        nombre={newCategoryName}
        error={newCategoryError}
        isSaving={creatingCategoria}
        onNombreChange={(value) => {
          setNewCategoryName(value)
          if (newCategoryError) setNewCategoryError('')
        }}
        onCancel={closeNewCategoryDialog}
        onSubmit={() => void handleCreateCategoria()}
      />

      {previewDraft ? (
        <div className="pc-image-preview" role="dialog" aria-modal="true" aria-label="Vista previa de imagen">
          <button type="button" className="pc-image-preview__backdrop" onClick={() => setPreviewDraft(null)} />
          <div className="pc-image-preview__panel">
            <button type="button" className="pc-image-preview__close" onClick={() => setPreviewDraft(null)}>
              Cerrar
            </button>
            <img src={previewDraft.preview} alt={previewDraft.nombre || 'Producto'} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
