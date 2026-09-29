import { DAY, HOUR, LOCALE, MINUTE, TIME_ZONE, mockNow } from './constants'

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

function trimZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value
}

/**
 * Decimal (SI) byte formatting used everywhere in the console: 1 KB = 1000 B.
 * Two decimals below 10, one decimal above — e.g. 1.82 TB, 386.4 GB, 5 MB.
 */
export function formatBytes(bytes: number, options: { fixed?: boolean } = {}): string {
  if (!Number.isFinite(bytes)) return '—'
  const sign = bytes < 0 ? '-' : ''
  let value = Math.abs(bytes)
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit += 1
  }
  if (unit === 0) return `${sign}${Math.round(value)} B`
  const digits = value < 10 ? 2 : 1
  const text = value.toFixed(digits)
  return `${sign}${options.fixed ? text : trimZeros(text)} ${UNITS[unit]}`
}

const integer = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function formatNumber(value: number): string {
  return integer.format(Math.round(value))
}

export function formatCompact(value: number): string {
  return compact.format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${trimZeros((ms / 1000).toFixed(2))} s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

// Numeric parts in Asia/Bangkok; month names are fixed so output is identical in every browser/ICU.
const partsFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function bangkokParts(ts: number) {
  const parts: Record<string, string> = {}
  for (const part of partsFormat.formatToParts(ts)) parts[part.type] = part.value
  return {
    year: parts.year,
    month: MONTHS[Number(parts.month) - 1],
    day: parts.day.padStart(2, '0'),
    dayNumeric: String(Number(parts.day)),
    time: `${parts.hour}:${parts.minute}`,
    seconds: parts.second,
  }
}

/** "29 Sep 2026, 14:32" (Asia/Bangkok) */
export function formatDateTime(ts: number): string {
  const p = bangkokParts(ts)
  return `${p.day} ${p.month} ${p.year}, ${p.time}`
}

/** "29 Sep, 14:31:07" (Asia/Bangkok) */
export function formatDateTimeSeconds(ts: number): string {
  const p = bangkokParts(ts)
  return `${p.day} ${p.month}, ${p.time}:${p.seconds}`
}

/** "29 Sep 2026" */
export function formatDate(ts: number): string {
  const p = bangkokParts(ts)
  return `${p.day} ${p.month} ${p.year}`
}

/** "29 Sep" */
export function formatShortDate(ts: number): string {
  const p = bangkokParts(ts)
  return `${p.dayNumeric} ${p.month}`
}

/** "Feb 2027" */
export function formatMonthYear(ts: number): string {
  const p = bangkokParts(ts)
  return `${p.month} ${p.year}`
}

/** "14:31:07" */
export function formatTime(ts: number): string {
  const p = bangkokParts(ts)
  return `${p.time}:${p.seconds}`
}

/** ISO-8601 with the +07:00 offset, for payloads and exports. */
export function formatIsoBangkok(ts: number): string {
  const shifted = new Date(ts + 7 * HOUR)
  return `${shifted.toISOString().slice(0, 19)}+07:00`
}

export function formatRelative(ts: number, reference: number = mockNow()): string {
  const diff = reference - ts
  const future = diff < 0
  const abs = Math.abs(diff)
  let text: string
  if (abs < 45_000) return future ? 'in a moment' : 'just now'
  if (abs < HOUR) text = `${Math.max(1, Math.round(abs / MINUTE))} min`
  else if (abs < DAY) text = `${Math.round(abs / HOUR)} h`
  else if (abs < 45 * DAY) {
    const days = Math.round(abs / DAY)
    text = `${days} ${days === 1 ? 'day' : 'days'}`
  } else if (abs < 365 * DAY) {
    const months = Math.round(abs / (30 * DAY))
    text = `${months} ${months === 1 ? 'month' : 'months'}`
  } else {
    const years = Math.round(abs / (365 * DAY))
    text = `${years} ${years === 1 ? 'year' : 'years'}`
  }
  return future ? `in ${text}` : `${text} ago`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

export function savedPercent(original: number, optimized: number | null): number | null {
  if (optimized == null || original <= 0) return null
  return Math.max(0, (1 - optimized / original) * 100)
}
