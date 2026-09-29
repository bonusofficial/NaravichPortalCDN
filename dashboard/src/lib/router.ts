import { useSyncExternalStore } from 'react'
import type { ViewId } from '../types'

/*
 * Minimal hash router: #/assets?id=019c… — keeps deep links and back/forward
 * working without a routing dependency.
 */

export const VIEW_IDS: ViewId[] = [
  'overview',
  'projects',
  'assets',
  'api-keys',
  'logs',
  'usage',
  'users',
  'audit',
  'settings',
]

export type RouteParams = Record<string, string>

export interface Route {
  view: ViewId
  params: RouteParams
}

function isViewId(value: string): value is ViewId {
  return (VIEW_IDS as string[]).includes(value)
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  const view = isViewId(path) ? path : 'overview'
  const params: RouteParams = {}
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value
  })
  return { view, params }
}

export function buildHash(view: ViewId, params: RouteParams = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return `#/${view}${query ? `?${query}` : ''}`
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getSnapshot() {
  return window.location.hash
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '')
  return parseHash(hash)
}

export function navigate(view: ViewId, params: RouteParams = {}, options: { replace?: boolean } = {}): void {
  const hash = buildHash(view, params)
  if (hash === window.location.hash) return
  if (options.replace) {
    const url = `${window.location.pathname}${window.location.search}${hash}`
    window.history.replaceState(window.history.state, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = hash
  }
}

/** Update query params on the current view without adding a history entry. */
export function setRouteParams(view: ViewId, params: RouteParams): void {
  navigate(view, params, { replace: true })
}
