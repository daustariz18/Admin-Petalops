type ProductActionsFooterProps = {
  isSaving: boolean
  readyCount: number
  totalCount: number
  incompleteCount: number
  canSave: boolean
  progressText: string
  onShowIncomplete: () => void
  onSave: () => void
}

export function ProductActionsFooter({
  isSaving,
  readyCount,
  totalCount,
  incompleteCount,
  canSave,
  progressText,
  onShowIncomplete,
  onSave,
}: ProductActionsFooterProps) {
  return (
    <footer className="pc-actions-dock" aria-label="Acciones de guardado">
      <div className="pc-actions-dock__meta">
        <span className="pc-actions-dock__eyebrow">En progreso</span>
        <strong>{readyCount} de {totalCount} productos listos</strong>
        <p>{progressText || `${readyCount} productos listos · ${incompleteCount} quedaran pendientes en esta pantalla`}</p>
      </div>

      <div className="pc-actions-dock__hint">
        <p>Solo se publicaran los productos completos.</p>
        <span>Los incompletos no se eliminan.</span>
      </div>

      <div className="pc-actions-dock__buttons">
        <button
          type="button"
          className="pc-btn pc-btn--secondary"
          disabled={isSaving || incompleteCount === 0}
          onClick={onShowIncomplete}
        >
          Ver incompletos
        </button>
        <button type="button" className="pc-btn pc-btn--primary" disabled={!canSave} onClick={onSave}>
          {isSaving
            ? 'Guardando productos...'
            : `Publicar ${readyCount} ${readyCount === 1 ? 'producto' : 'productos'}`}
        </button>
      </div>
    </footer>
  )
}
