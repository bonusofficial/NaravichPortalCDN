/** Module-load timestamp retained for legacy fixture modules. */
export const MOCK_NOW = Date.now()

/** Current wall-clock time. Kept under the old name to avoid fixture churn. */
export function mockNow(): number {
  return Date.now()
}

export const TIME_ZONE = 'Asia/Bangkok'
export const LOCALE = 'en-GB'

export const PRODUCT_NAME = 'CDN Manager'
export const BRAND_NAME = 'Naravich Sure'
export const WORKSPACE_LABEL = 'Naravich Sure CDN'

export const CDN_BASE_URL = (import.meta.env.VITE_CDN_BASE_URL || 'http://localhost:3000/files').replace(/\/$/, '')
export const CDN_HOST = new URL(CDN_BASE_URL).host
export const API_UPLOAD_URL = (import.meta.env.VITE_UPLOAD_URL || 'http://localhost:3000/api/v1/images').replace(/\/$/, '')

export const STORAGE_ROOT = '/srv/naravich-cdn/storage'
export const TEMP_ROOT = '/srv/naravich-cdn/temp'

export const KB = 1000
export const MB = 1000 * KB
export const GB = 1000 * MB
export const TB = 1000 * GB

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export const SERVER = {
  hostname: 'vps-bkk-01',
  os: 'Ubuntu 24.04 LTS',
  region: 'Bangkok, TH',
  volume: '/srv',
  diskTotalBytes: 1 * TB,
  diskUsedBytes: 662.4 * GB,
  /** Breakdown of what occupies the /srv volume. */
  diskBreakdown: [
    { label: 'Retained originals', bytes: 301.2 * GB },
    { label: 'Optimized outputs', bytes: 85.2 * GB },
    { label: 'Local backup snapshots', bytes: 229.8 * GB },
    { label: 'Trash (30-day retention)', bytes: 18.6 * GB },
    { label: 'MySQL data', bytes: 6.2 * GB },
    { label: 'Logs & temp', bytes: 21.4 * GB },
  ],
} as const
