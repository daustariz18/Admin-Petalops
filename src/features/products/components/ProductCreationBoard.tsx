import { useEffect, useMemo, useState } from 'react'
import { NewCategoryDialog } from '../../../components/NewCategoryDialog'
import { createProductWithImage, validateImageFile } from '../../../services/productService'
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

type CreatedProduct = Omit<ProductItem, 'id'> & {
  backend_id?: number
  codigo_producto?: string
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

  useEffect(() => {
    if (categorias.length === 0) return

    drafts.forEach((draft) => {
      if (!draft.categoria) {
        updateDraft(draft.id, { categoria: String(categorias[0].idCategoria) })
      }
    })
  }, [categorias, drafts, updateDraft])

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
      const createdId = String(created.idCategoria)

      if (categoryTargetDraftId) {
        updateDraft(categoryTargetDraftId, { categoria: createdId })
      } else {
        drafts.forEach((draft) => {
          if (!draft.categoria) {
            updateDraft(draft.id, { categoria: createdId })
          }
        })
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

        okCount += 1
        savedIds.push(draft.id)
        createdCodes.push(result.codigo_producto)
        createdProducts.push({
          backend_id: result.id,
          image_url: result.imagenUrl || draft.preview,
          nombre: draft.nombre.trim(),
          precio: parsePrice(draft.precio),
          estado: 'activo',
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
        <div className="pc-page-header__copy">
          <p className="pc-kicker">Productos</p>
          <h2 className="pc-title">Crear productos</h2>
          <p className="pc-subtitle">
            Flujo visual para subir imagenes, revisar la vista previa, editar los datos y guardar sin perder el contexto.
          </p>
        </div>
        <div className="pc-page-header__summary">
          <span className="pc-summary-badge">{completeDrafts.length > 0 ? 'Completado' : 'En progreso'}</span>
          <div className="pc-summary-card">
            <strong>{drafts.length}</strong>
            <span>imagenes cargadas</span>
          </div>
          <div className="pc-summary-card">
            <strong>{completeDrafts.length}</strong>
            <span>listas para guardar</span>
          </div>
        </div>
      </div>

      <div className="pc-layout">
        <section className="pc-panel pc-panel--upload">
          <div className="pc-section-head">
            <div>
              <p className="pc-section-head__label">Subir</p>
              <h3>Arrastra, suelta y empieza</h3>
            </div>
            <button
              type="button"
              className="pc-btn pc-btn--ghost"
              onClick={() => openNewCategoryDialog()}
              disabled={isSaving}
            >
              Nueva categoria
            </button>
          </div>

          <UploadArea
            disabled={isSaving}
            slotsLeft={slotsLeft}
            maxPhotos={MAX_PRODUCTS}
            onUpload={handleImageUpload}
          />
        </section>

        <section className="pc-panel pc-panel--preview">
          <div className="pc-section-head">
            <div>
              <p className="pc-section-head__label">Ver y editar</p>
              <h3>Vista previa y edicion</h3>
            </div>
            <span className="pc-section-head__count">{completeDrafts.length} listo(s)</span>
          </div>

          <ProductPreviewList
            drafts={drafts}
            disabled={isSaving}
            categories={categorias}
            categoryLoading={categoriasLoading}
            saveMetaById={saveMetaById}
            onRequestNewCategory={(draftId) => openNewCategoryDialog(draftId)}
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
        disabledCategory={!empresaID?.trim()}
        canSave={canSave}
        progressText={progressText}
        onCreateCategory={() => openNewCategoryDialog()}
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
    </section>
  )
}
