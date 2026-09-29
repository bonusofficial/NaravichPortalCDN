import { Check as CheckIcon, Mail, Minus, MoreHorizontal, ShieldAlert, ShieldCheck, UserCog, UserMinus, UserPlus, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { Toolbar } from '../../components/data-table/Toolbar'
import { PageHeader } from '../../components/layout/PageHeader'
import { Person } from '../../components/ui/Avatar'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput, Select } from '../../components/ui/Field'
import { Menu, MenuItem, MenuSeparator } from '../../components/ui/Menu'
import { Alert, EmptyState } from '../../components/ui/States'
import type { RouteParams } from '../../lib/router'
import { ROLE_META, USER_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { StaffRole, StaffStatus, StaffUser } from '../../types'
import { TimeCell } from '../shared'
import { EditRoleDialog, InviteUserDialog } from './UserDialogs'

const PERMISSIONS: { label: string; roles: StaffRole[] }[] = [
  { label: 'View projects, assets, logs, and usage', roles: ['admin', 'operator', 'viewer'] },
  { label: 'Upload and delete assets', roles: ['admin', 'operator'] },
  { label: 'Create, edit, and pause projects', roles: ['admin', 'operator'] },
  { label: 'Create, rotate, and revoke API keys', roles: ['admin', 'operator'] },
  { label: 'Manage staff users and roles', roles: ['admin'] },
  { label: 'Change storage, processing, security, and backup settings', roles: ['admin'] },
]

type Pending = { kind: 'disable' | 'enable' | 'remove'; user: StaffUser } | null

export function UsersView({ params }: { params: RouteParams }) {
  const { users, currentUser, settings, setUserStatus, removeUser, resendInvite } = useStore()
  const { notify } = useToast()
  const [query, setQuery] = useState(params.q ?? '')
  const [role, setRole] = useState<'all' | StaffRole>('all')
  const [status, setStatus] = useState<'all' | StaffStatus>('all')
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [pending, setPending] = useState<Pending>(null)

  const q = query.trim().toLowerCase()
  const rows = users.filter(
    (user) =>
      (role === 'all' || user.role === role) &&
      (status === 'all' || user.status === status) &&
      (!q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)),
  )
  const activeAdmins = users.filter((user) => user.role === 'admin' && user.status === 'active').length
  const withoutMfa = users.filter((user) => user.status === 'active' && !user.mfaEnabled)

  const columns: Column<StaffUser>[] = [
    {
      id: 'user',
      header: 'User',
      sticky: true,
      sortValue: (user) => user.name,
      cell: (user) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Person name={user.name} meta={user.email} />
          {user.id === currentUser.id ? <Badge tone="info">You</Badge> : null}
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortValue: (user) => user.role,
      cell: (user) => (
        <Badge tone={user.role === 'admin' ? 'info' : 'neutral'} square>
          {ROLE_META[user.role].label}
        </Badge>
      ),
    },
    {
      id: 'mfa',
      header: 'MFA',
      sortValue: (user) => (user.mfaEnabled ? 1 : 0),
      cell: (user) =>
        user.status === 'invited' ? (
          <span className="cell-muted">Pending sign-in</span>
        ) : user.mfaEnabled ? (
          <span className="mfa-state mfa-state--on">
            <ShieldCheck aria-hidden="true" />
            Enabled
          </span>
        ) : (
          <span className="mfa-state mfa-state--off">
            <ShieldAlert aria-hidden="true" />
            Not enabled
          </span>
        ),
    },
    { id: 'status', header: 'Status', sortValue: (user) => user.status, cell: (user) => <StatusBadge meta={USER_STATUS_META[user.status]} /> },
    {
      id: 'lastActive',
      header: 'Last active',
      sortValue: (user) => user.lastActiveAt ?? 0,
      cell: (user) =>
        user.id === currentUser.id ? (
          <span className="text-success">Active now</span>
        ) : user.status === 'invited' ? (
          <span className="cell-muted">
            Invited <TimeCell ts={user.createdAt} />
          </span>
        ) : (
          <TimeCell ts={user.lastActiveAt} />
        ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      width: 56,
      cell: (user) => {
        const self = user.id === currentUser.id
        const lastAdmin = user.role === 'admin' && activeAdmins <= 1
        return (
          <Menu
            label={`Actions for ${user.name}`}
            trigger={(props) => <Button {...props} variant="ghost" size="sm" iconOnly icon={MoreHorizontal} aria-label={`Actions for ${user.name}`} />}
          >
            <MenuItem icon={UserCog} disabled={user.status === 'disabled'} onSelect={() => setEditing(user)}>
              Change role…
            </MenuItem>
            {user.status === 'invited' ? (
              <MenuItem
                icon={Mail}
                onSelect={() => {
                  resendInvite(user.id)
                  notify({ title: 'Invitation resent', description: `A new link was sent to ${user.email}.` })
                }}
              >
                Resend invitation
              </MenuItem>
            ) : null}
            <MenuSeparator />
            {user.status === 'disabled' ? (
              <MenuItem icon={UserPlus} onSelect={() => setPending({ kind: 'enable', user })}>
                Re-enable access
              </MenuItem>
            ) : (
              <MenuItem
                icon={UserX}
                disabled={self || lastAdmin}
                hint={self ? 'You can’t disable yourself' : lastAdmin ? 'Last active admin' : undefined}
                onSelect={() => setPending({ kind: 'disable', user })}
              >
                Disable access…
              </MenuItem>
            )}
            <MenuItem
              icon={UserMinus}
              tone="danger"
              disabled={self || lastAdmin}
              hint={self ? 'You can’t remove yourself' : undefined}
              onSelect={() => setPending({ kind: 'remove', user })}
            >
              Remove user…
            </MenuItem>
          </Menu>
        )
      },
    },
  ]

  return (
    <div className="view">
      <PageHeader
        title="Users"
        description="Staff who can sign in to the CDN Manager. Roles control what each person can view and change."
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => setInviting(true)}>
            Invite user
          </Button>
        }
      />

      {settings.security.requireMfa && withoutMfa.length ? (
        <Alert
          tone="warning"
          icon={ShieldAlert}
          title={`${withoutMfa.length} active ${withoutMfa.length === 1 ? 'user has' : 'users have'} not enabled MFA`}
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => notify({ title: 'Reminder sent', description: withoutMfa.map((user) => user.email).join(', ') })}
            >
              Send reminder
            </Button>
          }
        >
          {withoutMfa.map((user) => user.name).join(', ')} will be asked to set up MFA at their next sign-in.
        </Alert>
      ) : null}

      <Card>
        <Toolbar label="User filters" end={<span className="muted" style={{ fontSize: 13 }}>{users.length} users</span>}>
          <SearchInput label="Search users" placeholder="Name or email" value={query} onValueChange={setQuery} />
          <Select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value as 'all' | StaffRole)}>
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </Select>
          <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as 'all' | StaffStatus)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </Select>
        </Toolbar>
        <DataTable
          label="Staff users"
          columns={columns}
          rows={rows}
          getRowId={(user) => user.id}
          empty={
            <EmptyState
              icon={Users}
              title="No users match"
              description="Try another name, role, or status."
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setRole('all')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          }
        />
      </Card>

      <Card>
        <CardHeader title="Role permissions" subtitle="What each role can do in the CDN Manager" divided />
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Role permissions">
          <table className="table table--compact role-matrix">
            <caption className="sr-only">Permissions by role</caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left' }}>
                  Capability
                </th>
                <th scope="col">Admin</th>
                <th scope="col">Operator</th>
                <th scope="col">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission.label}>
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 400, color: 'var(--ink-secondary)' }}>
                    {permission.label}
                  </th>
                  {(['admin', 'operator', 'viewer'] as const).map((r) => (
                    <td key={r}>
                      {permission.roles.includes(r) ? (
                        <CheckIcon className="yes" aria-label="Allowed" />
                      ) : (
                        <Minus className="no" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <InviteUserDialog open={inviting} onClose={() => setInviting(false)} />
      <EditRoleDialog user={editing} onClose={() => setEditing(null)} lastAdmin={activeAdmins <= 1} />
      <ConfirmDialog
        open={pending?.kind === 'disable'}
        onClose={() => setPending(null)}
        title={`Disable ${pending?.user.name ?? ''}?`}
        description="They’ll be signed out immediately and can’t sign in until re-enabled. Their audit history is kept."
        confirmLabel="Disable access"
        icon={UserX}
        onConfirm={() => {
          if (!pending) return
          setUserStatus(pending.user.id, 'disabled')
          notify({ title: 'Access disabled', description: pending.user.email })
          setPending(null)
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'enable'}
        onClose={() => setPending(null)}
        title={`Re-enable ${pending?.user.name ?? ''}?`}
        description="They’ll be able to sign in again with their existing role."
        confirmLabel="Re-enable"
        tone="brand"
        icon={UserPlus}
        onConfirm={() => {
          if (!pending) return
          setUserStatus(pending.user.id, 'active')
          notify({ title: 'Access re-enabled', description: pending.user.email })
          setPending(null)
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'remove'}
        onClose={() => setPending(null)}
        title={`Remove ${pending?.user.name ?? ''}?`}
        description="The account is deleted and cannot sign in. Audit entries remain attributed to this email address."
        confirmLabel="Remove user"
        icon={UserMinus}
        confirmText="remove"
        onConfirm={() => {
          if (!pending) return
          removeUser(pending.user.id)
          notify({ title: 'User removed', description: pending.user.email })
          setPending(null)
        }}
      />
    </div>
  )
}
