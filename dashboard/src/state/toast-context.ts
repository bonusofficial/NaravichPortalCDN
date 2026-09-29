import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  tone?: ToastTone
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  /** Milliseconds before auto-dismiss; errors default to 8 s, others 5 s. */
  duration?: number
}

export interface ToastRecord extends Required<Pick<ToastOptions, 'tone' | 'title'>> {
  id: string
  description?: string
  action?: ToastOptions['action']
  duration: number
}

export interface ToastApi {
  notify(options: ToastOptions): string
  dismiss(id: string): void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
