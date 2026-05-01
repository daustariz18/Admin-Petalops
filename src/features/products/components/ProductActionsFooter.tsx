type ProductActionsFooterProps = {
  isSaving: boolean
  readyCount: number
  disabledCategory: boolean
  canSave: boolean
  progressText: string
  onCreateCategory: () => void
  onSave: () => void
}

export function ProductActionsFooter({
  isSaving,
  readyCount,
  disabledCategory,
  canSave,
  progressText,
  onCreateCategory,
  onSave,
}: ProductActionsFooterProps) {
  return (
    <footer className="pc-actions-dock" aria-label="Acciones de guardado">
      <div className="pc-actions-dock__meta">
        <span className="pc-actions-dock__eyebrow">En progreso</span>
        <strong>{readyCount} producto(s) listo(s)</strong>
        <p>{progressText || 'Revisa la vista previa antes de guardar.'}</p>
      </div>

      <div className="pc-actions-dock__buttons">
        <button
          type="button"
          className="pc-btn pc-btn--secondary"
          disabled={isSaving || disabledCategory}
          onClick={onCreateCategory}
        >
          Nueva categoria
        </button>
        <button type="button" className="pc-btn pc-btn--primary" disabled={!canSave} onClick={onSave}>
          {isSaving ? 'Guardando productos...' : 'Guardar productos'}
        </button>
      </div>
    </footer>
  )
}
