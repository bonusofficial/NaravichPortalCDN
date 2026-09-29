import type { LucideIcon } from 'lucide-react'
import { TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { Field, TextInput } from './Field'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'warning' | 'brand'
  icon?: LucideIcon
  /** Require typing this exact text before confirming (for destructive actions). */
  confirmText?: string
  children?: ReactNode
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null
  return <ConfirmDialogContent {...props} />
}

function ConfirmDialogContent({
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  icon = TriangleAlert,
  confirmText,
  children,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const matches = !confirmText || typed.trim() === confirmText
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={description}
      icon={icon}
      iconTone={tone === 'brand' ? 'brand' : tone}
      size="sm"
      role="alertdialog"
      onSubmit={() => {
        if (matches) onConfirm()
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} disabled={!matches}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {children}
        {confirmText ? (
          <Field
            label={
              <span>
                Type <code className="mono">{confirmText}</code> to confirm
              </span>
            }
            htmlFor="confirm-text"
          >
            <TextInput
              id="confirm-text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              data-autofocus
            />
          </Field>
        ) : null}
      </div>
    </Dialog>
  )
}
