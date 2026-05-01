import { useState, type ChangeEvent, type DragEvent } from 'react'

type UploadAreaProps = {
  disabled: boolean
  slotsLeft: number
  maxPhotos: number
  onUpload: (files: File[]) => void
}

export function UploadArea({ disabled, slotsLeft, maxPhotos, onUpload }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const uploadedCount = maxPhotos - slotsLeft

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    onUpload(Array.from(event.dataTransfer.files))
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpload(event.target.files ? Array.from(event.target.files) : [])
    event.target.value = ''
  }

  return (
    <label
      className={`pc-dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || slotsLeft <= 0}
        onChange={onChange}
        aria-label="Subir fotos de productos"
        className="pc-dropzone__input"
      />

      <div className="pc-dropzone__icon">
        <span />
        <span />
      </div>

      <div className="pc-dropzone__copy">
        <p>Arrastra tus imagenes o haz clic para subir</p>
        <small>Sube fotos claras para crear tarjetas de producto mas limpias.</small>
      </div>

      <div className="pc-dropzone__actions">
        <span className="pc-dropzone__counter">
          {uploadedCount} / {maxPhotos} imagenes
        </span>
        <span className="pc-dropzone__button">Seleccionar archivos</span>
      </div>
    </label>
  )
}
