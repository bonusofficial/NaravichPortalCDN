import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { useId, useRef, type FormEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../hooks/useModalLayer'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  iconTone?: 'brand' | 'danger' | 'warning'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
  children?: ReactNode
  /** When set, the dialog body and footer are wrapped in a <form>. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  /** Allow closing by clicking the backdrop (default true). */
  dismissible?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  role?: 'dialog' | 'alertdialog'
}

export function Dialog(props: DialogProps) {
  if (!props.open) return null
  return createPortal(<DialogSurface {...props} />, document.body)
}

function DialogSurface({
  onClose,
  title,
  description,
  icon: Icon,
  iconTone = 'brand',
  size = 'md',
  footer,
  children,
  onSubmit,
  dismissible = true,
  initialFocusRef,
  role = 'dialog',
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useModalLayer(true, ref, onClose, initialFocusRef)

  const content = (
    <>
      <div className="dialog__body">{children}</div>
      {footer ? <div className="dialog__footer">{footer}</div> : null}
    </>
  )

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className={cn('dialog', size !== 'md' && `dialog--${size}`)}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="dialog__header">
          {Icon ? (
            <span className={cn('dialog__icon', iconTone !== 'brand' && `dialog__icon--${iconTone}`)} aria-hidden="true">
              <Icon />
            </span>
          ) : null}
          <div className="dialog__titles">
            <h2 className="dialog__title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <div className="dialog__description" id={descriptionId}>
                {description}
              </div>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close dialog" className="dialog__close" onClick={onClose} data-dismiss="true" />
        </div>
        {onSubmit ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit(event)
            }}
            style={{ display: 'contents' }}
          >
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
