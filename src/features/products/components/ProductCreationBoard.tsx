import { useEffect, useMemo, useState } from 'react'
import { NewCategoryDialog } from '../../../components/NewCategoryDialog'
import { useCategorias } from '../../../hooks/useCategorias'
import { createProductWithImage } from '../../../services/productService'
import type { DraftSaveMeta } from '../types'
import { isDraftComplete, parsePrice } from '../types'
import { useProductDrafts } from '../hooks/useProductDrafts'
import type { ProductItem } from '../useProducts'
import { ProductActionsFooter } from './ProductActionsFooter'
import { ProductPreviewList } from './ProductPreviewList'
import { UploadArea } from './UploadArea'
import './product-creation.css'

const MAX_PRODUCTS = 60

type ProductCreationBoardProps = {
  empresaID?: string
  onCreatedBatch?: (products: Array<Omit<ProductItem, 'id'>>) => void
}

export const ProductCreationBoard = ({ empresaID, onCreatedBatch }: ProductCreationBoardProps) => {
  const { categorias, categoriasLoading, categoriasError, creatingCategoria, createCategoria } =
    useCategorias(empresaID)
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

  const completeDrafts = useMemo(() => drafts.filter((draft) => isDraftComplete(draft)), [drafts])

  const canSave =
    !isSaving && drafts.length > 0 && completeDrafts.length > 0 && Boolean(empresaID?.trim()) && categorias.length > 0

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
    const createdProducts: Array<Omit<ProductItem, 'id'>> = []

    for (let index = 0; index < completeDrafts.length; index += 1) {
      const draft = completeDrafts[index]
      setProgressText(`Guardando ${index + 1} de ${completeDrafts.length}`)
      setSaveMetaById((prev) => ({ ...prev, [draft.id]: { state: 'saving' } }))

      try {
        const result = await createProductWithImage(
          empresaID.trim(),
          {
            nombre: draft.nombre.trim(),
            precio: parsePrice(draft.precio),
            categoriaID: Number(draft.categoria || categorias[0].idCategoria),
            mimeType: draft.file.type,
            descripcion: draft.descripcion.trim() || '.',
          },
          draft.file,
          () => undefined,
        )

        okCount += 1
        savedIds.push(draft.id)
        createdProducts.push({
          image_url: result.imagenUrl || draft.preview,
          nombre: draft.nombre.trim(),
          precio: parsePrice(draft.precio),
          estado: 'activo',
          categoria: draft.categoria,
          descripcion: draft.descripcion.trim(),
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
      setSaveSuccess(`Listo. Se guardaron ${okCount} producto(s).`)
    }

    if (okCount < completeDrafts.length) {
      setSaveError('Algunos productos no se pudieron guardar. Revisa los que quedaron en la lista.')
    }

    setProgressText('')
    setIsSaving(false)
  }

  return (
    <section className="pc-create-flow" aria-label="Creacion masiva de productos">
      <UploadArea disabled={isSaving} slotsLeft={slotsLeft} maxPhotos={MAX_PRODUCTS} onUpload={handleImageUpload} />

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

      <ProductActionsFooter
        isSaving={isSaving}
        readyCount={completeDrafts.length}
        disabledCategory={!empresaID?.trim()}
        canSave={canSave}
        progressText={progressText}
        onCreateCategory={() => openNewCategoryDialog()}
        onSave={onSave}
      />

      {saveSuccess ? <p className="npf-success-note">{saveSuccess}</p> : null}
      {saveError ? <p className="npf-field-error">{saveError}</p> : null}
      {categoriasError ? <p className="npf-field-error">{categoriasError}</p> : null}

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
