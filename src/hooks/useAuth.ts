import { useContext } from 'react'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/types'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }

  return context
}
