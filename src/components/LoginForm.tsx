import { useState, type FormEvent } from 'react'
import { AxiosError } from 'axios'
import { apiClient } from '../services/apiClient'
import { useAuth } from '../hooks/useAuth'

type LoginResponse = {
  token?: string
  accessToken?: string
  access_token?: string
  jwt?: string
}

export function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const emailValue = email.trim()
      const loginPayloads = [
        { email: emailValue, password },
      ]

      let response: { data: LoginResponse } | null = null
      let lastError: unknown = null

      for (const payload of loginPayloads) {
        try {
          response = await apiClient.post<LoginResponse>('/auth/login', payload)
          break
        } catch (error) {
          lastError = error
        }
      }

      if (!response) {
        throw lastError instanceof Error ? lastError : new Error('No fue posible iniciar sesión.')
      }

      const token =
        response.data.token ||
        response.data.accessToken ||
        response.data.access_token ||
        response.data.jwt

      if (!token) {
        throw new Error('La API no devolvio token en /auth/login.')
      }

      login(token)
    } catch (error) {
      if (error instanceof AxiosError) {
        const message =
          typeof error.response?.data?.detail === 'string'
            ? error.response.data.detail
            : error.message

        setError(message || 'No fue posible iniciar sesion.')
      } else if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('No fue posible iniciar sesion.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
      <h2>Iniciar sesion</h2>
      <p className="subtitle">Accede para abrir tu dashboard de tenant.</p>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="diego@petalops.test"
          required
          autoComplete="email"
          disabled={loading}
        />
      </label>

      <label className="field">
        <span>Contrasena</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </label>

      {error ? (
        <div className="pcf-error" role="alert">
          <p className="pcf-error__message">{error}</p>
        </div>
      ) : null}

      <button type="submit" className="pcf-btn pcf-btn--primary" disabled={loading}>
        {loading ? 'Ingresando...' : 'Entrar'}
      </button>
    </form>
  )
}
