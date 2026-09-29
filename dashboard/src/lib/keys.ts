/**
 * Index navigation for roving-focus widgets (tabs, radio groups, chart points).
 * Returns the next index for a handled key, or null when the key isn't handled.
 */
export function nextIndex(key: string, current: number, length: number, options: { wrap?: boolean } = {}): number | null {
  const wrap = options.wrap ?? true
  const last = length - 1
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return current >= last ? (wrap ? 0 : last) : current + 1
    case 'ArrowLeft':
    case 'ArrowUp':
      return current <= 0 ? (wrap ? last : 0) : current - 1
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}
