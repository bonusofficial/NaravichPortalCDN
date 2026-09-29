import { HOUR, MB, MINUTE, MOCK_NOW, STORAGE_ROOT, TEMP_ROOT } from '../lib/constants'
import type { AppNotification, AppSettings, HealthCheck } from '../types'

export const LAST_BACKUP = {
  finishedAt: Date.parse('2026-09-29T02:38:00+07:00'),
  startedAt: Date.parse('2026-09-29T02:00:00+07:00'),
  sizeLabel: '382.9 GB',
  status: 'succeeded' as const,
  target: 'backup-01.internal:/backups/naravich-cdn',
}

export const healthChecks: HealthCheck[] = [
  {
    id: 'api',
    label: 'Upload API',
    state: 'operational',
    summary: 'p95 184 ms',
    detail: 'nginx 1.26 → api (4 workers) · 99.98% uptime over 30 days',
  },
  {
    id: 'filesystem',
    label: 'Filesystem',
    state: 'operational',
    summary: 'ext4 · read/write OK',
    detail: `${STORAGE_ROOT} mounted rw · inode usage 12%`,
  },
  {
    id: 'mysql',
    label: 'MySQL',
    state: 'operational',
    summary: '8.0.39 · 14 connections',
    detail: 'Metadata database · avg query 2.8 ms · slow queries (24 h): 0',
  },
  {
    id: 'processor',
    label: 'Image processor',
    state: 'operational',
    summary: '4 / 4 workers · queue 3',
    detail: 'libvips 8.15 · avg job 412 ms · 0 stuck jobs',
  },
  {
    id: 'disk',
    label: 'Disk (/srv)',
    state: 'watch',
    summary: '66.2% used',
    detail: 'Warning threshold 70% · uploads stop at 88%',
  },
  {
    id: 'backup',
    label: 'Last backup',
    state: 'operational',
    summary: 'Succeeded 02:38',
    detail: `Nightly snapshot 382.9 GB · 38 min · ${LAST_BACKUP.target}`,
  },
]

export const seedNotifications: AppNotification[] = [
  {
    id: 'ntf_disk',
    title: 'Disk usage approaching threshold',
    body: '/srv is at 66.2%. The warning threshold is 70% and uploads stop at 88%.',
    createdAt: MOCK_NOW - 26 * MINUTE,
    tone: 'warning',
    read: false,
    target: { view: 'settings', params: { tab: 'storage' } },
  },
  {
    id: 'ntf_key_expiry',
    title: 'API key expires in 9 days',
    body: '“Main website – staging” (ncdn_test_…Q2LM) expires on 08 Oct 2026.',
    createdAt: MOCK_NOW - 2 * HOUR,
    tone: 'warning',
    read: false,
    target: { view: 'api-keys', params: { q: 'staging' } },
  },
  {
    id: 'ntf_413',
    title: 'Oversized uploads rejected',
    body: 'Campaign Landing Pages sent 2 files over 25 MB in the last hour (413 Too Large).',
    createdAt: MOCK_NOW - 40 * MINUTE,
    tone: 'info',
    read: false,
    target: { view: 'logs', params: { http: '413' } },
  },
  {
    id: 'ntf_backup',
    title: 'Nightly backup completed',
    body: 'Snapshot of 382.9 GB finished at 02:38 in 38 minutes.',
    createdAt: Date.parse('2026-09-29T02:38:00+07:00'),
    tone: 'success',
    read: true,
    target: { view: 'settings', params: { tab: 'backup' } },
  },
  {
    id: 'ntf_invite',
    title: 'Invitation pending',
    body: 'ploypailin.c@example.com has not accepted their Viewer invitation yet.',
    createdAt: MOCK_NOW - 2 * 24 * HOUR,
    tone: 'info',
    read: true,
    target: { view: 'users' },
  },
]

export const defaultSettings: AppSettings = {
  general: {
    workspaceName: 'Naravich Sure CDN',
    publicBaseUrl: 'https://cdn.example.com',
    timeZone: 'Asia/Bangkok',
    supportEmail: 'it-ops@example.com',
    notFoundResponse: 'empty',
  },
  storage: {
    storagePath: STORAGE_ROOT,
    tempPath: TEMP_ROOT,
    trashRetentionDays: 30,
    diskWarningPercent: 70,
    stopUploadsPercent: 88,
    pathPattern: '{project}/{yyyy}/{mm}/{id}.{ext}',
    retainOriginals: true,
  },
  processing: {
    maxInputMb: 25,
    maxOutputMb: 5,
    outputFormat: 'webp',
    startingQuality: 82,
    minQuality: 60,
    qualityStep: 6,
    maxWidth: 4096,
    maxHeight: 4096,
    stripMetadata: true,
    workers: 4,
  },
  security: {
    requireMfa: true,
    sessionTimeoutMinutes: 60,
    defaultKeyExpiryDays: 365,
    defaultRateLimit: 120,
    dashboardAllowlist: '203.0.113.0/28\n10.8.0.0/24',
  },
  backup: {
    enabled: true,
    schedule: '02:00',
    retentionDays: 14,
    target: 'backup-01.internal:/backups/naravich-cdn',
    verifyAfterBackup: true,
  },
}

export const TRASH_SUMMARY = { objects: 1_146, bytes: 18.6 * 1000 * MB }
