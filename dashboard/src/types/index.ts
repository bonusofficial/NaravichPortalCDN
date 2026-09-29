export type ViewId =
  | 'overview'
  | 'projects'
  | 'assets'
  | 'api-keys'
  | 'logs'
  | 'usage'
  | 'users'
  | 'audit'
  | 'settings'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/* ---------------------------------------------------------------- Projects */

export type ImageFormat = 'jpeg' | 'png' | 'webp'
export type OutputFormatSetting = 'webp' | 'jpeg' | 'original'
export type ProjectStatus = 'active' | 'paused' | 'archived'

export interface ProjectSettings {
  allowedFormats: ImageFormat[]
  maxInputBytes: number
  maxOutputBytes: number
  outputFormat: OutputFormatSetting
  startingQuality: number
  minQuality: number
  maxDimension: number
  stripMetadata: boolean
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string
  domain: string
  status: ProjectStatus
  owner: string
  assetCount: number
  storageBytes: number
  quotaBytes: number
  requests30d: number
  failed30d: number
  bandwidthMonthBytes: number
  lastActivityAt: number
  createdAt: number
  settings: ProjectSettings
}

/* ------------------------------------------------------------------ Assets */

export type AssetStatus = 'ready' | 'processing' | 'failed'

export type AssetPreview = { kind: 'generated'; seed: number } | { kind: 'blob'; url: string }

export interface Asset {
  id: string
  projectId: string
  fileName: string
  objectKey: string
  publicUrl?: string
  originalFormat: ImageFormat
  outputFormat: ImageFormat
  originalWidth: number
  originalHeight: number
  width: number
  height: number
  originalBytes: number
  optimizedBytes: number | null
  quality: number | null
  attempts: number
  status: AssetStatus
  error?: string
  uploadedAt: number
  requestId: string
  keyLabel: string
  checksum: string
  retainedOriginal: boolean
  preview: AssetPreview
}

/* ---------------------------------------------------------------- API keys */

export type ApiKeyStatus = 'active' | 'revoked' | 'expired'
export type ApiKeyScope = 'assets:write' | 'assets:read' | 'assets:delete'
export type KeyEnvironment = 'live' | 'test'

export interface ApiKey {
  id: string
  name: string
  projectId: string
  environment: KeyEnvironment
  last4: string
  scopes: ApiKeyScope[]
  status: ApiKeyStatus
  createdBy: string
  createdAt: number
  lastUsedAt: number | null
  expiresAt: number | null
  rateLimitPerMin: number
  ipAllowlist: string[]
  revokedAt?: number
  /** Set while a rotated key is inside its grace period. */
  graceEndsAt?: number
}

/* ------------------------------------------------------------- Upload logs */

export type UploadHttpStatus = 201 | 202 | 401 | 413 | 422 | 429 | 507

/** Final outcome of a request; a 202 may later become ready or failed. */
export type UploadOutcome = 'ready' | 'processing' | 'failed' | 'rejected'

export type StepState = 'passed' | 'failed' | 'skipped' | 'running'

export interface LogStep {
  label: string
  detail: string
  state: StepState
  durationMs?: number
}

