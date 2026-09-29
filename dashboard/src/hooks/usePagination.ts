import { useState } from 'react'

/**
 * Page state that resets to page 1 whenever `resetKey` (e.g. serialised
 * filters) changes — derived during render, no effects needed.
 */
export function usePagination<T>(items: T[], resetKey: string, initialPageSize = 25) {
  const [state, setState] = useState({ key: resetKey, page: 1, pageSize: initialPageSize })
  const page = state.key === resetKey ? state.page : 1
  const pageSize = state.pageSize
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  return {
    page: current,
    pageSize,
    pageCount,
    total: items.length,
    pageItems: items.slice(start, start + pageSize),
    setPage: (next: number) => setState({ key: resetKey, page: next, pageSize }),
    setPageSize: (size: number) => setState({ key: resetKey, page: 1, pageSize: size }),
  }
}
