import type { Categoria } from '../../../hooks/useCategorias'
import type { DraftProduct, DraftSaveMeta } from '../types'
import { ProductCard } from './ProductCard'

type ProductPreviewListProps = {
  drafts: DraftProduct[]
  disabled: boolean
  categoryLoading: boolean
  categories: Categoria[]
  saveMetaById: Record<string, DraftSaveMeta>
  onRequestNewCategory: (draftId: string) => void
  onCommit: (
    draftId: string,
    patch: Partial<Omit<DraftProduct, 'id' | 'file' | 'fileKey' | 'preview'>>,
  ) => void
  onRemove: (draftId: string) => void
}

export function ProductPreviewList({
  drafts,
  disabled,
  categoryLoading,
  categories,
  saveMetaById,
  onRequestNewCategory,
  onCommit,
  onRemove,
}: ProductPreviewListProps) {
  if (drafts.length === 0) {
    return (
      <div className="pc-empty-state" role="status">
        <div className="pc-empty-state__art">
          <span />
          <span />
          <span />
        </div>
        <h3>Sube imagenes para comenzar</h3>
        <p>Veras una vista previa inmediata para editar nombre, precio y categoria antes de guardar.</p>
      </div>
    )
  }

  return (
    <section className="pc-preview-grid" aria-label="Vista previa de productos">
      {drafts.map((draft) => (
        <ProductCard
          key={draft.id}
          draft={draft}
          disabled={disabled}
          categoryLoading={categoryLoading}
          categories={categories}
          saveMeta={saveMetaById[draft.id]}
          onRequestNewCategory={onRequestNewCategory}
          onCommit={onCommit}
          onRemove={onRemove}
        />
      ))}
    </section>
  )
}
