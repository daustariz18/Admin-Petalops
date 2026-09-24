import { apiClient } from './apiClient'

const COMPANY_LOGO_PREFIX = 'petalops.company-logo.'

type CompanyLogoUploadResponse = {
  empresaId?: string | number
  empresaSlug?: string
  logoS3Key?: string
  logoUrl: string
  contentType?: string
}

function buildKey(empresaID: string): string {
  return `${COMPANY_LOGO_PREFIX}${empresaID.trim()}`
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCompanyLogoResponse(payload: unknown): CompanyLogoUploadResponse | null {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Record<string, unknown>
  const nested = source.data && typeof source.data === 'object' ? (source.data as Record<string, unknown>) : null
  const merged = nested ? { ...source, ...nested } : source
  const logoUrl = toStringOrEmpty(merged.logoUrl) || toStringOrEmpty(merged.logo_url)

  if (!logoUrl) return null

  return {
    empresaId: (merged.empresaId ?? merged.empresaID ?? merged.empresa_id) as string | number | undefined,
    empresaSlug: toStringOrEmpty(merged.empresaSlug) || toStringOrEmpty(merged.empresa_slug) || undefined,
    logoS3Key: toStringOrEmpty(merged.logoS3Key) || toStringOrEmpty(merged.logo_s3_key) || undefined,
    logoUrl,
    contentType: toStringOrEmpty(merged.contentType) || toStringOrEmpty(merged.content_type) || undefined,
  }
}

export function getStoredCompanyLogo(empresaID: string): string {
  const normalizedEmpresaID = empresaID.trim()
  if (!normalizedEmpresaID) return ''

  try {
    return window.localStorage.getItem(buildKey(normalizedEmpresaID)) ?? ''
  } catch {
    return ''
  }
}

export function setStoredCompanyLogo(empresaID: string, logoUrl: string): void {
  const normalizedEmpresaID = empresaID.trim()
  if (!normalizedEmpresaID || !logoUrl.trim()) return

  window.localStorage.setItem(buildKey(normalizedEmpresaID), logoUrl)
}

export async function uploadCompanyLogo(input: { file: File }): Promise<CompanyLogoUploadResponse> {
  const formData = new FormData()
  formData.append('file', input.file)

  const response = await apiClient.patch('/admin/empresa/logo', formData)
  const normalized = normalizeCompanyLogoResponse(response.data)

  if (!normalized) {
    throw new Error('El backend no devolvio logoUrl para mostrar el logo.')
  }

  return normalized
}
