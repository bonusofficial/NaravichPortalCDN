import type { AuditAction, AuditActor, AuditChange, AuditEntry, AuditResourceType } from '../types'
import { mockDigest } from './rng'

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  'project.created': 'Created project',
  'project.updated': 'Updated project',
  'project.paused': 'Paused uploads',
  'project.resumed': 'Resumed uploads',
  'api_key.created': 'Created API key',
  'api_key.rotated': 'Rotated API key',
  'api_key.revoked': 'Revoked API key',
  'asset.deleted': 'Deleted asset',
  'asset.restored': 'Restored asset',
  'asset.reprocessed': 'Reprocessed asset',
  'user.invited': 'Invited user',
  'user.role_changed': 'Changed role',
  'user.disabled': 'Disabled user',
  'user.enabled': 'Re-enabled user',
  'user.removed': 'Removed user',
  'settings.updated': 'Updated settings',
  'backup.triggered': 'Started backup',
  'trash.purged': 'Emptied trash',
}

export type AuditCategory = 'project' | 'api_key' | 'asset' | 'user' | 'settings'

export const AUDIT_CATEGORY_LABEL: Record<AuditCategory, string> = {
  project: 'Projects',
  api_key: 'API keys',
  asset: 'Assets',
  user: 'Users',
  settings: 'Settings & backups',
}

export function auditCategory(action: AuditAction): AuditCategory {
  const prefix = action.split('.')[0]
  if (prefix === 'project' || prefix === 'api_key' || prefix === 'asset' || prefix === 'user') return prefix
  return 'settings'
}

export interface AuditInput {
  timestamp: number
  actor: AuditActor
  action: AuditAction
  resource: { type: AuditResourceType; id: string; label: string }
  ip: string
  userAgent?: string
  details?: Record<string, string | number | boolean | null>
  changes?: AuditChange[]
}

export const GENESIS_HASH = '0'.repeat(64)

/** Build an append-only entry whose hash chains to the previous entry. */
export function sealAuditEntry(input: AuditInput, prevHash: string, id: string): AuditEntry {
  const details = input.details ?? {}
  const changes = input.changes ?? []
  const body = JSON.stringify([id, input.timestamp, input.actor.email, input.action, input.resource, input.ip, details, changes, prevHash])
  return {
    id,
    timestamp: input.timestamp,
    actor: input.actor,
    action: input.action,
    resource: input.resource,
    ip: input.ip,
    userAgent: input.userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Safari/605.1.15',
    details,
    changes,
    hash: mockDigest(body),
    prevHash,
  }
}
