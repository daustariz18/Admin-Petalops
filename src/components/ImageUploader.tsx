import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  confirmUpload,
  getSignedUrl,
  uploadToS3,
  type UploadedImage,
} from '../services/uploadService'

type UploadState = 'idle' | 'requesting' | 'uploading' | 'success' | 'error'

type ImageUploaderProps = Readonly<{
  empresaID: string
  productoID: string
  maxSizeInMB?: number
  acceptedMimeTypes?: string[]
  esPrincipal?: boolean
  onUploadComplete?: (image: UploadedImage) => void
}>

export function ImageUploader({
  empresaID,
  productoID,
  maxSizeInMB = 5,
  acceptedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'],
  esPrincipal = true,
  onUploadComplete,
}: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<UploadState>('idle')
  const [message, setMessage] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  const acceptedExtensions = useMemo(() => {
    return acceptedMimeTypes
      .map((mime) => {
        const extension = mime.split('/')[1]
        return extension ? `.${extension}` : ''
      })
      .filter(Boolean)
      .join(',')
  }, [acceptedMimeTypes])

  const isBusy = status === 'requesting' || status === 'uploading'

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

  const validateFile = (file: File): string | null => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024

    if (!acceptedMimeTypes.includes(file.type)) {
      return `Formato no permitido. Tipos válidos: ${acceptedMimeTypes.join(', ')}`
    }

    if (file.size > maxSizeInBytes) {
      return `El archivo supera el tamaño máximo de ${maxSizeInMB} MB.`
    }

    return null
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFile(null)
      setStatus('idle')
      setMessage('')
      setProgress(0)
      return
    }

    setSelectedFile(file)

    if (!empresaID || !productoID) {
      setStatus('error')
      setMessage('Empresa ID y Producto ID son obligatorios para construir la key.')
      setProgress(0)
      return
    }

    const validationError = validateFile(file)

    if (validationError) {
      setStatus('error')
      setMessage(validationError)
      setProgress(0)
      return
    }

    try {
      setStatus('requesting')
      setMessage('Solicitando signed URL...')
      setProgress(20)

      const { uploadUrl, key } = await getSignedUrl({
        empresaID,
        productoID,
        fileType: file.type,
        fileName: file.name,
        sizeBytes: file.size,
      })

      setStatus('uploading')
      setMessage('Subiendo imagen a S3...')
      setProgress(55)

      await uploadToS3(uploadUrl, file)

      setMessage('Confirmando metadata en backend...')
      setProgress(85)

      const image = await confirmUpload(productoID, {
        empresaID,
        s3Key: key,
        mimeType: file.type,
        sizeBytes: file.size,
        esPrincipal,
      })

      setProgress(100)
      setStatus('success')
      setMessage('Imagen subida correctamente a S3.')
      onUploadComplete?.(image)
    } catch (error) {
      setStatus('error')
      setProgress(0)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al subir la imagen.',
      )
    }
  }

  return (
    <section className="uploader-card">
      <h2>Seleccionar imagen</h2>
      <p className="hint">Tamaño máximo: {maxSizeInMB} MB</p>

      <label className="file-input-wrapper">
        <span>Elegir archivo</span>
        <input
          type="file"
          accept={acceptedExtensions}
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </label>

      <p className="hint">Formatos permitidos: {acceptedMimeTypes.join(', ')}</p>

      {previewUrl ? (
        <div className="preview-wrapper">
          <img src={previewUrl} alt="Vista previa de imagen seleccionada" className="preview-image" />
        </div>
      ) : null}

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <progress value={progress} max={100} className="sr-only-progress">
        {progress}%
      </progress>
      <p className="hint">Progreso: {progress}%</p>

      <p className={`upload-status ${status}`}>
        {message || 'No hay archivo cargado todavía.'}
      </p>
    </section>
  )
}
