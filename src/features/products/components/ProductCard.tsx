import { memo, useRef, useState } from 'react'
import type { Categoria } from '../../../hooks/useCategorias'
import type { DraftProduct, DraftSaveMeta } from '../types'
import { formatPrice, getDraftCategoryLabel, getMissingFields, isDraftComplete } from '../types'

type ProductCardProps = {
  draft: DraftProduct
  disabled: boolean
  categoryLoading: boolean
  categories: Categoria[]
  index: number
  saveMeta?: DraftSaveMeta
  onRequestNewCategory: (draftId: string) => void
  onPreviewImage: (draft: DraftProduct) => void
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
  index,
  saveMeta,
  onRequestNewCategory,
  onPreviewImage,
  onCommit,
  onRemove,
}: ProductCardProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const allowZeroPrice =
    getDraftCategoryLabel(draft.categoria, categories).trim().toLowerCase() === 'personalizado'
  const complete = isDraftComplete(draft, { allowZeroPrice })
  const missing = getMissingFields(draft, { allowZeroPrice })
  const hasNameError = missing.includes('nombre')
  const hasCategoryError = missing.includes('categoria')
  const hasPriceError = missing.includes('precio')
  const validationLabel = complete
    ? 'Listo'
    : `Incompleto - ${missing.length} ${missing.length === 1 ? 'pendiente' : 'pendientes'}`

  const removeWithConfirm = () => {
    if (window.confirm('Eliminar este producto de la carga?')) {
      onRemove(draft.id)
    }
  }

  return (
    <article id={`draft-${draft.id}`} className={`pc-product-row ${complete ? 'is-complete' : 'is-incomplete'}`}>
      <div className="pc-product-row__media">
        <span className="pc-product-row__index">{index + 1}</span>
        {draft.preview ? (
          <button
            type="button"
            className="pc-product-row__image-button"
            onClick={() => onPreviewImage(draft)}
            aria-label="Ver imagen ampliada"
          >
            <img src={draft.preview} alt={draft.nombre || 'producto'} className="pc-product-row__image" />
          </button>
        ) : (
          <div className="pc-product-row__empty-media">Sin imagen</div>
        )}
      </div>

      <div className="pc-field pc-field--name">
        <label className="pc-field__label" htmlFor={`product-name-${draft.id}`}>
          Nombre
        </label>
        <input
          ref={nameRef}
          id={`product-name-${draft.id}`}
          className={`pc-field__input ${hasNameError ? 'is-error' : ''}`}
          value={draft.nombre}
          onChange={(event) => onCommit(draft.id, { nombre: event.target.value })}
          disabled={disabled}
          placeholder="Nombre del producto"
          aria-invalid={hasNameError}
        />
        {hasNameError ? <span className="pc-field__error">Falta nombre</span> : null}
      </div>

      <div className="pc-field">
        <label className="pc-field__label" htmlFor={`product-category-${draft.id}`}>
          Categoria
        </label>
        <select
          id={`product-category-${draft.id}`}
          className={`pc-field__input ${hasCategoryError ? 'is-error' : ''}`}
          value={draft.categoria}
          onChange={(event) => {
            const nextValue = event.target.value
            if (nextValue === '__new__') {
              onRequestNewCategory(draft.id)
              return
            }
            onCommit(draft.id, { categoria: nextValue })
          }}
          disabled={disabled || categoryLoading}
          aria-invalid={hasCategoryError}
        >
          <option value="">Seleccionar categoria</option>
          {categories.map((categoriaItem) => (
            <option key={categoriaItem.idCategoria} value={String(categoriaItem.idCategoria)}>
              {categoriaItem.nombre}
            </option>
          ))}
          <option value="__new__">+ Crear nueva categoria</option>
        </select>
        {hasCategoryError ? <span className="pc-field__error">Falta categoria</span> : null}
      </div>

      <div className="pc-field">
        <label className="pc-field__label" htmlFor={`product-price-${draft.id}`}>
          Precio
        </label>
        <input
          id={`product-price-${draft.id}`}
          className={`pc-field__input ${hasPriceError ? 'is-error' : ''}`}
          value={formatPrice(draft.precio)}
          onChange={(event) => onCommit(draft.id, { precio: event.target.value.replace(/\D/g, '') })}
          disabled={disabled}
          inputMode="numeric"
          placeholder="$ 0"
          aria-invalid={hasPriceError}
        />
        {hasPriceError ? <span className="pc-field__error">Falta precio</span> : null}
      </div>

      <div className="pc-field pc-field--state">
        <label className="pc-field__label" htmlFor={`product-status-${draft.id}`}>
          Visibilidad
        </label>
        <select
          id={`product-status-${draft.id}`}
          className="pc-field__input"
          value={draft.estado}
          onChange={(event) => onCommit(draft.id, { estado: event.target.value as DraftProduct['estado'] })}
          disabled={disabled}
        >
          <option value="activo">Visible en catalogo</option>
          <option value="inactivo">Oculto</option>
        </select>
      </div>

      <div className="pc-validation">
        <span className={`pc-badge ${complete ? 'pc-badge--success' : 'pc-badge--warning'}`}>
          {validationLabel}
        </span>
        <button
          type="button"
          className="pc-description-toggle"
          onClick={() => setIsDescriptionOpen((current) => !current)}
          disabled={disabled}
        >
          {draft.descripcion.trim() ? 'Editar descripcion' : 'Agregar descripcion'}
        </button>
        {saveMeta?.state === 'saving' ? <span className="pc-save-state">Guardando</span> : null}
        {saveMeta?.state === 'saved' ? <span className="pc-save-state">Guardado</span> : null}
        {saveMeta?.state === 'error' ? <span className="pc-inline-error">{saveMeta.message}</span> : null}
      </div>

      <details className="pc-row-actions">
        <summary aria-label="Acciones del producto">...</summary>
        <div className="pc-row-actions__menu">
          <button type="button" onClick={() => nameRef.current?.focus()} disabled={disabled}>
            Editar nombre
          </button>
          <button type="button" className="is-danger" onClick={removeWithConfirm} disabled={disabled}>
            Eliminar
          </button>
        </div>
      </details>

      {isDescriptionOpen ? (
        <label className="pc-field pc-field--description">
          <span className="pc-field__label">Descripcion</span>
          <textarea
            id={`product-description-${draft.id}`}
            className="pc-field__input pc-field__textarea"
            value={draft.descripcion}
            onChange={(event) => onCommit(draft.id, { descripcion: event.target.value })}
            disabled={disabled}
            rows={2}
            placeholder="Opcional"
          />
        </label>
      ) : null}
    </article>
  )
}

export const ProductCard = memo(ProductCardBase)
