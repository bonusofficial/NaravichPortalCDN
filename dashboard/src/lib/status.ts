import type { LucideIcon } from 'lucide-react'
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  Clock,
  FileWarning,
  Gauge,
  HardDrive,
  ImageOff,
  LoaderCircle,
  Lock,
  Pause,
  TriangleAlert,
  Archive,
  CircleX,
} from 'lucide-react'
import type {
  ApiKey,
  ApiKeyStatus,
  AssetStatus,
  HealthState,
  ProjectStatus,
  StaffRole,
  StaffStatus,
  Tone,
  UploadHttpStatus,
} from '../types'
import { DAY, mockNow } from './constants'

export interface StatusMeta {
  label: string
  tone: Tone
  icon: LucideIcon
  description?: string
}

export const HTTP_STATUS_META: Record<UploadHttpStatus, StatusMeta> = {
  201: { label: 'Ready', tone: 'success', icon: CircleCheck, description: 'Stored and available at its public URL.' },
  202: { label: 'Processing', tone: 'info', icon: LoaderCircle, description: 'Accepted; compression is still running.' },
  401: { label: 'Unauthorized', tone: 'danger', icon: Lock, description: 'Missing, revoked, or expired API key.' },
  413: { label: 'Too Large', tone: 'warning', icon: FileWarning, description: 'Input exceeds the maximum upload size.' },
  422: { label: 'Invalid Image', tone: 'warning', icon: ImageOff, description: 'File could not be decoded as JPEG, PNG, or WebP.' },
  429: { label: 'Rate Limited', tone: 'warning', icon: Gauge, description: 'Key exceeded its per-minute request limit.' },
  507: { label: 'Insufficient Storage', tone: 'danger', icon: HardDrive, description: 'Uploads paused: disk above the stop threshold.' },
}

export const HTTP_STATUSES = Object.keys(HTTP_STATUS_META).map(Number) as UploadHttpStatus[]

export const ASSET_STATUS_META: Record<AssetStatus, StatusMeta> = {
  ready: { label: 'Ready', tone: 'success', icon: CircleCheck },
  processing: { label: 'Processing', tone: 'info', icon: LoaderCircle },
  failed: { label: 'Failed', tone: 'danger', icon: CircleAlert },
}

export const PROJECT_STATUS_META: Record<ProjectStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'success', icon: CircleCheck },
  paused: { label: 'Paused', tone: 'warning', icon: Pause },
  archived: { label: 'Archived', tone: 'neutral', icon: Archive },
}

export type KeyDisplayStatus = ApiKeyStatus | 'expiring' | 'rotating'

export const KEY_STATUS_META: Record<KeyDisplayStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'success', icon: CircleCheck },
  expiring: { label: 'Expiring soon', tone: 'warning', icon: Clock },
  rotating: { label: 'Rotating', tone: 'warning', icon: Clock },
  revoked: { label: 'Revoked', tone: 'neutral', icon: Ban },
  expired: { label: 'Expired', tone: 'neutral', icon: CircleSlash },
}

export function keyDisplayStatus(key: ApiKey, now: number = mockNow()): KeyDisplayStatus {
  if (key.status !== 'active') return key.status
  if (key.expiresAt != null && key.expiresAt <= now) return 'expired'
  if (key.graceEndsAt != null) return 'rotating'
  if (key.expiresAt != null && key.expiresAt - now < 14 * DAY) return 'expiring'
  return 'active'
}

export const ROLE_META: Record<StaffRole, { label: string; description: string }> = {
  admin: { label: 'Admin', description: 'Full access, including users, security, and server settings.' },
  operator: { label: 'Operator', description: 'Manage projects, assets, and API keys. No user or security settings.' },
  viewer: { label: 'Viewer', description: 'Read-only access to projects, assets, logs, and usage.' },
}

export const USER_STATUS_META: Record<StaffStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'success', icon: CircleCheck },
  invited: { label: 'Invited', tone: 'info', icon: CircleDashed },
  disabled: { label: 'Disabled', tone: 'neutral', icon: CircleX },
}

export const HEALTH_META: Record<HealthState, StatusMeta> = {
  operational: { label: 'Operational', tone: 'success', icon: CircleCheck },
  watch: { label: 'Watch', tone: 'warning', icon: TriangleAlert },
  degraded: { label: 'Degraded', tone: 'warning', icon: TriangleAlert },
  down: { label: 'Down', tone: 'danger', icon: CircleX },
}

export function httpClass(status: UploadHttpStatus): 'success' | 'client' | 'server' {
  if (status < 300) return 'success'
  if (status < 500) return 'client'
  return 'server'
}
