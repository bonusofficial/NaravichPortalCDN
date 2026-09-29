import { GENESIS_HASH, sealAuditEntry, type AuditInput } from '../lib/audit'
import { HOUR, MINUTE, MOCK_NOW } from '../lib/constants'
import type { AuditActor, AuditEntry } from '../types'

const staff = (name: string, email: string): AuditActor => ({ name, email, kind: 'staff' })

const PIMCHANOK = staff('Pimchanok Srisuk', 'pimchanok.s@example.com')
const ARISA = staff('Arisa Chaiyaporn', 'arisa.c@example.com')
const THANAWAT = staff('Thanawat Kittisak', 'thanawat.k@example.com')
const NATTAYA = staff('Nattaya Wongsa', 'nattaya.w@example.com')
const KRIT = staff('Krit Boonmee', 'krit.b@example.com')
const SYSTEM: AuditActor = { name: 'System', email: 'scheduler@vps-bkk-01', kind: 'system' }

const at = (iso: string) => Date.parse(`${iso}+07:00`)
const OFFICE_IP = '203.0.113.5'
const VPN_IP = '10.8.0.14'

const inputs: AuditInput[] = [
  {
    timestamp: at('2026-08-31T09:00:00'),
    actor: SYSTEM,
    action: 'api_key.revoked',
    resource: { type: 'api_key', id: 'key_cms_migration', label: 'CMS bulk migration' },
    ip: '127.0.0.1',
    details: { reason: 'expired', key_prefix: 'ncdn_live_…M8ZB', project: 'internal-cms' },
    changes: [{ field: 'status', before: 'active', after: 'expired' }],
  },
  {
    timestamp: at('2026-09-01T10:14:00'),
    actor: ARISA,
    action: 'user.invited',
    resource: { type: 'user', id: 'usr_krit', label: 'krit.b@example.com' },
    ip: OFFICE_IP,
    details: { role: 'operator', invite_expires_in: '7 days' },
  },
  {
    timestamp: at('2026-09-02T15:31:00'),
    actor: PIMCHANOK,
    action: 'settings.updated',
    resource: { type: 'settings', id: 'processing', label: 'Image processing' },
    ip: OFFICE_IP,
    details: { section: 'processing' },
    changes: [
      { field: 'starting_quality', before: '85', after: '82' },
      { field: 'max_output_mb', before: '6', after: '5' },
    ],
  },
  {
    timestamp: at('2026-09-04T11:02:00'),
    actor: THANAWAT,
    action: 'project.updated',
    resource: { type: 'project', id: 'prj_partner', label: 'Partner Portal' },
    ip: OFFICE_IP,
    details: { slug: 'partner-portal' },
    changes: [{ field: 'max_input_mb', before: '25', after: '20' }],
  },
  {
    timestamp: at('2026-09-06T02:00:00'),
    actor: SYSTEM,
    action: 'trash.purged',
    resource: { type: 'settings', id: 'trash', label: 'Trash' },
    ip: '127.0.0.1',
    details: { objects: 1_284, bytes_freed: '3.8 GB', retention_days: 30 },
  },
  {
    timestamp: at('2026-09-08T09:47:00'),
    actor: NATTAYA,
    action: 'asset.deleted',
    resource: { type: 'asset', id: '019c3e4a91b0', label: 'infographic-claim-steps-old.png' },
    ip: VPN_IP,
    details: { project: 'internal-cms', bytes: '1.42 MB', retention: 'Kept in trash for 30 days' },
  },
  {
    timestamp: at('2025-01-15T11:00:00'),
    actor: ARISA,
    action: 'project.created',
    resource: { type: 'project', id: 'prj_campaign', label: 'Campaign Landing Pages' },
    ip: OFFICE_IP,
    details: { slug: 'campaign-landing', quota: '100 GB', output_format: 'webp' },
  },
  {
    timestamp: at('2026-09-11T08:58:00'),
    actor: PIMCHANOK,
    action: 'user.role_changed',
    resource: { type: 'user', id: 'usr_somchai', label: 'somchai.r@example.com' },
    ip: OFFICE_IP,
    changes: [{ field: 'role', before: 'operator', after: 'viewer' }],
  },
  {
    timestamp: at('2026-09-12T16:40:00'),
    actor: THANAWAT,
    action: 'api_key.rotated',
    resource: { type: 'api_key', id: 'key_partner_api', label: 'Partner portal backend' },
    ip: OFFICE_IP,
    details: { project: 'partner-portal', grace_period: '24 hours', new_prefix: 'ncdn_live_…K7RD' },
  },
  {
    timestamp: at('2026-09-15T10:03:00'),
    actor: PIMCHANOK,
    action: 'settings.updated',
    resource: { type: 'settings', id: 'storage', label: 'Storage' },
    ip: OFFICE_IP,
    details: { section: 'storage' },
    changes: [
      { field: 'disk_warning_percent', before: '75', after: '70' },
      { field: 'stop_uploads_percent', before: '90', after: '88' },
    ],
  },
  {
    timestamp: at('2026-09-17T14:12:00'),
    actor: KRIT,
    action: 'asset.deleted',
    resource: { type: 'asset', id: '019c52be07ad', label: 'promo-banner-3-draft.jpg' },
    ip: VPN_IP,
    details: { project: 'campaign-landing', bytes: '842 KB', retention: 'Kept in trash for 30 days' },
  },
  {
    timestamp: at('2026-09-18T09:30:00'),
    actor: ARISA,
    action: 'user.disabled',
    resource: { type: 'user', id: 'usr_warut', label: 'warut.p@example.com' },
    ip: OFFICE_IP,
    details: { reason: 'Left the company' },
    changes: [{ field: 'status', before: 'active', after: 'disabled' }],
  },
  {
    timestamp: at('2026-09-20T11:45:00'),
    actor: NATTAYA,
    action: 'project.updated',
    resource: { type: 'project', id: 'prj_careers', label: 'Careers Site' },
    ip: VPN_IP,
    changes: [
      { field: 'output_format', before: 'webp', after: 'jpeg' },
      { field: 'max_dimension', before: '4096', after: '2560' },
    ],
  },
  {
    timestamp: at('2026-09-23T10:04:00'),
    actor: THANAWAT,
    action: 'project.paused',
    resource: { type: 'project', id: 'prj_catalog', label: 'Product Catalog' },
    ip: OFFICE_IP,
    details: { reason: 'Catalogue migration to new SKU scheme' },
    changes: [{ field: 'status', before: 'active', after: 'paused' }],
  },
  {
    timestamp: at('2026-09-23T10:05:00'),
    actor: THANAWAT,
    action: 'api_key.revoked',
    resource: { type: 'api_key', id: 'key_catalog', label: 'Catalogue importer' },
    ip: OFFICE_IP,
    details: { project: 'product-catalog', key_prefix: 'ncdn_live_…D1WS' },
    changes: [{ field: 'status', before: 'active', after: 'revoked' }],
  },
  {
    timestamp: at('2026-09-24T17:20:00'),
    actor: PIMCHANOK,
    action: 'settings.updated',
    resource: { type: 'settings', id: 'security', label: 'Security' },
    ip: OFFICE_IP,
    details: { section: 'security' },
    changes: [{ field: 'session_timeout_minutes', before: '120', after: '60' }],
  },
  {
    timestamp: at('2026-09-27T09:12:00'),
    actor: ARISA,
    action: 'user.invited',
    resource: { type: 'user', id: 'usr_ploy', label: 'ploypailin.c@example.com' },
    ip: OFFICE_IP,
    details: { role: 'viewer', invite_expires_in: '7 days' },
  },
  {
    timestamp: at('2026-09-28T15:50:00'),
    actor: NATTAYA,
    action: 'asset.restored',
    resource: { type: 'asset', id: '019c3e4a91b0', label: 'infographic-claim-steps-old.png' },
    ip: VPN_IP,
    details: { project: 'internal-cms', restored_from: 'trash' },
  },
  {
    timestamp: at('2026-09-29T02:00:00'),
    actor: SYSTEM,
    action: 'backup.triggered',
    resource: { type: 'backup', id: 'bkp_20260929', label: 'Nightly backup' },
    ip: '127.0.0.1',
    details: { schedule: 'daily 02:00 ICT', snapshot: '382.9 GB', duration: '38 min', status: 'succeeded' },
  },
  {
    timestamp: at('2026-07-01T14:20:00'),
    actor: ARISA,
    action: 'api_key.created',
    resource: { type: 'api_key', id: 'key_campaign', label: 'Campaign builder' },
    ip: OFFICE_IP,
    details: { project: 'campaign-landing', scopes: 'assets:write', expires: '31 Dec 2026', rate_limit: '120/min' },
  },
  {
    timestamp: MOCK_NOW - 3 * HOUR - 20 * MINUTE,
    actor: THANAWAT,
    action: 'asset.deleted',
    resource: { type: 'asset', id: '019c7d10e4c2', label: 'dealer-banner-south-2.jpg' },
    ip: OFFICE_IP,
    details: { project: 'partner-portal', bytes: '612 KB', retention: 'Kept in trash for 30 days' },
  },
  {
    timestamp: MOCK_NOW - 48 * MINUTE,
    actor: PIMCHANOK,
    action: 'project.updated',
    resource: { type: 'project', id: 'prj_main', label: 'Naravich Main Website' },
    ip: OFFICE_IP,
    changes: [{ field: 'quota', before: '200 GB', after: '250 GB' }],
  },
]

function seal(): AuditEntry[] {
  const sorted = [...inputs].sort((a, b) => a.timestamp - b.timestamp)
  const entries: AuditEntry[] = []
  let prev = GENESIS_HASH
  sorted.forEach((input, index) => {
    const entry = sealAuditEntry(input, prev, `evt_${String(10_421 + index)}`)
    entries.push(entry)
    prev = entry.hash
  })
  return entries.reverse()
}

/** Newest first. */
export const seedAudit: AuditEntry[] = seal()
