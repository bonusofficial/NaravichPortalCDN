import { useEffect, useRef, type RefObject } from 'react'

/*
 * Shared behaviour for dialogs and drawers: a stack so only the top-most layer
 * reacts to Escape/Tab, a focus trap, focus restore, scroll lock, and `inert`
 * on the app root while any modal layer is open.
 */

const stack: symbol[] = []
let lockCount = 0

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'summary',
].join(',')

export function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0,
  )
}

function lock() {
  lockCount += 1
  if (lockCount === 1) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    document.getElementById('root')?.setAttribute('inert', '')
  }
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.getElementById('root')?.removeAttribute('inert')
  }
}

export function useModalLayer(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const id = Symbol('modal-layer')
    stack.push(id)
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    lock()

    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current
      const target =
        initialFocusRef?.current ??
        container?.querySelector<HTMLElement>('[data-autofocus]') ??
        getFocusable(container).find((el) => !el.dataset.dismiss) ??
        container
      target?.focus({ preventScroll: true })
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable(containerRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        containerRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const inside = containerRef.current?.contains(active)
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      stack.splice(stack.indexOf(id), 1)
      unlock()
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [open, containerRef, initialFocusRef])
}
