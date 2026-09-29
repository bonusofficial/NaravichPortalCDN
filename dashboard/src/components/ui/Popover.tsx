import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition, useDismiss } from '../../hooks/useFloating'

export interface PopoverTriggerProps {
  ref: Ref<HTMLButtonElement>
  onClick: () => void
  'aria-expanded': boolean
  'aria-controls': string | undefined
  'aria-haspopup': 'dialog'
}

interface PopoverProps {
  label: string
  trigger: (props: PopoverTriggerProps) => ReactNode
  align?: 'start' | 'end'
  width?: number
  children: (close: () => void) => ReactNode
}

/** Non-modal floating panel (e.g. notifications) that closes on Escape or outside click. */
export function Popover({ label, trigger, align = 'end', width = 380, children }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const id = useId()

  useAnchoredPosition(open, triggerRef, panelRef, align)
  useDismiss(open, [triggerRef, panelRef], () => setOpen(false))

  useEffect(() => {
    if (open) {
      panelRef.current?.focus()
    } else if (wasOpen.current && (document.activeElement === document.body || document.activeElement == null)) {
      // Focus was inside the panel when it closed — return it to the trigger.
      triggerRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  const close = () => setOpen(false)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((value) => !value),
        'aria-expanded': open,
        'aria-controls': open ? id : undefined,
        'aria-haspopup': 'dialog',
      })}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={id}
              className="popover"
              role="dialog"
              aria-label={label}
              tabIndex={-1}
              style={{ width: `min(${width}px, calc(100vw - 16px))` }}
              onKeyDown={onKeyDown}
            >
              {children(close)}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
