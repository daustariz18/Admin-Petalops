import axios from 'axios'
import { clearStoredToken, getStoredToken } from '../auth/authStorage'

const RAW_API = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const API = import.meta.env.DEV ? '' : RAW_API || 'http://localhost:8000'

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export const apiClient = axios.create({
  baseURL: API,
  withCredentials: true,
})

function assertJsonContentType(contentType: string | null | undefined): void {
  if (!contentType?.includes('application/json')) {
    throw new Error('API returned HTML instead of JSON')
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (response.status !== 204) {
      const contentType = response.headers['content-type'] as string | undefined
      assertJsonContentType(contentType)
    }

    return response
  },
  (error) => {
    const status = error?.response?.status as number | undefined

    if (status === 401) {
      clearStoredToken()
      onUnauthorized?.()
    }

    return Promise.reject(error)
  },
)