export interface CompressionAttempt {
  attempt: number
  quality: number
  width: number
  height: number
  bytes: number
  withinLimit: boolean
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface UploadLog {
  id: string
  requestId: string
  timestamp: number
  projectId: string
  keyLabel: string
  sourceIp: string
  userAgent: string
  fileName: string
  mimeType: string
  originalBytes: number
  optimizedBytes: number | null
  durationMs: number
  httpStatus: UploadHttpStatus
  outcome: UploadOutcome
  assetId: string | null
  steps: LogStep[]
  attempts: CompressionAttempt[]
  objectPath: string | null
  response: JsonValue
  error?: { code: string; message: string; hint: string }
}

/* ------------------------------------------------------------------- Users */

export type StaffRole = 'admin' | 'operator' | 'viewer'
export type StaffStatus = 'active' | 'invited' | 'disabled'

export interface StaffUser {
  id: string
  name: string
  email: string
  role: StaffRole
  mfaEnabled: boolean
  status: StaffStatus
  lastActiveAt: number | null
  createdAt: number
}

/* -------------------------------------------------------------- Audit logs */

export type AuditAction =
  | 'project.created'
  | 'project.updated'
  | 'project.paused'
  | 'project.resumed'
  | 'api_key.created'
  | 'api_key.rotated'
  | 'api_key.revoked'
  | 'asset.deleted'
  | 'asset.restored'
  | 'asset.reprocessed'
  | 'user.invited'
  | 'user.role_changed'
  | 'user.disabled'
  | 'user.enabled'
  | 'user.removed'
  | 'settings.updated'
  | 'backup.triggered'
  | 'trash.purged'

export type AuditResourceType = 'project' | 'api_key' | 'asset' | 'user' | 'settings' | 'backup'

export interface AuditActor {
  name: string
  email: string
  kind: 'staff' | 'system'
}

export interface AuditChange {
  field: string
  before: string | null
  after: string | null
}

export interface AuditEntry {
  id: string
  timestamp: number
  actor: AuditActor
  action: AuditAction
  resource: { type: AuditResourceType; id: string; label: string }
  ip: string
  userAgent: string
  details: Record<string, string | number | boolean | null>
  changes: AuditChange[]
  hash: string
  prevHash: string
}

/* ----------------------------------------------------------- Notifications */

export interface AppNotification {
  id: string
  title: string
  body: string
  createdAt: number
  tone: Tone
  read: boolean
  target?: { view: ViewId; params?: Record<string, string> }
}

/* ---------------------------------------------------------------- Settings */

export interface GeneralSettings {
  workspaceName: string
  publicBaseUrl: string
  timeZone: string
  supportEmail: string
  notFoundResponse: 'empty' | 'branded'
}

export interface StorageSettings {
  storagePath: string
  tempPath: string
  trashRetentionDays: number
  diskWarningPercent: number
  stopUploadsPercent: number
  pathPattern: string
  retainOriginals: boolean
}

export interface ProcessingSettings {
  maxInputMb: number
  maxOutputMb: number
  outputFormat: 'webp' | 'jpeg' | 'original'
  startingQuality: number
  minQuality: number
  qualityStep: number
  maxWidth: number
  maxHeight: number
  stripMetadata: boolean
  workers: number
}

export interface SecuritySettings {
  requireMfa: boolean
  sessionTimeoutMinutes: number
  defaultKeyExpiryDays: number
  defaultRateLimit: number
  dashboardAllowlist: string
}

export interface BackupSettings {
  enabled: boolean
  schedule: string
  retentionDays: number
  target: string
  verifyAfterBackup: boolean
}

export interface AppSettings {
  general: GeneralSettings
  storage: StorageSettings
  processing: ProcessingSettings
  security: SecuritySettings
  backup: BackupSettings
}

export type SettingsSection = keyof AppSettings

/* ----------------------------------------------------------------- Metrics */

export interface DailyPoint {
  date: number
  value: number
}

export interface UploadDay {
  date: number
  requests: number
  /** Rejected at validation (4xx). */
  rejected: number
  /** Accepted but not stored (507 or processing failure). */
  failed: number
}

export interface LatencyDay {
  date: number
  p50: number
  p95: number
}

export interface UsageRequestDay {
  date: number
  projectId: string | null
  requests: number
  success: number
  rejected: number
  failed: number
  inputBytes: number
  outputBytes: number
  averageDurationMs: number
  maxDurationMs: number
}

export interface UsageAssetDay {
  date: number
  projectId: string
  assets: number
  storageBytes: number
}

export interface UsageMetrics {
  asOf: number
  days: number
  daily: UsageRequestDay[]
  assetDaily: UsageAssetDay[]
}

export interface DashboardSummary {
  totalAssets: number
  storageBytes: number
  uploadsLast30Days: {
    total: number
    success: number
    failed: number
    successRate: number
  }
}

export interface TrashSummary {
  objects: number
  bytes: number
}

export type HealthState = 'operational' | 'degraded' | 'watch' | 'down'

export interface HealthCheck {
  id: string
  label: string
  state: HealthState
  summary: string
  detail: string
}

export interface ServerHealth {
  status: 'ok' | 'degraded'
  service: string
  database: 'up' | 'down'
  storage: {
    status: 'healthy' | 'warning' | 'critical'
    writable: boolean
    totalBytes: string
    usedBytes: string
    availableBytes: string
    usedPercent: number
    warningPercent: number
    stopUploadPercent: number
    state: 'healthy' | 'warning' | 'critical'
    acceptsUploads: boolean
  }
  timestamp: string
}
