import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultSettings } from '../data/system'
import { apiRequest, toMessage } from '../lib/api'
import { GENESIS_HASH, sealAuditEntry } from '../lib/audit'
import { MB } from '../lib/constants'
import type {
  ApiKey,
  AppNotification,
  AppSettings,
  Asset,
  DashboardSummary,
  AuditAction,
  AuditEntry,
  AuditResourceType,
  ImageFormat,
  Project,
  ServerHealth,
  SettingsSection,
  StaffUser,
  UploadHttpStatus,
  UploadLog,
  UsageMetrics,
  TrashSummary,
} from '../types'
import { useAuth } from './auth-context'
import { StoreContext, type ApiKeyInput, type CreatedKey, type ProjectInput, type ProjectScope, type Store } from './store-context'

interface Page<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface ApiProject {
  id: string
  name: string
  slug: string
  description: string | null
  domain: string | null
  status: 'active' | 'disabled'
  quotaBytes: string
  allowedFormats: string[]
  maxInputBytes: number
  maxOutputBytes: number
  startingQuality: number
  maxWidth: number
  maxHeight: number
  createdBy?: { name?: string } | null
  createdAt: string
  updatedAt: string
}

interface ApiAsset {
  id: string
  projectId: string
  objectKey: string
  publicUrl: string
  originalObjectKey?: string | null
  originalName: string
  inputMime: string
  outputMime: string
  originalBytes: string
  outputBytes: string
  originalWidth?: number | null
  originalHeight?: number | null
  width: number
  height: number
  quality?: number | null
  processingAttempts?: number
  checksumSha256: string
  originalRetained?: boolean
  requestId: string
  status: 'ready' | 'deleted'
  createdAt: string
}

interface ApiKeyRecord {
  id: string
  projectId: string
  name: string
  publicId: string
  prefix: string
  scopes: string[]
  status: 'active' | 'revoked'
  rateLimitPerMinute: number
  ipAllowlist: string[] | null
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
  createdBy?: { name?: string } | null
  graceEndsAt?: string | null
}

interface ApiUploadLog {
  id: string
  requestId: string
  projectId: string | null
  apiKeyId: string | null
  outcome: 'success' | 'failed'
  httpStatus: number
  sourceIp: string | null
  inputBytes: string | null
  outputBytes: string | null
  durationMs: number
  errorCode: string | null
  errorMessage: string | null
  objectKey: string | null
  createdAt: string
  apiKey?: ApiKeyRecord | null
}

