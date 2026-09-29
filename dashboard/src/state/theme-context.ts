import { createContext, useContext } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeApi {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference(preference: ThemePreference): void
}

export const THEME_STORAGE_KEY = 'ncdn-theme'

export const ThemeContext = createContext<ThemeApi | null>(null)

export function useTheme(): ThemeApi {
  const api = useContext(ThemeContext)
  if (!api) throw new Error('useTheme must be used inside <ThemeProvider>')
  return api
}
