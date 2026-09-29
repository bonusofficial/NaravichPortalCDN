import { CircleAlert } from 'lucide-react'
import { Badge, HttpCode } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { formatNumber } from '../../lib/format'
import { navigate } from '../../lib/router'
import { HTTP_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import type { UploadHttpStatus } from '../../types'

export function FailureBreakdown() {
  const { logs } = useStore()
  const counts = new Map<UploadHttpStatus | 'processing', number>()
  logs.filter((log) => log.outcome === 'failed' || log.outcome === 'rejected').forEach((log) => {
    const code = log.outcome === 'failed' && log.httpStatus < 500 ? 'processing' : log.httpStatus
    counts.set(code, (counts.get(code) ?? 0) + 1)
  })
  const failureBreakdown = [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
  const total = failureBreakdown.reduce((sum, row) => sum + row.count, 0)
  return (
    <Card aria-labelledby="breakdown-title">
      <CardHeader
        titleId="breakdown-title"
        title="Not stored, by reason"
        subtitle={`${formatNumber(total)} requests in the last 30 days`}
        actions={
          <Button size="sm" variant="ghost" onClick={() => navigate('logs', { result: 'problems' })}>
            View logs
          </Button>
        }
        divided
      />
      <ul className="breakdown">
        {failureBreakdown.length === 0 ? <li className="breakdown__row"><span className="muted">No failed requests recorded.</span></li> : null}
        {failureBreakdown.map((row) => {
          const meta = row.code === 'processing' ? null : HTTP_STATUS_META[row.code]
          return (
            <li className="breakdown__row" key={String(row.code)}>
              <span className="breakdown__label">
                {row.code === 'processing' ? (
                  <Badge tone="danger" icon={CircleAlert} square>
                    Processing failed
                  </Badge>
                ) : (
                  <>
                    <HttpCode status={row.code} />
                    <span>{meta?.label}</span>
                  </>
                )}
              </span>
              <span className="breakdown__count">{formatNumber(row.count)}</span>
              <span className="breakdown__desc">
                {row.code === 'processing' ? 'Accepted but could not be compressed or decoded by the processor.' : meta?.description}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
