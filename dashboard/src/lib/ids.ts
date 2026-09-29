import type { Rng } from './rng'

export const BASE32 = '0123456789abcdefghjkmnpqrstvwxyz'
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const HEX = '0123456789abcdef'
const UPPER_ALNUM = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function secureChars(length: number, alphabet: string): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return out
}

/** Object id in the style of the public URLs, e.g. "019c8f2a7d41". */
export function objectIdFrom(rng: Rng): string {
  return `019c${rng.chars(8, HEX)}`
}

export function requestIdFrom(rng: Rng): string {
  return `req_${rng.chars(16, BASE32)}`
}

export function checksumFrom(rng: Rng): string {
  return rng.chars(64, HEX)
}

export function keyLast4From(rng: Rng): string {
  return rng.chars(4, UPPER_ALNUM)
}

/* Runtime (event-handler) generators — use crypto, never called during render. */

export function newObjectId(): string {
  return `019c${secureChars(8, HEX)}`
}

export function newRequestId(): string {
  return `req_${secureChars(16, BASE32)}`
}

export function newId(prefix: string): string {
  return `${prefix}_${secureChars(10, BASE32)}`
}

export function newChecksum(): string {
  return secureChars(64, HEX)
}

export interface GeneratedKey {
  secret: string
  last4: string
}

/** Full API key secret, e.g. ncdn_live_… (40 random base62 characters). */
export function generateApiKey(environment: 'live' | 'test'): GeneratedKey {
  const body = secureChars(36, BASE62) + secureChars(4, UPPER_ALNUM)
  return { secret: `ncdn_${environment}_${body}`, last4: body.slice(-4) }
}

export function maskKey(environment: 'live' | 'test', last4: string): string {
  return `ncdn_${environment}_••••••••${last4}`
}
