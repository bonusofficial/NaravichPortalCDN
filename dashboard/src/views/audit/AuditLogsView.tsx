import { FileDown, History, Lock } from 'lucide-react'
import { useState } from 'react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { Pagination } from '../../components/data-table/Pagination'
import { Toolbar } from '../../components/data-table/Toolbar'
import { PageHeader } from '../../components/layout/PageHeader'
import { Person } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SearchInput, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/States'
import { usePagination } from '../../hooks/usePagination'
import { AUDIT_ACTION_LABEL, AUDIT_CATEGORY_LABEL, auditCategory, type AuditCategory } from '../../lib/audit'
import { DAY, mockNow } from '../../lib/constants'
import { downloadText, toCsv } from '../../lib/download'
import { formatDateTime, formatIsoBangkok, formatNumber } from '../../lib/format'
import { setRouteParams, type RouteParams } from '../../lib/router'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { AuditEntry } from '../../types'
import { AuditDrawer } from './AuditDrawer'

type DateFilter = 'any' | '24h' | '7d' | '30d'
const WINDOW: Record<Exclude<DateFilter, 'any'>, number> = { '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY }

export function AuditLogsView({ params }: { params: RouteParams }) {
  const { audit } = useStore()
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | AuditCategory>('all')
  const [actor, setActor] = useState('all')
  const [date, setDate] = useState<DateFilter>('any')

  const actors = Array.from(new Map(audit.map((entry) => [entry.actor.email, entry.actor])).values()).sort((a, b) => a.name.localeCompare(b.name))
  const q = query.trim().toLowerCase()
  const now = mockNow()
  const rows = audit.filter(
    (entry) =>
      (category === 'all' || auditCategory(entry.action) === category) &&
      (actor === 'all' || entry.actor.email === actor) &&
      (date === 'any' || now - entry.timestamp <= WINDOW[date]) &&
      (!q ||
        entry.resource.label.toLowerCase().includes(q) ||
        entry.action.includes(q) ||
        AUDIT_ACTION_LABEL[entry.action].toLowerCase().includes(q) ||
        entry.actor.name.toLowerCase().includes(q) ||
        entry.ip.includes(q)),
  )
  const pagination = usePagination(rows, [category, actor, date, q].join('|'), 25)
  const selected = audit.find((entry) => entry.id === params.id)

  const exportCsv = () => {
    const csv = toCsv([
      ['id', 'timestamp', 'actor_name', 'actor_email', 'action', 'resource_type', 'resource_id', 'resource_label', 'ip', 'details'],
      ...rows.map((entry) => [
        entry.id,
        formatIsoBangkok(entry.timestamp),
        entry.actor.name,
        entry.actor.email,
        entry.action,
        entry.resource.type,
        entry.resource.id,
        entry.resource.label,
        entry.ip,
        JSON.stringify({ ...entry.details, changes: entry.changes }),
      ]),
    ])
    downloadText(csv, `naravich-cdn-audit-${formatIsoBangkok(now).slice(0, 10)}.csv`, 'text/csv')
    notify({ title: 'Audit log exported', description: `${formatNumber(rows.length)} entries as CSV.` })
  }

  const columns: Column<AuditEntry>[] = [
    {
      id: 'time',
      header: 'Date & time (ICT)',
      sortValue: (entry) => entry.timestamp,
      cell: (entry) => <span className="cell-mono">{formatDateTime(entry.timestamp)}</span>,
    },
    {
      id: 'actor',
      header: 'Actor',
      sortValue: (entry) => entry.actor.name,
      cell: (entry) => <Person name={entry.actor.name} meta={entry.actor.kind === 'system' ? 'Scheduled job' : entry.actor.email} system={entry.actor.kind === 'system'} />,
    },
    {
      id: 'action',
      header: 'Action',
      primary: true,
      sticky: true,
      sortValue: (entry) => entry.action,
      cell: (entry) => (
        <span className="cell-stack">
          <span className="cell-title">{AUDIT_ACTION_LABEL[entry.action]}</span>
          <span className="action-code">{entry.action}</span>
        </span>
      ),
    },
    {
      id: 'resource',
      header: 'Resource',
      cell: (entry) => (
        <span className="cell-stack">
          <span className="cell-title" style={{ fontWeight: 400 }}>
            {entry.resource.label}
          </span>
          <span className="cell-sub">{entry.resource.type.replace('_', ' ')}</span>
        </span>
      ),
    },
    { id: 'ip', header: 'IP address', cell: (entry) => <span className="cell-mono">{entry.ip}</span> },
    {
      id: 'changes',
      header: 'Changes',
      align: 'right',
      cell: (entry) => (entry.changes.length ? `${entry.changes.length} field${entry.changes.length > 1 ? 's' : ''}` : <span className="cell-muted">—</span>),
    },
  ]

  return (
    <div className="view">
      <PageHeader
        title="Audit Logs"
        description="Append-only history of changes made in the CDN Manager and by scheduled jobs on the server."
        actions={
          <Button variant="secondary" icon={FileDown} onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
      />
      <Card>
        <Toolbar
          label="Audit filters"
          end={
            <span className="immutable-note">
              <Lock aria-hidden="true" />
              Append-only
            </span>
          }
        >
          <SearchInput label="Search audit log" placeholder="Resource, action, actor, or IP" value={query} onValueChange={setQuery} />
          <Select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value as 'all' | AuditCategory)}>
            <option value="all">All categories</option>
            {(Object.keys(AUDIT_CATEGORY_LABEL) as AuditCategory[]).map((key) => (
              <option key={key} value={key}>
                {AUDIT_CATEGORY_LABEL[key]}
              </option>
            ))}
          </Select>
          <Select aria-label="Actor" value={actor} onChange={(event) => setActor(event.target.value)}>
            <option value="all">All actors</option>
            {actors.map((item) => (
              <option key={item.email} value={item.email}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Date" value={date} onChange={(event) => setDate(event.target.value as DateFilter)}>
            <option value="any">Any time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </Select>
        </Toolbar>
        <DataTable
          label="Audit log entries"
          columns={columns}
          rows={pagination.pageItems}
          getRowId={(entry) => entry.id}
          onRowClick={(entry) => setRouteParams('audit', { id: entry.id })}
          rowLabel={(entry) => `Open ${AUDIT_ACTION_LABEL[entry.action]} on ${entry.resource.label}`}
          selectedId={selected?.id}
          empty={<EmptyState icon={History} title="No entries match" description="Try another category, actor, or date range." />}
        />
        {rows.length > 0 ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            pageCount={pagination.pageCount}
            total={pagination.total}
            onPageChange={pagination.setPage}
            noun="entries"
          />
        ) : null}
      </Card>
      <AuditDrawer entry={selected} onClose={() => setRouteParams('audit', {})} />
    </div>
  )
}
