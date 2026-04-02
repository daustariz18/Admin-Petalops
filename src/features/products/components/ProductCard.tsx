import { memo, useEffect, useState } from 'react'
import type { Categoria } from '../../../hooks/useCategorias'
import type { DraftProduct, DraftSaveMeta } from '../types'
import { formatPrice, getMissingFields, isDraftComplete } from '../types'

type ProductCardProps = {
  draft: DraftProduct
  disabled: boolean
  categoryLoading: boolean
  categories: Categoria[]
  saveMeta?: DraftSaveMeta
  onRequestNewCategory: (draftId: string) => void
  onCommit: (
    draftId: string,
    patch: Partial<Omit<DraftProduct, 'id' | 'file' | 'fileKey' | 'preview'>>,
  ) => void
  onRemove: (draftId: string) => void
}

function ProductCardBase({
  draft,
  disabled,
  categoryLoading,
  categories,
  saveMeta,
  onRequestNewCategory,
  onCommit,
  onRemove,
}: ProductCardProps) {
  const [nombre, setNombre] = useState(draft.nombre)
  const [precio, setPrecio] = useState(draft.precio)
  const [categoria, setCategoria] = useState(draft.categoria)

  useEffect(() => {
    setNombre(draft.nombre)
    setPrecio(draft.precio)
    setCategoria(draft.categoria)
  }, [draft.id, draft.nombre, draft.precio, draft.categoria])

  const isComplete = isDraftComplete({ ...draft, nombre, precio })
  const missing = getMissingFields({ ...draft, nombre, precio })

  const commitNombre = () => {
    if (nombre !== draft.nombre) {
      onCommit(draft.id, { nombre })
    }
  }

  const commitPrecio = () => {
    const normalized = precio.replace(/\D/g, '')
    if (normalized !== draft.precio) {
      onCommit(draft.id, { precio: normalized })
    }
  }

  const onCategoriaChange = (value: string) => {
    setCategoria(value)
    onCommit(draft.id, { categoria: value })
  }

  return (
    <article className={`pc-product-card ${isComplete ? 'is-complete' : 'is-incomplete'}`}>
      <div className="pc-product-card__media">
        {draft.preview ? <img src={draft.preview} alt="producto" loading="lazy" /> : <div>Sin imagen</div>}
      </div>

      <div className="pc-product-card__body">
        <div className="pc-product-card__status">
          <span className={`pc-status-chip ${isComplete ? 'ok' : 'warn'}`}>
            {isComplete ? 'Completo' : `Falta: ${missing.join(', ')}`}
          </span>
          {saveMeta?.state === 'saving' ? <span className="pc-saving-chip">Guardando...</span> : null}
          {saveMeta?.state === 'saved' ? <span className="pc-saved-chip">Listo</span> : null}
        </div>

        <input
          className="pc-input"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          onBlur={commitNombre}
          disabled={disabled}
          placeholder="Nombre del producto"
        />

        <input
          className="pc-input"
          value={formatPrice(precio)}
          onChange={(event) => setPrecio(event.target.value.replace(/\D/g, ''))}
          onBlur={commitPrecio}
          disabled={disabled}
          inputMode="numeric"
          placeholder="Precio (COP)"
        />

        <select
          className="pc-input"
          value={categoria}
          onChange={(event) => {
            const nextValue = event.target.value
            if (nextValue === '__new__') {
              onRequestNewCategory(draft.id)
              return
            }
            onCategoriaChange(nextValue)
          }}
          disabled={disabled || categoryLoading}
        >
          <option value="">Categoria</option>
          {categories.map((categoriaItem) => (
            <option key={categoriaItem.idCategoria} value={String(categoriaItem.idCategoria)}>
              {categoriaItem.nombre}
            </option>
          ))}
          <option value="__new__">+ Crear categoria</option>
        </select>

        {saveMeta?.state === 'error' ? <p className="pc-card-error">{saveMeta.message}</p> : null}

        <button
          type="button"
          className="pc-remove-btn"
          onClick={() => onRemove(draft.id)}
          disabled={disabled}
        >
          Eliminar
        </button>
      </div>
    </article>
  )
}

export const ProductCard = memo(ProductCardBase)

