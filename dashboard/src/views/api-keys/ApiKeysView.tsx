import { Ban, Copy, KeyRound, MoreHorizontal, Plus, RefreshCw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { Toolbar } from '../../components/data-table/Toolbar'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge, Tag } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput, Select } from '../../components/ui/Field'
import { Menu, MenuItem, MenuSeparator } from '../../components/ui/Menu'
import { Alert, EmptyState } from '../../components/ui/States'
import { copyText } from '../../hooks/useClipboard'
import { maskKey } from '../../lib/ids'
import { toMessage } from '../../lib/api'
import { DAY, mockNow } from '../../lib/constants'
import { formatDate, formatRelative } from '../../lib/format'
import { shortKeyLabel } from '../../lib/pipeline'
import type { RouteParams } from '../../lib/router'
import { KEY_STATUS_META, keyDisplayStatus, type KeyDisplayStatus } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { ApiKey } from '../../types'
import { ProjectName, TimeCell } from '../shared'
import { useScope } from '../useScope'
import { CreateKeyDialog } from './CreateKeyDialog'
import { RotateKeyDialog } from './RotateKeyDialog'
import { UsageSnippet } from './UsageSnippet'

type StatusFilter = 'all' | KeyDisplayStatus

export function ApiKeysView({ params }: { params: RouteParams }) {
  const { apiKeys, projects, revokeApiKey } = useStore()
  const { scope, setScope, scopedProject, inScope } = useScope()
  const { notify } = useToast()
  const [query, setQuery] = useState(params.q ?? '')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [creating, setCreating] = useState(false)
  const [rotating, setRotating] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)

  const q = query.trim().toLowerCase()
  const rows = apiKeys.filter((key) => {
    const display = keyDisplayStatus(key)
    return (
      inScope(key.projectId) &&
      (status === 'all' || display === status) &&
      (!q || key.name.toLowerCase().includes(q) || key.last4.toLowerCase().includes(q) || key.createdBy.toLowerCase().includes(q))
    )
  })
  const activeCount = apiKeys.filter((key) => inScope(key.projectId) && key.status === 'active').length
  const exampleSlug = scopedProject?.slug ?? projects[0]?.slug ?? 'website-a'

  const columns: Column<ApiKey>[] = [
    {
      id: 'name',
      header: 'Key name / prefix',
      sticky: true,
      sortValue: (key) => key.name,
      cell: (key) => (
        <span className="cell-stack">
          <span className="cell-title cell-title--narrow">{key.name}</span>
          <span className="cell-sub mono" title="Only the last 4 characters are stored in clear text">
            {maskKey(key.environment, key.last4)}
          </span>
        </span>
      ),
    },
    {
      id: 'project',
      header: 'Project',
      sortValue: (key) => key.projectId,
      cell: (key) => (
        <span className="cell-clip">
          <ProjectName projectId={key.projectId} />
        </span>
      ),
    },
    {
      id: 'scopes',
      header: 'Scopes',
      cell: (key) => (
        <span className="cell-stack">
          <span className="tag-list" aria-label={`Scopes: ${key.scopes.join(', ')}`}>
            {key.scopes.map((scope) => (
              <Tag key={scope} title={scope}>
                {scope.replace('assets:', '')}
              </Tag>
            ))}
          </span>
          <span className="cell-sub">
            {key.rateLimitPerMin}/min · {key.ipAllowlist.length ? `${key.ipAllowlist.length} allowed IP${key.ipAllowlist.length > 1 ? 's' : ''}` : 'any IP'}
          </span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (key) => keyDisplayStatus(key),
      cell: (key) => {
        const display = keyDisplayStatus(key)
        return (
          <span className="cell-stack">
            <StatusBadge meta={KEY_STATUS_META[display]} />
            {display === 'rotating' && key.graceEndsAt ? <span className="cell-sub">Stops {formatRelative(key.graceEndsAt)}</span> : null}
          </span>
        )
      },
    },
    {
      id: 'created',
      header: 'Created / by',
      sortValue: (key) => key.createdAt,
      cell: (key) => (
        <span className="cell-stack">
          <span>{formatDate(key.createdAt)}</span>
          <span className="cell-sub">{key.createdBy}</span>
        </span>
      ),
    },
    { id: 'lastUsed', header: 'Last used', sortValue: (key) => key.lastUsedAt ?? 0, cell: (key) => <TimeCell ts={key.lastUsedAt} /> },
    {
      id: 'expiry',
      header: 'Expiry',
      sortValue: (key) => key.expiresAt ?? Number.MAX_SAFE_INTEGER,
      cell: (key) => {
        if (key.expiresAt == null) return <span className="text-warning">Never</span>
        const soon = key.status === 'active' && key.expiresAt - mockNow() < 14 * DAY && key.expiresAt > mockNow()
        return (
          <span className="cell-stack">
            <span className={soon ? 'text-warning' : undefined}>{formatDate(key.expiresAt)}</span>
            {key.status === 'active' ? <span className="cell-sub">{formatRelative(key.expiresAt)}</span> : null}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      width: 56,
      cell: (key) => {
        const usable = key.status === 'active' && keyDisplayStatus(key) !== 'expired'
        return (
          <Menu
            label={`Actions for ${key.name}`}
            trigger={(props) => <Button {...props} variant="ghost" size="sm" iconOnly icon={MoreHorizontal} aria-label={`Actions for ${key.name}`} />}
          >
            <MenuItem
              icon={Copy}
              hint="The full secret is never stored"
              onSelect={async () => {
                const prefix = shortKeyLabel(key.environment, key.last4)
                const ok = await copyText(prefix)
                notify(ok ? { title: 'Key prefix copied', description: prefix, duration: 3000 } : { tone: 'error', title: 'Could not copy' })
              }}
            >
              Copy key prefix
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={RefreshCw} disabled={!usable || key.graceEndsAt != null} onSelect={() => setRotating(key)}>
              Rotate…
            </MenuItem>
            <MenuItem icon={Ban} tone="danger" disabled={key.status !== 'active'} onSelect={() => setRevoking(key)}>
              Revoke…
            </MenuItem>
          </Menu>
        )
      },
    },
  ]

  return (
    <div className="view">
      <PageHeader
        title="API Keys"
        description="Keys authenticate image uploads from website backends. Each key belongs to one project and can be rotated or revoked at any time."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            Create API key
          </Button>
        }
      />

      <Alert tone="warning" icon={ShieldAlert} title="Use keys only from trusted website backends">
        Store keys in server-side environment variables. Never place them in browser JavaScript, HTML, or mobile apps, and never commit them to
        source control. If a key is exposed, revoke it immediately.
      </Alert>

      <Card>
        <Toolbar
          label="API key filters"
          end={
            <span className="muted" style={{ fontSize: 13 }}>
              {activeCount} active {activeCount === 1 ? 'key' : 'keys'}
            </span>
          }
        >
          <SearchInput label="Search keys" placeholder="Name, last 4 characters, or creator" value={query} onValueChange={setQuery} />
          <Select aria-label="Project" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring soon</option>
            <option value="rotating">Rotating</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </Select>
        </Toolbar>
        <DataTable
          label="API keys"
          columns={columns}
          rows={rows}
          getRowId={(key) => key.id}
          initialSort={{ id: 'created', direction: 'desc' }}
          empty={
            <EmptyState
              icon={KeyRound}
              title={q || status !== 'all' ? 'No keys match these filters' : 'No API keys yet'}
              description={q || status !== 'all' ? 'Try another search or status.' : 'Create a key for the website backend that uploads images to this project.'}
              actions={
                q || status !== 'all' ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      setStatus('all')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                    Create API key
                  </Button>
                )
              }
            />
          }
        />
      </Card>

      <UsageSnippet projectSlug={exampleSlug} />

      <CreateKeyDialog open={creating} onClose={() => setCreating(false)} defaultProjectId={scopedProject?.id} />
      <RotateKeyDialog apiKey={rotating} onClose={() => setRotating(null)} />
      <ConfirmDialog
        open={revoking != null}
        onClose={() => setRevoking(null)}
        title={`Revoke “${revoking?.name ?? ''}”?`}
        description={
          <>
            Requests signed with <span className="mono">{revoking ? shortKeyLabel(revoking.environment, revoking.last4) : ''}</span> will fail with 401
            immediately. This cannot be undone.
          </>
        }
        confirmLabel="Revoke key"
        icon={Ban}
        confirmText="revoke"
        onConfirm={async () => {
          if (!revoking) return
          try {
            await revokeApiKey(revoking.id)
            notify({ tone: 'success', title: 'Key revoked', description: `${revoking.name} can no longer upload.` })
            setRevoking(null)
          } catch (error) {
            notify({ tone: 'error', title: 'Could not revoke key', description: toMessage(error) })
          }
        }}
      />
    </div>
  )
}
