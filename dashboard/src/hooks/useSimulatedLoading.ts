import { useEffect, useState } from 'react'

/**
 * Simulates request latency in the frontend-only prototype: returns true for
 * `delay` ms whenever `key` changes (e.g. first visit or a manual refresh).
 */
export function useSimulatedLoading(key: string | number, delay = 450): boolean {
  const [settledKey, setSettledKey] = useState<string | number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledKey(key), delay)
    return () => window.clearTimeout(timer)
  }, [key, delay])

  return settledKey !== key
}
