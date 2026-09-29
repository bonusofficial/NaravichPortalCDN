import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext, type ToastApi, type ToastRecord } from '../../state/toast-context'
import { Button } from './Button'

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
}

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id))

  const api: ToastApi = {
    notify(options) {
      counter += 1
      const id = `toast-${counter}`
      const tone = options.tone ?? 'success'
      const record: ToastRecord = {
        id,
        tone,
        title: options.title,
        description: options.description,
        action: options.action,
        duration: options.duration ?? (tone === 'error' ? 8000 : options.action ? 7000 : 5000),
      }
      setToasts((prev) => [...prev.slice(-3), record])
      return id
    },
    dismiss,
  }

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
      <div className="toast-viewport" aria-label="Notifications">
        <div role="status" aria-live="polite" aria-atomic="false" style={{ display: 'contents' }}>
          {toasts
            .filter((toast) => toast.tone !== 'error')
            .map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
        </div>
        <div role="alert" aria-live="assertive" style={{ display: 'contents' }}>
          {toasts
            .filter((toast) => toast.tone === 'error')
            .map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
        </div>
      </div>,
        document.body,
      )}
    </ToastContext>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })
  useEffect(() => {
    if (paused) return undefined
    const timer = window.setTimeout(() => onDismissRef.current(), toast.duration)
    return () => window.clearTimeout(timer)
  }, [paused, toast.duration])

  const Icon = ICONS[toast.tone]
  return (
    <div
      className={`toast toast--${toast.tone}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="toast__icon" aria-hidden="true" />
      <div className="toast__content">
        <p className="toast__title">{toast.title}</p>
        {toast.description ? <p className="toast__description">{toast.description}</p> : null}
        {toast.action ? (
          <div className="toast__action">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                toast.action?.onClick()
                onDismiss()
              }}
            >
              {toast.action.label}
            </Button>
          </div>
        ) : null}
      </div>
      <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Dismiss notification" onClick={onDismiss} />
    </div>
  )
}