interface ApiUser {
  id: string
  name: string
  email: string
  role: StaffUser['role']
  isActive: boolean
  mfaEnabled: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface ApiAudit {
  id: string
  actorUser?: ApiUser | null
  action: string
  resourceType: string
  resourceId: string | null
  ip: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface ApiSettings {
  storage: { root: string; temp: string; publicBaseUrl: string }
  processing: {
    maxInputBytes: number
    maxOutputBytes: number
    maxInputPixels: number
    maxImageDimension: number
    startingWebpQuality: number
    concurrency: number
  }
  capacity: { warningPercent: number; stopUploadPercent: number }
  saved: Partial<Record<SettingsSection, Record<string, unknown>>>
}

interface ApiUsage {
  generatedAt: string
  days: number
  daily: Array<{
    date: string
    projectId: string | null
    requests: string
    success: string
    rejected: string
    failed: string
    inputBytes: string
    outputBytes: string
    averageDurationMs: string
    maxDurationMs: string
  }>
  assetDaily: Array<{ date: string; projectId: string; assets: string; storageBytes: string }>
  projects: Array<{ projectId: string; assets: string; storageBytes: string; requests30d: string; failed30d: string }>
}

interface ApiDashboardSummary {
  totalAssets: number
  storageBytes: string
  uploadsLast30Days: DashboardSummary['uploadsLast30Days']
}

interface UploadResponse {
  id: string
  requestId: string
  status: 'ready'
  url: string
  objectKey: string
  mimeType: string
  width: number
  height: number
  originalBytes: number
  outputBytes: number
  originalWidth: number
  originalHeight: number
  checksumSha256: string
  originalRetained: boolean
  processing: { format: 'webp'; quality: number; attempts: number }
}

const SUPPORTED_HTTP = new Set([201, 202, 401, 413, 422, 429, 507])
const AUDIT_ACTIONS = new Set<AuditAction>([
  'project.created', 'project.updated', 'project.paused', 'project.resumed', 'api_key.created', 'api_key.rotated',
  'api_key.revoked', 'asset.deleted', 'asset.restored', 'asset.reprocessed', 'user.invited', 'user.role_changed',
  'user.disabled', 'user.enabled', 'user.removed', 'settings.updated', 'backup.triggered', 'trash.purged',
])
const RESOURCE_TYPES = new Set<AuditResourceType>(['project', 'api_key', 'asset', 'user', 'settings', 'backup'])

function timestamp(value: string | null | undefined, fallback = Date.now()): number {
  if (!value) return fallback
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function fetchAllPages<T>(path: string): Promise<Page<T>> {
  const data: T[] = []
  let page = 1
  let response: Page<T>
  do {
    const separator = path.includes('?') ? '&' : '?'
    response = await apiRequest<Page<T>>(`${path}${separator}page=${page}&limit=100`)
    data.push(...response.data)
    page += 1
  } while (page <= response.meta.totalPages)
  return { data, meta: { ...response.meta, page: 1, total: data.length } }
}

function dayTimestamp(value: string): number {
  return Date.parse(`${value.slice(0, 10)}T00:00:00+07:00`)
}

function imageFormat(mime: string): ImageFormat {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  return 'jpeg'
}

function mapAsset(asset: ApiAsset, quality: number | null = null, attempts = 0): Asset {
  return {
    id: asset.id,
    projectId: asset.projectId,
    fileName: asset.originalName,
    objectKey: asset.objectKey,
    publicUrl: asset.publicUrl,
    originalFormat: imageFormat(asset.inputMime),
    outputFormat: imageFormat(asset.outputMime),
    originalWidth: asset.originalWidth ?? asset.width,
    originalHeight: asset.originalHeight ?? asset.height,
    width: asset.width,
    height: asset.height,
    originalBytes: Number(asset.originalBytes),
    optimizedBytes: Number(asset.outputBytes),
    quality: asset.quality ?? quality,
    attempts: asset.processingAttempts ?? attempts,
    status: 'ready',
    uploadedAt: timestamp(asset.createdAt),
    requestId: asset.requestId,
    keyLabel: 'server upload',
    checksum: asset.checksumSha256,
    retainedOriginal: Boolean(asset.originalObjectKey ?? asset.originalRetained),
    preview: { kind: 'blob', url: asset.publicUrl },
  }
}

function mapApiKey(record: ApiKeyRecord, currentUserName: string): ApiKey {
  const scopes = record.scopes.map((scope) => (scope === 'image:upload' ? 'assets:write' : scope))
  return {
    id: record.id,
    name: record.name,
    projectId: record.projectId,
    environment: record.prefix.includes('_test_') ? 'test' : 'live',
    last4: record.publicId.slice(-4).toUpperCase(),
    scopes: scopes.filter((scope): scope is ApiKey['scopes'][number] => ['assets:write', 'assets:read', 'assets:delete'].includes(scope)),
    status: record.status,
    createdBy: record.createdBy?.name ?? currentUserName,
    createdAt: timestamp(record.createdAt),
    lastUsedAt: record.lastUsedAt ? timestamp(record.lastUsedAt) : null,
    expiresAt: record.expiresAt ? timestamp(record.expiresAt) : null,
    rateLimitPerMin: record.rateLimitPerMinute,
    ipAllowlist: record.ipAllowlist ?? [],
    graceEndsAt: record.graceEndsAt ? timestamp(record.graceEndsAt) : undefined,
  }
}

function mapUser(user: ApiUser): StaffUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    status: user.isActive ? 'active' : 'disabled',
    lastActiveAt: user.lastLoginAt ? timestamp(user.lastLoginAt) : null,
    createdAt: timestamp(user.createdAt),
  }
}

function settingsFromApi(remote: ApiSettings): AppSettings {
  const saved = remote.saved ?? {}
  return {
    ...defaultSettings,
    general: { ...defaultSettings.general, ...saved.general, publicBaseUrl: remote.storage.publicBaseUrl } as AppSettings['general'],
    storage: {
      ...defaultSettings.storage,
      ...saved.storage,
      storagePath: remote.storage.root,
      tempPath: remote.storage.temp,
      diskWarningPercent: remote.capacity.warningPercent,
      stopUploadsPercent: remote.capacity.stopUploadPercent,
    },
    processing: {
      ...defaultSettings.processing,
      ...saved.processing,
      maxInputMb: remote.processing.maxInputBytes / MB,
      maxOutputMb: remote.processing.maxOutputBytes / MB,
      startingQuality: remote.processing.startingWebpQuality,
      maxWidth: remote.processing.maxImageDimension,
      maxHeight: remote.processing.maxImageDimension,
      workers: remote.processing.concurrency,
    },
    security: { ...defaultSettings.security, ...saved.security } as AppSettings['security'],
    backup: defaultSettings.backup,
  }
}

function mapLogs(records: ApiUploadLog[], assets: Asset[]): UploadLog[] {
  const assetByRequest = new Map(assets.map((asset) => [asset.requestId, asset]))
  return records.map((record) => {
    const asset = assetByRequest.get(record.requestId)
    const httpStatus = (SUPPORTED_HTTP.has(record.httpStatus) ? record.httpStatus : 422) as UploadHttpStatus
    const failed = record.outcome === 'failed'
    const mapped: UploadLog = {
      id: record.id,
      requestId: record.requestId,
      timestamp: timestamp(record.createdAt),
      projectId: record.projectId ?? '',
      keyLabel: record.apiKey?.prefix ?? 'dashboard session',
      sourceIp: record.sourceIp ?? '—',
      userAgent: 'Server request',
      fileName: asset?.fileName ?? 'Upload request',
      mimeType: asset ? `image/${asset.originalFormat}` : 'image/*',
      originalBytes: Number(record.inputBytes ?? 0),
      optimizedBytes: record.outputBytes == null ? null : Number(record.outputBytes),
      durationMs: record.durationMs,
      httpStatus,
      outcome: failed ? (record.httpStatus >= 500 ? 'failed' : 'rejected') : 'ready',
      assetId: asset?.id ?? null,
      steps: [
        { label: 'Authentication', detail: record.apiKeyId ? 'API key accepted' : 'Dashboard session accepted', state: 'passed' },
        { label: 'Validate & compress', detail: failed ? (record.errorMessage ?? 'Request failed') : 'Image validated and compressed', state: failed ? 'failed' : 'passed', durationMs: record.durationMs },
        { label: 'Store object', detail: record.objectKey ?? 'Object was not stored', state: failed ? 'skipped' : 'passed' },
      ],
      attempts: [],
      objectPath: record.objectKey,
      response: failed
        ? { code: record.errorCode ?? 'UPLOAD_FAILED', message: record.errorMessage ?? 'Upload failed' }
        : { id: asset?.id ?? null, requestId: record.requestId, url: asset?.publicUrl ?? null },
      error: failed ? { code: record.errorCode ?? 'UPLOAD_FAILED', message: record.errorMessage ?? 'Upload failed', hint: 'ตรวจสอบขนาดไฟล์ พื้นที่ดิสก์ และสิทธิ์ของโปรเจกต์ แล้วลองใหม่' } : undefined,
    }
    return mapped
  })
}

function mapAudit(records: ApiAudit[], currentUser: StaffUser): AuditEntry[] {
  let previous = GENESIS_HASH
  const chronological = [...records].reverse().map((record) => {
    const metadata = record.metadata ?? {}
    const details = Object.fromEntries(
      Object.entries(metadata)
        .filter((entry): entry is [string, string | number | boolean | null] => entry[1] == null || ['string', 'number', 'boolean'].includes(typeof entry[1])),
    )
    const action = AUDIT_ACTIONS.has(record.action as AuditAction) ? (record.action as AuditAction) : 'settings.updated'
    const resourceType = RESOURCE_TYPES.has(record.resourceType as AuditResourceType) ? (record.resourceType as AuditResourceType) : 'settings'
    const label = String(metadata.name ?? metadata.prefix ?? metadata.objectKey ?? record.resourceId ?? resourceType)
    const entry = sealAuditEntry({
      timestamp: timestamp(record.createdAt),
      actor: record.actorUser
        ? { name: record.actorUser.name, email: record.actorUser.email, kind: 'staff' }
        : { name: currentUser.name, email: currentUser.email, kind: 'staff' },
      action,
      resource: { type: resourceType, id: record.resourceId ?? record.id, label },
      ip: record.ip ?? '—',
      details,
    }, previous, record.id)
    previous = entry.hash
    return entry
  })
  return chronological.reverse()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) throw new Error('StoreProvider requires an authenticated user')

