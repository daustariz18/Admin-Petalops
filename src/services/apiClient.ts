import axios from 'axios'
import { clearStoredToken, getStoredToken } from '../auth/authStorage'
import { getApiBaseUrl } from './apiUrl'

const API = getApiBaseUrl()

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
  if (!API) {
    return Promise.reject(new Error('La variable VITE_API_URL no esta configurada.'))
  }

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
