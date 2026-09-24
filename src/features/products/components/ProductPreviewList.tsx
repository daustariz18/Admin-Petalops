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
  onPreviewImage: (draft: DraftProduct) => void
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
  onPreviewImage,
  onCommit,
  onRemove,
}: ProductPreviewListProps) {
  if (drafts.length === 0) {
    return (
      <div className="pc-empty-state" role="status">
        <span className="pc-empty-state__icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <h3>Sube imagenes para comenzar</h3>
        <p>Cada imagen creara una fila editable donde podras completar nombre, categoria, precio y disponibilidad.</p>
      </div>
    )
  }

  return (
    <section className="pc-product-rows" aria-label="Productos editables">
      {drafts.map((draft, index) => (
        <ProductCard
          key={draft.id}
          draft={draft}
          index={index}
          disabled={disabled}
          categoryLoading={categoryLoading}
          categories={categories}
          saveMeta={saveMetaById[draft.id]}
          onRequestNewCategory={onRequestNewCategory}
          onPreviewImage={onPreviewImage}
          onCommit={onCommit}
          onRemove={onRemove}
        />
      ))}
    </section>
  )
}