  const currentUser: StaffUser = useMemo(() => ({
    ...user,
    status: 'active',
    lastActiveAt: null,
    createdAt: 0,
  }), [user])

  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [logs, setLogs] = useState<UploadLog[]>([])
  const [users, setUsers] = useState<StaffUser[]>([currentUser])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [scope, setScope] = useState<ProjectScope>('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [health, setHealth] = useState<ServerHealth | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [usage, setUsage] = useState<UsageMetrics | null>(null)
  const [trash, setTrash] = useState<TrashSummary>({ objects: 0, bytes: 0 })

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const usersRequest = user.role === 'admin'
        ? fetchAllPages<ApiUser>('/users')
        : Promise.resolve({ data: [] } as unknown as Page<ApiUser>)
      const [projectPage, assetPage, keyPage, logPage, userPage, auditPage, remoteSettings, remoteHealth, remoteSummary, remoteUsage, remoteTrash] = await Promise.all([
        fetchAllPages<ApiProject>('/projects'),
        fetchAllPages<ApiAsset>('/assets'),
        fetchAllPages<ApiKeyRecord>('/api-keys'),
        fetchAllPages<ApiUploadLog>('/upload-logs'),
        usersRequest,
        fetchAllPages<ApiAudit>('/audit-logs'),
        apiRequest<ApiSettings>('/settings'),
        apiRequest<ServerHealth>('/health'),
        apiRequest<ApiDashboardSummary>('/dashboard/summary'),
        apiRequest<ApiUsage>('/usage?days=90'),
        apiRequest<TrashSummary>('/assets/trash/summary'),
      ])

      const nextAssets = assetPage.data.map((asset) => mapAsset(asset))
      const nextLogs = mapLogs(logPage.data, nextAssets)
      const usageByProject = new Map<string, { assets: number; bytes: number; requests: number; failed: number; last: number }>()
      projectPage.data.forEach((project) => usageByProject.set(project.id, { assets: 0, bytes: 0, requests: 0, failed: 0, last: timestamp(project.updatedAt) }))
      nextAssets.forEach((asset) => {
        const stats = usageByProject.get(asset.projectId)
        if (!stats) return
        stats.assets += 1
        stats.bytes += asset.optimizedBytes ?? 0
        stats.last = Math.max(stats.last, asset.uploadedAt)
      })
      nextLogs.forEach((log) => {
        const stats = usageByProject.get(log.projectId)
        if (!stats) return
        stats.requests += 1
        if (log.outcome !== 'ready') stats.failed += 1
        stats.last = Math.max(stats.last, log.timestamp)
      })
      const exactUsage = new Map(remoteUsage.projects.map((item) => [item.projectId, item]))
      const nextProjects: Project[] = projectPage.data.map((project) => {
        const stats = usageByProject.get(project.id) ?? { assets: 0, bytes: 0, requests: 0, failed: 0, last: timestamp(project.updatedAt) }
        const exact = exactUsage.get(project.id)
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description ?? '',
          domain: project.domain ?? '',
          status: project.status === 'active' ? 'active' : 'paused',
          owner: project.createdBy?.name ?? currentUser.name,
          assetCount: Number(exact?.assets ?? stats.assets),
          storageBytes: Number(exact?.storageBytes ?? stats.bytes),
          quotaBytes: Number(project.quotaBytes),
          requests30d: Number(exact?.requests30d ?? stats.requests),
          failed30d: Number(exact?.failed30d ?? stats.failed),
          bandwidthMonthBytes: 0,
          lastActivityAt: stats.last,
          createdAt: timestamp(project.createdAt),
          settings: {
            allowedFormats: project.allowedFormats.filter((format): format is ImageFormat => ['jpeg', 'png', 'webp'].includes(format)),
            maxInputBytes: project.maxInputBytes,
            maxOutputBytes: project.maxOutputBytes,
            outputFormat: 'webp',
            startingQuality: project.startingQuality,
            minQuality: defaultSettings.processing.minQuality,
            maxDimension: Math.min(project.maxWidth, project.maxHeight),
            stripMetadata: true,
          },
        }
      })
      const nextUsers = userPage.data.map(mapUser)
      const actualCurrent = nextUsers.find((item) => item.id === currentUser.id) ?? currentUser
      setProjects(nextProjects)
      setAssets(nextAssets)
      setApiKeys(keyPage.data.map((key) => mapApiKey(key, currentUser.name)))
      setLogs(nextLogs)
      setUsers(nextUsers.length ? nextUsers : [actualCurrent])
      setAudit(mapAudit(auditPage.data, actualCurrent))
      setSettings(settingsFromApi(remoteSettings))
      setHealth(remoteHealth)
      setSummary({
        totalAssets: remoteSummary.totalAssets,
        storageBytes: Number(remoteSummary.storageBytes),
        uploadsLast30Days: remoteSummary.uploadsLast30Days,
      })
      setUsage({
        asOf: timestamp(remoteUsage.generatedAt),
        days: remoteUsage.days,
        daily: remoteUsage.daily.map((day) => ({
          date: dayTimestamp(day.date),
          projectId: day.projectId,
          requests: Number(day.requests),
          success: Number(day.success),
          rejected: Number(day.rejected),
          failed: Number(day.failed),
          inputBytes: Number(day.inputBytes),
          outputBytes: Number(day.outputBytes),
          averageDurationMs: Number(day.averageDurationMs),
          maxDurationMs: Number(day.maxDurationMs),
        })),
        assetDaily: remoteUsage.assetDaily.map((day) => ({
          date: dayTimestamp(day.date),
          projectId: day.projectId,
          assets: Number(day.assets),
          storageBytes: Number(day.storageBytes),
        })),
      })
      setTrash(remoteTrash)
      setNotifications(remoteHealth.storage.acceptsUploads ? [] : [{
        id: 'disk-capacity',
        title: 'พื้นที่ดิสก์ถึงจุดหยุดรับอัปโหลด',
        body: `ใช้พื้นที่ ${remoteHealth.storage.usedPercent}% ระบบจะตอบ 507 จนกว่าจะเพิ่มหรือเคลียร์พื้นที่`,
        createdAt: timestamp(remoteHealth.timestamp),
        tone: 'danger',
        read: false,
        target: { view: 'settings', params: { tab: 'storage' } },
      }])
    } catch (error) {
      setLoadError(toMessage(error))
      throw error
    } finally {
      setLoading(false)
    }
  }, [currentUser, user.role])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh().catch(() => undefined), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const createProject = async (input: ProjectInput): Promise<Project> => {
    const created = await apiRequest<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        slug: input.slug,
        description: input.description,
        domain: input.domain || undefined,
        quotaBytes: String(Math.round(input.quotaBytes)),
        allowedFormats: input.settings.allowedFormats,
        maxInputBytes: input.settings.maxInputBytes,
        maxOutputBytes: input.settings.maxOutputBytes,
        startingQuality: input.settings.startingQuality,
        maxWidth: input.settings.maxDimension,
        maxHeight: input.settings.maxDimension,
      }),
    })
    const mapped: Project = {
      id: created.id, name: created.name, slug: created.slug, description: created.description ?? '', domain: input.domain,
      status: 'active', owner: currentUser.name, assetCount: 0, storageBytes: 0, quotaBytes: Number(created.quotaBytes),
      requests30d: 0, failed30d: 0, bandwidthMonthBytes: 0, lastActivityAt: Date.now(), createdAt: timestamp(created.createdAt), settings: input.settings,
    }
    setProjects((prev) => [mapped, ...prev])
    return mapped
  }

  const updateProject = async (id: string, input: ProjectInput): Promise<Project> => {
    await apiRequest<ApiProject>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        domain: input.domain || undefined,
        quotaBytes: String(Math.round(input.quotaBytes)),
        allowedFormats: input.settings.allowedFormats,
        maxInputBytes: input.settings.maxInputBytes,
        maxOutputBytes: input.settings.maxOutputBytes,
        startingQuality: input.settings.startingQuality,
        maxWidth: input.settings.maxDimension,
        maxHeight: input.settings.maxDimension,
      }),
    })
    const existing = projects.find((project) => project.id === id)
    if (!existing) throw new Error('Project not found in dashboard state')
    const updated = { ...existing, ...input, settings: input.settings }
    setProjects((prev) => prev.map((project) => (project.id === id ? updated : project)))
    return updated
  }

  const store: Store = {
    projects, assets, apiKeys, logs, users, audit, settings, notifications, currentUser, scope, loading, loadError, health, summary, usage, trash,
    setScope,
    refresh,
    createProject,
    updateProject,
    async setProjectStatus(id, status) {
      await apiRequest(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'active' ? 'active' : 'disabled' }) })
      setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, status } : project)))
    },
    async uploadFile(projectId, file) {
      const body = new FormData()
      body.append('projectId', projectId)
      body.append('file', file)
      const response = await apiRequest<UploadResponse>('/dashboard/images', { method: 'POST', body })
      const raw: ApiAsset = {
        id: response.id, projectId, objectKey: response.objectKey, publicUrl: response.url, originalName: file.name,
        inputMime: file.type, outputMime: response.mimeType, originalBytes: String(response.originalBytes), outputBytes: String(response.outputBytes),
        width: response.width, height: response.height, originalWidth: response.originalWidth, originalHeight: response.originalHeight,
        quality: response.processing.quality, processingAttempts: response.processing.attempts, checksumSha256: response.checksumSha256,
        originalRetained: response.originalRetained,
        requestId: response.requestId, status: 'ready', createdAt: new Date().toISOString(),
      }
      const asset = mapAsset(raw, response.processing.quality, response.processing.attempts)
      setAssets((prev) => [asset, ...prev])
      return asset
    },
    addUpload(asset, log) {
      setAssets((prev) => [asset, ...prev])
      setLogs((prev) => [log, ...prev])
    },
    async deleteAsset(id) {
      const existing = assets.find((asset) => asset.id === id)
      if (!existing) return undefined
      await apiRequest(`/assets/${id}`, { method: 'DELETE' })
      setAssets((prev) => prev.filter((asset) => asset.id !== id))
      setTrash((prev) => ({ objects: prev.objects + 1, bytes: prev.bytes + (existing.optimizedBytes ?? 0) }))
      return existing
    },
    async restoreAsset(asset) {
      const response = await apiRequest<ApiAsset>(`/assets/${asset.id}/restore`, { method: 'POST' })
      setAssets((prev) => [mapAsset(response, asset.quality, asset.attempts), ...prev])
      setTrash((prev) => ({ objects: Math.max(0, prev.objects - 1), bytes: Math.max(0, prev.bytes - (asset.optimizedBytes ?? 0)) }))
    },
    async retryAsset(id) {
      const response = await apiRequest<ApiAsset>(`/assets/${id}/reprocess`, { method: 'POST' })
      setAssets((prev) => prev.map((asset) => (asset.id === id ? mapAsset(response) : asset)))
    },
    async createApiKey(input: ApiKeyInput): Promise<CreatedKey> {
      const response = await apiRequest<{ apiKey: ApiKeyRecord; token: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          projectId: input.projectId,
          environment: input.environment,
          scopes: input.scopes.includes('assets:write') ? ['image:upload'] : input.scopes,
          rateLimitPerMinute: input.rateLimitPerMin,
          ipAllowlist: input.ipAllowlist,
          expiresAt: input.expiresInDays == null ? undefined : new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString(),
        }),
      })
      const key = mapApiKey(response.apiKey, currentUser.name)
      setApiKeys((prev) => [key, ...prev])
      return { key, secret: response.token }
    },
    async rotateApiKey(id, graceHours) {
      const response = await apiRequest<{ apiKey: ApiKeyRecord; token: string }>(`/api-keys/${id}/rotate`, {
        method: 'POST',
        body: JSON.stringify({ graceHours }),
      })
      const key = mapApiKey(response.apiKey, currentUser.name)
      setApiKeys((prev) => prev.map((item) => (item.id === id ? key : item)))
      return { key, secret: response.token }
    },
    async revokeApiKey(id) {
      await apiRequest(`/api-keys/${id}/revoke`, { method: 'POST' })
      setApiKeys((prev) => prev.map((key) => (key.id === id ? { ...key, status: 'revoked', revokedAt: Date.now() } : key)))
    },
    async inviteUser(input) {
      const response = await apiRequest<ApiUser>('/users', { method: 'POST', body: JSON.stringify(input) })
      const created = mapUser(response)
      setUsers((prev) => [...prev, created])
      return created
    },
    async updateUserRole(id, role) {
      await apiRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })
      setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, role } : item)))
    },
    async setUserStatus(id, status) {
      await apiRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: status === 'active' }) })
      setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    },
    async removeUser(id) {
      await apiRequest(`/users/${id}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((item) => item.id !== id))
    },
    resendInvite() {},
    async updateSettings<S extends SettingsSection>(section: S, values: AppSettings[S]) {
      const response = await apiRequest<ApiSettings>(`/settings/${section}`, {
        method: 'PATCH',
        body: JSON.stringify({ values }),
      })
      setSettings(settingsFromApi(response))
    },
    runBackup() {},
    async purgeTrash() {
      const purged = await apiRequest<TrashSummary>('/assets/trash/purge', { method: 'POST' })
      setTrash({ objects: 0, bytes: 0 })
      return purged
    },
    markNotificationRead(id) {
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)))
    },
    markAllNotificationsRead() {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    },
    appendLogs(newLogs) {
      setLogs((prev) => [...newLogs, ...prev])
    },
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
