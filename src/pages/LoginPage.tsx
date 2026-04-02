import { FormEvent, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { apiClient } from '../services/apiClient'
import './LoginPage.css'

type FieldErrors = {
  email?: string
  password?: string
}

type LoginPageProps = {
  onAuthenticated?: (token: string) => void
}

type LoginResponse = {
  access_token?: string
}

const EMAIL_REGEX = /\S+@\S+\.\S+/

function inferTenantSlugFromEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  const atIndex = normalizedEmail.lastIndexOf('@')
  if (atIndex < 0 || atIndex === normalizedEmail.length - 1) {
    return ''
  }

  const domain = normalizedEmail.slice(atIndex + 1)
  const parts = domain.split('.').filter(Boolean)
  if (parts.length === 0) return ''
  return parts[0] ?? ''
}

function getApiErrorDetail(data: unknown): string | null {
  if (!data) return null
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return null

  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  return null
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6-10-6-10-6zm10 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.1 5.6A12.5 12.5 0 0 1 12 5c6.3 0 10 7 10 7a17 17 0 0 1-4.3 4.7M6.4 8.3A17.7 17.7 0 0 0 2 12s3.7 7 10 7c1.2 0 2.3-.2 3.4-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const hasEmailError = useMemo(() => Boolean(errors.email), [errors.email])
  const hasPasswordError = useMemo(() => Boolean(errors.password), [errors.password])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess(false)
    setErrors({})

    const nextErrors: FieldErrors = {}

    if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Ingresa un correo valido'
    }

    if (!password.trim()) {
      nextErrors.password = 'Correo o contrasena incorrectos'
    }

    const slug = inferTenantSlugFromEmail(email)
    if (!slug) {
      nextErrors.email = 'Ingresa un correo valido'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
        slug,
      })

      const token = response.data.access_token

      if (!token) {
        setErrors({ password: 'Correo o contrasena incorrectos' })
        setSuccess(false)
        return
      }

      setSuccess(true)
      setErrors({})
      window.setTimeout(() => {
        onAuthenticated?.(token)
      }, 250)
    } catch (error) {
      if (error instanceof AxiosError) {
        const detail = getApiErrorDetail(error.response?.data)
        setErrors({ password: detail || 'Correo o contrasena incorrectos' })
      } else {
        setErrors({ password: 'No se pudo iniciar sesion. Intenta nuevamente.' })
      }
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page" aria-label="Inicio de sesion Petalops">
      <section className="login-page__card">
        <header className="login-page__header">
          <div className="login-page__flower-box">
            <img
              src="https://ddy2osi8uorg4.cloudfront.net/tenants/petalops/logos/PetalOps+Logo.png"
              alt="Petalops"
              className="login-page__logo-img"
              loading="eager"
              decoding="async"
            />
          </div>

          <p className="login-page__brand">Petalops</p>
          <h1 className="login-page__title">Ingresa a tu tienda</h1>
          <p className="login-page__subtitle">
            Administra precios, disponibilidad y catalogo de tu floristeria.
          </p>
        </header>

        <form className="login-page__form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="login-page__field-group">
            <label htmlFor="email" className="login-page__label">
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`login-page__input ${hasEmailError ? 'is-error' : ''}`}
              placeholder="tu@floristeria.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              aria-invalid={hasEmailError}
              aria-describedby={hasEmailError ? 'login-email-error' : undefined}
            />
            <p id="login-email-error" className={`login-page__error ${hasEmailError ? 'is-visible' : ''}`}>
              {errors.email || 'Ingresa un correo valido'}
            </p>
          </div>

          <div className="login-page__field-group">
            <label htmlFor="password" className="login-page__label">
              Contrasena
            </label>
            <div className="login-page__password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`login-page__input login-page__input--password ${hasPasswordError ? 'is-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                aria-invalid={hasPasswordError}
                aria-describedby={hasPasswordError ? 'login-password-error' : undefined}
              />
              <button
                type="button"
                className="login-page__toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <p
              id="login-password-error"
              className={`login-page__error ${hasPasswordError ? 'is-visible' : ''}`}
            >
              {errors.password || 'Correo o contrasena incorrectos'}
            </p>
          </div>

          <button type="submit" className="login-page__submit" disabled={loading}>
            {loading ? (
              <span className="login-page__loading-wrap">
                <span className="login-page__spinner" aria-hidden="true" />
                Ingresando...
              </span>
            ) : (
              'Ingresar'
            )}
          </button>

          <div className={`login-page__success ${success ? 'is-visible' : ''}`} role="status" aria-live="polite">
            Acceso correcto - redirigiendo...
          </div>

          <a className="login-page__forgot" href="#" onClick={(event) => event.preventDefault()}>
            ¿Olvidaste tu contrasena?
          </a>
        </form>

        <footer className="login-page__footer">
          ¿Tu floristeria aun no esta en Petalops?{' '}
          <a href="#" onClick={(event) => event.preventDefault()}>
            Escribenos
          </a>
        </footer>
      </section>
    </main>
  )
}
