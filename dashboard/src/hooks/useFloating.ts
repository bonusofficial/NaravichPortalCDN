import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const GAP = 6
const EDGE = 8

/**
 * Positions a `position: fixed` element next to its trigger (below, flipping
 * above when there is no room) and keeps it attached on scroll/resize.
 * Writes styles directly so there is no extra render or first-frame flash.
 */
export function useAnchoredPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  align: 'start' | 'end' = 'start',
): void {
  useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const trigger = triggerRef.current
      const floating = floatingRef.current
      if (!trigger || !floating) return
      const rect = trigger.getBoundingClientRect()
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      floating.style.maxHeight = ''
      const width = floating.offsetWidth
      const height = floating.offsetHeight
      const below = viewportH - rect.bottom - GAP - EDGE
      const above = rect.top - GAP - EDGE
      const placeAbove = height > below && above > below
      const top = placeAbove ? Math.max(EDGE, rect.top - GAP - height) : rect.bottom + GAP
      let left = align === 'end' ? rect.right - width : rect.left
      left = Math.min(Math.max(EDGE, left), viewportW - width - EDGE)
      floating.style.top = `${Math.round(top)}px`
      floating.style.left = `${Math.round(left)}px`
      floating.style.maxHeight = `${Math.floor(placeAbove ? above : below)}px`
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, triggerRef, floatingRef, align])
}

/** Close on outside pointer-down. Escape is handled by the floating element itself. */
export function useDismiss(
  open: boolean,
  refs: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
): void {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (refs.some((ref) => ref.current?.contains(target))) return
      onDismissRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable ref objects
  }, [open])
}
