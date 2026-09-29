import { createContext, useContext } from 'react'

export interface ShellApi {
  /** Open the global upload dialog, optionally preselecting a project. */
  openUpload(projectId?: string): void
}

export const ShellContext = createContext<ShellApi | null>(null)

export function useShell(): ShellApi {
  const api = useContext(ShellContext)
  if (!api) throw new Error('useShell must be used inside <AppShell>')
  return api
}
