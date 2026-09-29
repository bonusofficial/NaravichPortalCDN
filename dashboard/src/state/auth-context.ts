import { createContext, useContext } from 'react'
import type { StaffRole } from '../types'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: StaffRole
  mfaEnabled: boolean
  mustChangePassword: boolean
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  login(email: string, password: string, otp?: string): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  setupMfa(): Promise<{ secret: string; otpauthUrl: string }>
  enableMfa(code: string): Promise<void>
  disableMfa(code: string): Promise<void>
  logout(): void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
