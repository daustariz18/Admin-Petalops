import { useCallback, useRef, useState } from 'react'
import {
  confirmProductImage,
  createProduct,
  uploadToS3,
  validateImageFile,
} from '../services/productService'
import type {
  CreateProductRequest,
  CreateProductResult,
  CreateProductStep,
} from '../types/product'

// ── Tipos del hook ────────────────────────────────────────────────────────────

interface HookState {
  step: CreateProductStep
  progress: number
  stepLabel: string
  errorMessage: string
  result: CreateProductResult | null
  /** true solo cuando S3 ya subió ok pero la confirmación falló → reintento disponible. */
  canRetryConfirm: boolean
}

export interface UseCreateProductWithImageReturn extends HookState {
  /** Ejecuta el flujo completo: crear → subir → confirmar. */
  submit: (empresaID: string, payload: CreateProductRequest, file: File) => Promise<void>
  /** Reintenta únicamente el paso de confirmación (paso 3). */
  retryConfirm: () => Promise<void>
  /** Vuelve a idle limpiando todo el estado. */
  reset: () => void
}

// ── Mapas de progreso y etiquetas ─────────────────────────────────────────────

const STEP_PROGRESS: Record<CreateProductStep, number> = {
  idle: 0,
  creating: 20,
  uploading: 55,
  confirming: 85,
  success: 100,
  error: 0,
}

const STEP_LABELS: Record<CreateProductStep, string> = {
  idle: '',
  creating: 'Registrando producto en base de datos…',
  uploading: 'Subiendo imagen a S3…',
  confirming: 'Confirmando imagen en backend…',
  success: '¡Producto creado con éxito!',
  error: '',
}

// ── Datos de confirmación pendiente (para reintento) ─────────────────────────

interface PendingConfirm {
  empresaID: string
  productoID: number
  s3Key: string
  mimeType: string
  sizeBytes: number
}

const INITIAL_STATE: HookState = {
  step: 'idle',
  progress: 0,
  stepLabel: '',
  errorMessage: '',
  result: null,
  canRetryConfirm: false,
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateProductWithImage(): UseCreateProductWithImageReturn {
  const [state, setState] = useState<HookState>(INITIAL_STATE)

  // Ref en lugar de estado: los datos de confirmación no provocan re-render al guardarse.
  // Se mantienen entre renders para que retryConfirm siempre tenga acceso a ellos.
  const pendingConfirmRef = useRef<PendingConfirm | null>(null)

  const patch = useCallback((step: CreateProductStep, extra?: Partial<HookState>) => {
    setState({
      step,
      progress: STEP_PROGRESS[step],
      stepLabel: STEP_LABELS[step],
      errorMessage: '',
      result: null,
      canRetryConfirm: false,
      ...extra,
    })
  }, [])

  // ── Paso 3 aislado para poder reintentarlo sin repetir 1 y 2 ──────────────
  const runConfirm = useCallback(async () => {
    const pending = pendingConfirmRef.current
    if (!pending) return

    patch('confirming')

    try {
      const confirmed = await confirmProductImage(
        pending.empresaID,
        pending.productoID,
        {
          s3Key: pending.s3Key,
          mimeType: pending.mimeType,
          sizeBytes: pending.sizeBytes,
        },
      )

      // Solo limpiar ref si tuvo éxito.
      pendingConfirmRef.current = null

      patch('success', {
        result: {
          productoID: confirmed.productoID,
          imagenUrl: confirmed.imagenUrl,
          imagenS3Key: confirmed.imagenS3Key,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al confirmar.'
      // Mantenemos pendingConfirmRef intacto para que el usuario pueda reintentar.
      patch('error', { errorMessage: message, canRetryConfirm: true })
    }
  }, [patch])

  // ── Flujo completo ────────────────────────────────────────────────────────
  const submit = useCallback(
    async (empresaID: string, payload: CreateProductRequest, file: File) => {
      pendingConfirmRef.current = null

      // Validación cliente antes de tocar la red.
      const validationError = validateImageFile(file)
      if (validationError) {
        patch('error', { errorMessage: validationError })
        return
      }

      // Step 1 – crear producto
      patch('creating')
      let created: Awaited<ReturnType<typeof createProduct>>
      try {
        created = await createProduct(empresaID, payload)
      } catch (error) {
        patch('error', {
          errorMessage: error instanceof Error ? error.message : 'Error al crear el producto.',
        })
        return
      }

      // Step 2 – subir a S3
      patch('uploading')
      try {
        await uploadToS3(created.uploadUrl, file)
      } catch (error) {
        // S3 falló → NO guardamos pendingConfirm → reintento no disponible.
        patch('error', {
          errorMessage: error instanceof Error ? error.message : 'Error al subir la imagen a S3.',
        })
        return
      }

      // Step 3 – confirmar. Guardamos datos antes del await para que
      // retryConfirm funcione incluso si el usuario recarga el componente.
      pendingConfirmRef.current = {
        empresaID,
        productoID: created.productoID,
        s3Key: created.s3Key,
        mimeType: file.type,
        sizeBytes: file.size,
      }
      await runConfirm()
    },
    [patch, runConfirm],
  )

  const retryConfirm = useCallback(async () => {
    if (!pendingConfirmRef.current) return
    await runConfirm()
  }, [runConfirm])

  const reset = useCallback(() => {
    pendingConfirmRef.current = null
    setState(INITIAL_STATE)
  }, [])

  return { ...state, submit, retryConfirm, reset }
}
