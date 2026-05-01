import { FormEvent, useState } from 'react'
import { buildApiUrl, hasApiBaseUrl } from '../services/apiUrl'
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
  detail?: string
}

const EMAIL_REGEX = /\S+@\S+\.\S+/

const PETALOPS_LOGO_CANDIDATES = [
  'https://ddy2osi8uorg4.cloudfront.net/tenants/petalops/logos/PetalOps+Logo.png',
  'https://ddy2osi8uorg4.cloudfront.net/tenants/petalops/logos/PetalOps%20Logo.png',
  'https://ddy2osi8uorg4.cloudfront.net/tenants/petalops/logos/logo.png',
  '/petalops-logo.svg',
]

function inferTenantSlugFromEmail(email: string): string {
  try {
    const domain = email.trim().toLowerCase().split('@')[1]
    if (!domain) return ''
    return domain.split('.')[0] ?? ''
  } catch {
    return ''
  }
}

function getSlugCandidates(email: string): string[] {
  const storedSlug = localStorage.getItem('slug')?.trim().toLowerCase() ?? ''
  const emailSlug = inferTenantSlugFromEmail(email).trim().toLowerCase()

  return Array.from(new Set([storedSlug, emailSlug].filter(Boolean)))
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

function FlowerIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="login-page__logo-fallback">
      <g fill="#D4477A">
        <ellipse cx="24" cy="10" rx="4.4" ry="7" />
        <ellipse cx="24" cy="38" rx="4.4" ry="7" />
        <ellipse cx="10" cy="24" rx="7" ry="4.4" />
        <ellipse cx="38" cy="24" rx="7" ry="4.4" />
        <ellipse cx="14.2" cy="14.2" rx="4.2" ry="6.5" transform="rotate(-45 14.2 14.2)" />
        <ellipse cx="33.8" cy="33.8" rx="4.2" ry="6.5" transform="rotate(-45 33.8 33.8)" />
        <ellipse cx="33.8" cy="14.2" rx="4.2" ry="6.5" transform="rotate(45 33.8 14.2)" />
        <ellipse cx="14.2" cy="33.8" rx="4.2" ry="6.5" transform="rotate(45 14.2 33.8)" />
      </g>
      <circle cx="24" cy="24" r="4.8" fill="#F7A7C3" />
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
  const [submitError, setSubmitError] = useState('')
  const [logoIndex, setLogoIndex] = useState(0)

  const hasEmailError = Boolean(errors.email)
  const hasPasswordError = Boolean(errors.password)
  const logoSrc = PETALOPS_LOGO_CANDIDATES[logoIndex]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess(false)
    setErrors({})
    setSubmitError('')

    if (!hasApiBaseUrl()) {
      setSubmitError('La URL de la API no esta configurada. Define VITE_API_URL para iniciar sesion.')
      return
    }

    const nextErrors: FieldErrors = {}

    if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Ingresa un correo valido'
    }

    if (!password.trim()) {
      nextErrors.password = 'Correo o contrasena incorrectos'
    }

    const slugCandidates = getSlugCandidates(email)
    if (slugCandidates.length === 0) {
      nextErrors.email = 'Ingresa un correo valido'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      let lastStatus = 0
      let lastDetail = ''
      let token: string | undefined
      let resolvedSlug = slugCandidates[0] ?? ''

      for (const slug of slugCandidates) {
        const response = await fetch(buildApiUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            slug,
          }),
        })

        const data = (await response.json().catch(() => ({}))) as LoginResponse
        lastStatus = response.status
        lastDetail = data.detail || ''

        if (response.ok && data.access_token) {
          token = data.access_token
          resolvedSlug = slug
          break
        }

        if (response.status === 404) {
          lastDetail = 'La ruta de autenticacion no esta disponible en el backend configurado.'
          continue
        }

        if (response.status !== 401 && response.status >= 400) {
          lastDetail = data.detail || 'No pudimos conectar con el backend. Intenta de nuevo.'
        }
      }

      if (!token) {
        if (lastStatus === 401) {
          setErrors({
            password: 'Credenciales o slug invalidos. Verifica el correo, la contrasena y la tienda.',
          })
        } else if (lastStatus === 404) {
          setSubmitError(
            'No encontramos la ruta de autenticacion en el backend configurado. Revisa VITE_API_URL.',
          )
        } else {
          setSubmitError(lastDetail || 'No pudimos conectar. Intenta de nuevo.')
        }
        setSuccess(false)
        return
      }

      localStorage.setItem('slug', resolvedSlug)
      setSuccess(true)
      setErrors({})
      window.setTimeout(() => {
        onAuthenticated?.(token)
      }, 250)
    } catch {
      setSubmitError('No pudimos conectar. Intenta de nuevo.')
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
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Petalops"
                className="login-page__logo-img"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => {
                  setLogoIndex((current) => {
                    const next = current + 1
                    return next < PETALOPS_LOGO_CANDIDATES.length ? next : PETALOPS_LOGO_CANDIDATES.length
                  })
                }}
              />
            ) : (
              <FlowerIcon />
            )}
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
            <p id="login-password-error" className={`login-page__error ${hasPasswordError ? 'is-visible' : ''}`}>
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

          {submitError ? (
            <p className="login-page__error is-visible" role="alert">
              {submitError}
            </p>
          ) : null}

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
