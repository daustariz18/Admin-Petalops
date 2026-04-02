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
    <footer className="pc-actions-footer" aria-label="Acciones de guardado">
      <div className="pc-actions-footer__meta">
        <strong>{readyCount} producto(s) listo(s)</strong>
        {progressText ? <span>{progressText}</span> : <span>Revisa la vista previa antes de guardar.</span>}
      </div>

      <div className="pc-actions-footer__buttons">
        <button
          type="button"
          className="pcf-btn pcf-btn--ghost"
          disabled={isSaving || disabledCategory}
          onClick={onCreateCategory}
        >
          Nueva categoria
        </button>
        <button
          type="button"
          className="pcf-btn pcf-btn--primary npf-sticky-btn"
          disabled={!canSave}
          onClick={onSave}
        >
          {isSaving ? 'Guardando productos...' : 'Guardar productos'}
        </button>
      </div>
    </footer>
  )
}

