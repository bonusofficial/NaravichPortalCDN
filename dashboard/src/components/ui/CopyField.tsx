import { Check, Copy } from 'lucide-react'
import { useClipboard } from '../../hooks/useClipboard'
import { cn } from '../../lib/cn'
import { useToast } from '../../state/toast-context'
import { Button } from './Button'

interface CopyButtonProps {
  value: string
  /** What is being copied, e.g. "CDN URL" — used for labels and the toast. */
  label: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'secondary'
  showText?: boolean
  toast?: boolean
}

export function CopyButton({ value, label, size = 'sm', variant = 'ghost', showText = false, toast = true }: CopyButtonProps) {
  const { copy, copied } = useClipboard()
  const { notify } = useToast()
  const done = copied != null
  return (
    <Button
      variant={variant}
      size={size}
      iconOnly={!showText}
      icon={done ? Check : Copy}
      aria-label={done ? `${label} copied` : `Copy ${label}`}
      title={done ? 'Copied' : `Copy ${label}`}
      onClick={async () => {
        const ok = await copy(value)
        if (!toast) return
        notify(
          ok
            ? { tone: 'success', title: `${label} copied`, description: value.length > 80 ? `${value.slice(0, 77)}…` : value, duration: 3000 }
            : { tone: 'error', title: 'Could not copy', description: 'Clipboard access was blocked by the browser.' },
        )
      }}
    >
      {showText ? (done ? 'Copied' : 'Copy') : null}
    </Button>
  )
}

interface CopyFieldProps {
  label: string
  value: string
  truncate?: boolean
  hideLabel?: boolean
}

export function CopyField({ label, value, truncate, hideLabel }: CopyFieldProps) {
  return (
    <div>
      <span className={hideLabel ? 'sr-only' : 'copy-stack__label'}>{label}</span>
      <div className="copy-field">
        <span className={cn('copy-field__value', truncate && 'copy-field__value--truncate')} title={truncate ? value : undefined}>
          {value}
        </span>
        <span className="copy-field__actions">
          <CopyButton value={value} label={label} />
        </span>
      </div>
    </div>
  )
}
