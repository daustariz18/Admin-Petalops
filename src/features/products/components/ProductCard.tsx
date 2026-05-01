import { memo, useEffect, useRef, useState } from 'react'
import type { Categoria } from '../../../hooks/useCategorias'
import type { DraftProduct, DraftSaveMeta } from '../types'
import { formatPrice, getDraftCategoryLabel, getMissingFields, isDraftComplete } from '../types'

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
  const [descripcion, setDescripcion] = useState(draft.descripcion)
  const nameRef = useRef<HTMLInputElement>(null)
  const allowZeroPrice =
    getDraftCategoryLabel(categoria, categories).trim().toLowerCase() === 'personalizado'

  useEffect(() => {
    setNombre(draft.nombre)
    setPrecio(draft.precio)
    setCategoria(draft.categoria)
    setDescripcion(draft.descripcion)
  }, [draft.id, draft.nombre, draft.precio, draft.categoria, draft.descripcion])

  const complete = isDraftComplete({ ...draft, nombre, precio }, { allowZeroPrice })
  const missing = getMissingFields({ ...draft, nombre, precio }, { allowZeroPrice })

  const commitNombre = () => {
    if (nombre !== draft.nombre) onCommit(draft.id, { nombre })
  }

  const commitPrecio = () => {
    const normalized = precio.replace(/\D/g, '')
    if (normalized !== draft.precio) onCommit(draft.id, { precio: normalized })
  }

  const commitCategoria = (value: string) => {
    setCategoria(value)
    onCommit(draft.id, { categoria: value })
  }

  const commitDescripcion = () => {
    if (descripcion !== draft.descripcion) onCommit(draft.id, { descripcion })
  }

  return (
    <article className={`pc-product-card ${complete ? 'is-complete' : 'is-incomplete'}`}>
      <div className="pc-product-card__media">
        {draft.preview ? (
          <img src={draft.preview} alt={draft.nombre || 'producto'} className="pc-product-card__image" />
        ) : (
          <div className="pc-product-card__empty-media">Sin imagen</div>
        )}

        <div className="pc-product-card__media-overlay">
          <div className="pc-product-card__badges">
            <span className={`pc-badge ${complete ? 'pc-badge--success' : 'pc-badge--warning'}`}>
              {complete ? 'Completado' : `Faltan ${missing.join(', ')}`}
            </span>
            {saveMeta?.state === 'saving' ? <span className="pc-badge pc-badge--neutral">Guardando</span> : null}
            {saveMeta?.state === 'saved' ? <span className="pc-badge pc-badge--neutral">Listo</span> : null}
          </div>

          <div className="pc-product-card__media-actions">
            <button
              type="button"
              className="pc-icon-btn pc-icon-btn--light"
              onClick={() => nameRef.current?.focus()}
              disabled={disabled}
              aria-label="Editar producto"
            >
              Editar
            </button>
            <button
              type="button"
              className="pc-icon-btn pc-icon-btn--danger"
              onClick={() => onRemove(draft.id)}
              disabled={disabled}
              aria-label="Eliminar producto"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <div className="pc-product-card__body">
        <div className="pc-field">
          <label className="pc-field__label" htmlFor={`product-name-${draft.id}`}>
            Nombre
          </label>
          <input
            ref={nameRef}
            id={`product-name-${draft.id}`}
            className="pc-field__input"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            onBlur={commitNombre}
            disabled={disabled}
            placeholder="Nombre del producto"
          />
        </div>

        <div className="pc-field">
          <label className="pc-field__label" htmlFor={`product-price-${draft.id}`}>
            Precio
          </label>
          <input
            id={`product-price-${draft.id}`}
            className="pc-field__input"
            value={formatPrice(precio)}
            onChange={(event) => setPrecio(event.target.value.replace(/\D/g, ''))}
            onBlur={commitPrecio}
            disabled={disabled}
            inputMode="numeric"
            placeholder="Precio (COP)"
          />
        </div>

        <div className="pc-field">
          <label className="pc-field__label" htmlFor={`product-category-${draft.id}`}>
            Categoria
          </label>
          <select
            id={`product-category-${draft.id}`}
            className="pc-field__input"
            value={categoria}
            onChange={(event) => {
              const nextValue = event.target.value
              if (nextValue === '__new__') {
                onRequestNewCategory(draft.id)
                return
              }
              commitCategoria(nextValue)
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
        </div>

        <div className="pc-field">
          <label className="pc-field__label" htmlFor={`product-description-${draft.id}`}>
            Descripcion
          </label>
          <textarea
            id={`product-description-${draft.id}`}
            className="pc-field__input pc-field__textarea"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            onBlur={commitDescripcion}
            disabled={disabled}
            rows={3}
            placeholder="Descripcion (opcional)"
          />
        </div>

        <div className="pc-product-card__footer">
          <span className="pc-product-card__status">
            {complete ? 'Listo para guardar' : 'Completa los campos'}
          </span>
          <button
            type="button"
            className="pc-card-link"
            onClick={() => onRemove(draft.id)}
            disabled={disabled}
          >
            Eliminar
          </button>
        </div>
      </div>
    </article>
  )
}

export const ProductCard = memo(ProductCardBase)
