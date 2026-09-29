import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, getAccessToken, setAccessToken } from '../lib/api'
import { AuthContext, type AuthUser } from './auth-context'

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

interface MeResponse {
  id: string
  name: string
  email: string
  role: AuthUser['role']
  mfaEnabled: boolean
  mustChangePassword: boolean
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()))

  const logout = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    window.location.hash = '#/overview'
  }, [])

  useEffect(() => {
    const expired = () => logout()
    window.addEventListener('naravich-auth-expired', expired)
    return () => window.removeEventListener('naravich-auth-expired', expired)
  }, [logout])

  useEffect(() => {
    if (!getAccessToken()) return
    apiRequest<MeResponse>('/auth/me')
      .then((me) => setUser(me))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  const login = useCallback(async (email: string, password: string, otp?: string) => {
    const response = await apiRequest<LoginResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password, ...(otp ? { otp } : {}) }) },
      false,
    )
    setAccessToken(response.accessToken)
    setUser(response.user)
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
    setUser((current) => (current ? { ...current, mustChangePassword: false } : current))
  }, [])

  const setupMfa = useCallback(() => apiRequest<{ secret: string; otpauthUrl: string }>('/auth/mfa/setup', { method: 'POST' }), [])

  const enableMfa = useCallback(async (code: string) => {
    await apiRequest('/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ code }) })
    setUser((current) => (current ? { ...current, mfaEnabled: true } : current))
  }, [])

  const disableMfa = useCallback(async (code: string) => {
    await apiRequest('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ code }) })
    setUser((current) => (current ? { ...current, mfaEnabled: false } : current))
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, changePassword, setupMfa, enableMfa, disableMfa }),
    [user, loading, login, logout, changePassword, setupMfa, enableMfa, disableMfa],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
