import { DAY, GB, TB } from '../lib/constants'
import { createRng } from '../lib/rng'
import type { DailyPoint, LatencyDay, UploadDay } from '../types'

/** Midnight (ICT) of the mock "today". */
export const TODAY = Date.parse('2026-09-29T00:00:00+07:00')
const DAYS = 90

function days(): number[] {
  return Array.from({ length: DAYS }, (_, i) => TODAY - (DAYS - 1 - i) * DAY)
}

function isWeekend(ts: number) {
  const day = new Date(ts + 7 * 3600_000).getUTCDay()
  return day === 0 || day === 6
}

/**
 * Scale a series so the last `window` entries are integers summing exactly to
 * `total` (largest-remainder rounding, never negative).
 */
function normaliseTail(values: number[], window: number, total: number): number[] {
  const tail = values.slice(-window)
  const sum = tail.reduce((a, b) => a + b, 0) || 1
  const exact = tail.map((v) => (v / sum) * total)
  const floored = exact.map(Math.floor)
  const remainder = total - floored.reduce((a, b) => a + b, 0)
  const order = exact.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0])
  for (let k = 0; k < remainder; k += 1) floored[order[k % order.length][1]] += 1
  const head = values.slice(0, -window).map((v) => Math.max(0, Math.round((v / sum) * total)))
  return [...head, ...floored]
}

function build() {
  const rng = createRng(90210)
  const dates = days()

  // Upload requests: weekday-heavy, gently growing. Last 30 days → 6,480 requests,
  // 71 rejected (4xx) and 5 failed after acceptance (507 / processing).
  const rawRequests = dates.map((d, i) => (isWeekend(d) ? 110 : 245) * (0.9 + i / DAYS / 5) * rng.float(0.86, 1.14))
  const requests = normaliseTail(rawRequests, 30, 6_480)
  const rawRejected = dates.map((d) => (isWeekend(d) ? 1 : 3) * rng.float(0.2, 1.9))
  const rejected = normaliseTail(rawRejected, 30, 71)
  const failedDays = new Map([
    [DAYS - 1, 1], // 507 during the nightly backup (today 03:12)
    [DAYS - 6, 1],
    [DAYS - 13, 1],
    [DAYS - 19, 1],
    [DAYS - 27, 1],
  ])
  const failed = dates.map((_, i) => failedDays.get(i) ?? (i < DAYS - 30 && rng.chance(0.18) ? 1 : 0))
  const uploads: UploadDay[] = dates.map((date, i) => ({ date, requests: requests[i], rejected: rejected[i], failed: failed[i] }))

  // Asset storage: cumulative growth to 386.4 GB, with a trash purge on day −41.
  const growth = dates.map((d) => (isWeekend(d) ? 0.18 : 0.52) * rng.float(0.7, 1.3))
  const storage: DailyPoint[] = []
  let value = 386.4 * GB
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    storage[i] = { date: dates[i], value }
    value -= growth[i] * GB
    if (DAYS - 1 - i === 41) value += 3.8 * GB
  }

  // Bandwidth per day; September 1–29 sums to 1.82 TB.
  const rawBandwidth = dates.map((d) => (isWeekend(d) ? 44 : 70) * rng.float(0.82, 1.2) * GB)
  const septemberStart = Date.parse('2026-09-01T00:00:00+07:00')
  const septemberIdx = dates.findIndex((d) => d === septemberStart)
  const septemberSum = rawBandwidth.slice(septemberIdx).reduce((a, b) => a + b, 0)
  const factor = (1.82 * TB) / septemberSum
  const bandwidth: DailyPoint[] = dates.map((date, i) => ({ date, value: rawBandwidth[i] * factor }))

  // Processing latency (upload → stored), p50 and p95.
  const latency: LatencyDay[] = dates.map((date, i) => {
    const load = requests[i] / 1500
    const p50 = Math.round((360 + load * 60) * rng.float(0.94, 1.08))
    const p95 = Math.round((1450 + load * 380) * rng.float(0.9, 1.14))
    return { date, p50, p95 }
  })

  return { uploads, storage, bandwidth, latency }
}

const series = build()

export const uploadSeries: UploadDay[] = series.uploads
export const storageSeries: DailyPoint[] = series.storage
export const bandwidthSeries: DailyPoint[] = series.bandwidth
export const latencySeries: LatencyDay[] = series.latency

/** Requests that were not stored over the last 30 days: 71 rejected + 5 failed. */
export const failureBreakdown: { code: 401 | 413 | 422 | 429 | 507 | 'processing'; count: number }[] = [
  { code: 413, count: 24 },
  { code: 429, count: 19 },
  { code: 422, count: 15 },
  { code: 401, count: 13 },
  { code: 'processing', count: 3 },
  { code: 507, count: 2 },
]

export const BANDWIDTH_MONTH_START = Date.parse('2026-09-01T00:00:00+07:00')

/** Total disk usage on the /srv volume grows ~0.46 GB/day (assets + backups). */
export const DISK_GROWTH_PER_DAY = 0.46 * GB

