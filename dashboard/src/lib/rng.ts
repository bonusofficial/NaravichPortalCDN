/** Small seeded PRNG (mulberry32) so mock data is identical on every load. */
export interface Rng {
  next(): number
  int(min: number, max: number): number
  float(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  weighted<T>(items: readonly (readonly [T, number])[]): T
  chance(probability: number): boolean
  chars(length: number, alphabet: string): string
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng: Rng = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items) => {
      const total = items.reduce((sum, [, weight]) => sum + weight, 0)
      let roll = next() * total
      for (const [value, weight] of items) {
        roll -= weight
        if (roll <= 0) return value
      }
      return items[items.length - 1][0]
    },
    chance: (probability) => next() < probability,
    chars: (length, alphabet) => {
      let out = ''
      for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(next() * alphabet.length)]
      return out
    },
  }
  return rng
}

/** Deterministic 32-bit string hash (FNV-1a). */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** 64-hex-character digest-shaped string derived from input (mock only, not cryptographic). */
export function mockDigest(value: string): string {
  let out = ''
  let seed = hashString(value)
  while (out.length < 64) {
    seed = hashString(`${seed}:${value}:${out.length}`)
    out += seed.toString(16).padStart(8, '0')
  }
  return out.slice(0, 64)
}
