import { Hash, RefreshCw, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { Pagination } from '../../components/data-table/Pagination'
import { Toolbar } from '../../components/data-table/Toolbar'
import { PageHeader } from '../../components/layout/PageHeader'
import { HttpCode, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SearchInput, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/States'
import { usePagination } from '../../hooks/usePagination'
import { HOUR, mockNow } from '../../lib/constants'
import { formatDateTimeSeconds, formatDuration, formatNumber } from '../../lib/format'
import { toMessage } from '../../lib/api'
import { setRouteParams, type RouteParams } from '../../lib/router'
import { HTTP_STATUSES, HTTP_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { UploadHttpStatus, UploadLog } from '../../types'
import { SizeFlow } from '../shared'
import { useScope } from '../useScope'
import { LogDrawer } from './LogDrawer'
import { outcomeMeta } from './outcome'

type ResultFilter = 'all' | 'ready' | 'processing' | 'failed' | 'rejected' | 'problems'
type Window = '1h' | '24h' | '48h'
const WINDOW_MS: Record<Window, number> = { '1h': HOUR, '24h': 24 * HOUR, '48h': 48 * HOUR }

export function UploadLogsView({ params }: { params: RouteParams }) {
  const { logs, projects, refresh: refreshData } = useStore()
  const { scope, setScope, inScope } = useScope()
  const { notify } = useToast()
  const [requestId, setRequestId] = useState('')
  const [result, setResult] = useState<ResultFilter>(params.result === 'problems' ? 'problems' : 'all')
  const [http, setHttp] = useState<'all' | UploadHttpStatus>(params.http ? (Number(params.http) as UploadHttpStatus) : 'all')
  const [timeWindow, setTimeWindow] = useState<Window>('48h')
  const [refreshing, setRefreshing] = useState(false)

  const q = requestId.trim().toLowerCase()
  const now = mockNow()
  const rows = logs.filter(
    (log) =>
      inScope(log.projectId) &&
      now - log.timestamp <= WINDOW_MS[timeWindow] &&
      (http === 'all' || log.httpStatus === http) &&
      (result === 'all' || (result === 'problems' ? log.outcome === 'rejected' || log.outcome === 'failed' : log.outcome === result)) &&
      (!q || log.requestId.toLowerCase().includes(q) || log.fileName.toLowerCase().includes(q)),
  )
  const pagination = usePagination(rows, [scope, timeWindow, http, result, q].join('|'), 50)
  const selected = logs.find((log) => log.id === params.id)
  const problems = rows.filter((log) => log.outcome === 'rejected' || log.outcome === 'failed').length

  const refresh = async () => {
    setRefreshing(true)
    try {
      await refreshData()
      notify({ tone: 'info', title: 'Upload logs refreshed', duration: 2500 })
    } catch (error) {
      notify({ tone: 'error', title: 'Could not refresh logs', description: toMessage(error) })
    } finally {
      setRefreshing(false)
    }
  }

  const columns: Column<UploadLog>[] = [
    {
      id: 'time',
      header: 'Timestamp (ICT)',
      sortValue: (log) => log.timestamp,
      cell: (log) => <span className="cell-mono">{formatDateTimeSeconds(log.timestamp)}</span>,
    },
    { id: 'request', header: 'Request ID', primary: true, sticky: true, cell: (log) => <span className="cell-mono">{log.requestId}</span> },
    {
      id: 'project',
      header: 'Project / key prefix',
      sortValue: (log) => log.projectId,
      cell: (log) => (
        <span className="cell-stack">
          <span>{projects.find((project) => project.id === log.projectId)?.slug ?? log.projectId}</span>
          <span className="cell-sub mono">{log.keyLabel}</span>
        </span>
      ),
    },
    { id: 'ip', header: 'Source IP', cell: (log) => <span className="cell-mono">{log.sourceIp}</span> },
    { id: 'size', header: 'Original → optimized', sortValue: (log) => log.originalBytes, cell: (log) => <SizeFlow from={log.originalBytes} to={log.optimizedBytes} /> },
    { id: 'duration', header: 'Duration', align: 'right', sortValue: (log) => log.durationMs, cell: (log) => formatDuration(log.durationMs) },
    { id: 'http', header: 'HTTP', sortValue: (log) => log.httpStatus, cell: (log) => <HttpCode status={log.httpStatus} /> },
    { id: 'result', header: 'Result', sortValue: (log) => log.outcome, cell: (log) => <StatusBadge meta={outcomeMeta(log)} /> },
  ]

  return (
    <div className="view">
      <PageHeader
        title="Upload Logs"
        description={`Every upload request with its validation, compression, and storage outcome — ${formatNumber(rows.length)} matching, ${formatNumber(problems)} not stored.`}
        actions={
          <Button variant="secondary" icon={RefreshCw} loading={refreshing} onClick={refresh}>
            Refresh
          </Button>
        }
      />
      <Card>
        <Toolbar label="Log filters">
          <SearchInput
            label="Request ID or file name"
            placeholder="req_… or file name"
            icon={Hash}
            mono
            value={requestId}
            onValueChange={setRequestId}
          />
          <Select aria-label="Project" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Result" value={result} onChange={(event) => setResult(event.target.value as ResultFilter)}>
            <option value="all">All results</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed after acceptance</option>
            <option value="rejected">Rejected (4xx/5xx)</option>
            <option value="problems">Not stored (all problems)</option>
          </Select>
          <Select
            aria-label="HTTP status"
            value={http}
            onChange={(event) => setHttp(event.target.value === 'all' ? 'all' : (Number(event.target.value) as UploadHttpStatus))}
          >
            <option value="all">All HTTP statuses</option>
            {HTTP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status} {HTTP_STATUS_META[status].label}
              </option>
            ))}
          </Select>
          <Select aria-label="Time window" value={timeWindow} onChange={(event) => setTimeWindow(event.target.value as Window)}>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="48h">Last 48 hours</option>
          </Select>
        </Toolbar>
        <DataTable
          label="Upload requests"
          columns={columns}
          rows={pagination.pageItems}
          getRowId={(log) => log.id}
          onRowClick={(log) => setRouteParams('logs', { ...params, id: log.id })}
          rowLabel={(log) => `Open request ${log.requestId}`}
          selectedId={selected?.id}
          loading={refreshing}
          skeletonRows={12}
          density="compact"
          empty={
            <EmptyState
              icon={ScrollText}
              title="No requests match"
              description="Widen the time window or clear the status filters."
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRequestId('')
                    setResult('all')
                    setHttp('all')
                    setTimeWindow('48h')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          }
        />
        {!refreshing && rows.length > 0 ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            pageCount={pagination.pageCount}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            noun="requests"
          />
        ) : null}
      </Card>
      <LogDrawer log={selected} onClose={() => setRouteParams('logs', { ...params, id: '' })} />
    </div>
  )
}
