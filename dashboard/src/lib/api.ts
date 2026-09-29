const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1'
const TOKEN_KEY = 'naravich-cdn.access-token'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string | null): void {
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

function errorMessage(payload: unknown, fallback: string): { message: string; code?: string } {
  if (!payload || typeof payload !== 'object') return { message: fallback }
  const item = payload as { message?: unknown; code?: unknown; error?: unknown }
  const message = Array.isArray(item.message)
    ? item.message.join(', ')
    : typeof item.message === 'string'
      ? item.message
      : typeof item.error === 'string'
        ? item.error
        : fallback
  return { message, code: typeof item.code === 'string' ? item.code : undefined }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getAccessToken()
  if (authenticated && token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(`เชื่อมต่อ API ที่ ${API_BASE_URL} ไม่ได้ กรุณาตรวจว่า NestJS กำลังทำงานอยู่`, 0, 'NETWORK_ERROR')
  }

  const text = await response.text()
  let payload: unknown = undefined
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const detail = errorMessage(payload, `Request failed with HTTP ${response.status}`)
    if (response.status === 401 && authenticated) {
      setAccessToken(null)
      window.dispatchEvent(new Event('naravich-auth-expired'))
    }
    throw new ApiError(detail.message, response.status, detail.code)
  }

  return payload as T
}

export function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}
