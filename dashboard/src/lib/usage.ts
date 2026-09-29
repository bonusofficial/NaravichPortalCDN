import { DAY } from './constants'
import type { DailyPoint, LatencyDay, UploadDay, UsageMetrics } from '../types'

export function usageSeries(usage: UsageMetrics | null, totalStorage: number, days: number, projectId?: string) {
  const end = new Date(usage?.asOf ?? 0)
  end.setHours(0, 0, 0, 0)
  const dates = Array.from({ length: days }, (_, index) => end.getTime() - (days - 1 - index) * DAY)
  const requests = usage?.daily.filter((row) => !projectId || row.projectId === projectId) ?? []
  const assets = usage?.assetDaily.filter((row) => !projectId || row.projectId === projectId) ?? []
  const requestByDay = new Map<number, typeof requests>()
  const assetByDay = new Map<number, typeof assets>()

  requests.forEach((row) => requestByDay.set(row.date, [...(requestByDay.get(row.date) ?? []), row]))
  assets.forEach((row) => assetByDay.set(row.date, [...(assetByDay.get(row.date) ?? []), row]))

  const uploads: UploadDay[] = dates.map((date) => {
    const rows = requestByDay.get(date) ?? []
    return {
      date,
      requests: rows.reduce((sum, row) => sum + row.requests, 0),
      rejected: rows.reduce((sum, row) => sum + row.rejected, 0),
      failed: rows.reduce((sum, row) => sum + row.failed, 0),
    }
  })
  const input: DailyPoint[] = dates.map((date) => ({
    date,
    value: (requestByDay.get(date) ?? []).reduce((sum, row) => sum + row.inputBytes, 0),
  }))
  const output: DailyPoint[] = dates.map((date) => ({
    date,
    value: (requestByDay.get(date) ?? []).reduce((sum, row) => sum + row.outputBytes, 0),
  }))
  const latency: LatencyDay[] = dates.map((date) => {
    const rows = requestByDay.get(date) ?? []
    const count = rows.reduce((sum, row) => sum + row.requests, 0)
    return {
      date,
      p50: count ? rows.reduce((sum, row) => sum + row.averageDurationMs * row.requests, 0) / count : 0,
      p95: rows.reduce((peak, row) => Math.max(peak, row.maxDurationMs), 0),
    }
  })
  const growth = dates.map((date) => (assetByDay.get(date) ?? []).reduce((sum, row) => sum + row.storageBytes, 0))
  let stored = Math.max(0, totalStorage - growth.reduce((sum, value) => sum + value, 0))
  const storage: DailyPoint[] = dates.map((date, index) => {
    stored += growth[index]
    return { date, value: stored }
  })

  return { uploads, input, output, latency, storage }
}
