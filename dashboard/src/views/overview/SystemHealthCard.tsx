import type { LucideIcon } from 'lucide-react'
import { Database, FolderTree, HardDrive, Network } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import { formatPercent } from '../../lib/format'
import { HEALTH_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import type { HealthCheck } from '../../types'

const ICONS: Record<string, LucideIcon> = {
  api: Network,
  filesystem: FolderTree,
  mysql: Database,
  disk: HardDrive,
}

export function SystemHealthCard() {
  const { settings, health } = useStore()
  const disk = health ? { percent: health.storage.usedPercent } : { percent: 0 }
  const { diskWarningPercent, stopUploadsPercent } = settings.storage
  const checks: HealthCheck[] = [
    {
      id: 'api',
      label: 'Manager API',
      state: health ? (health.status === 'ok' ? 'operational' : 'degraded') : 'down',
      summary: health?.status ?? 'Connecting',
      detail: 'Live status from /api/v1/health',
    },
    {
      id: 'mysql',
      label: 'MySQL',
      state: health?.database === 'up' ? 'operational' : 'down',
      summary: health?.database === 'up' ? 'Connected' : 'Unavailable',
      detail: 'Database connection checked by the API',
    },
    {
      id: 'filesystem',
      label: 'Filesystem',
      state: health?.storage.writable ? 'operational' : 'down',
      summary: health?.storage.writable ? 'Read/write OK' : 'Not writable',
      detail: 'Storage root access checked by the API',
    },
    {
      id: 'disk',
      label: 'Storage disk',
      state: disk.percent >= stopUploadsPercent ? 'down' : disk.percent >= diskWarningPercent ? 'degraded' : disk.percent >= diskWarningPercent - 5 ? 'watch' : 'operational',
      summary: `${formatPercent(disk.percent)} used`,
      detail: `Warning threshold ${diskWarningPercent}% · uploads stop at ${stopUploadsPercent}%`,
    },
  ]
  const issues = checks.filter((check) => check.state !== 'operational').length

  return (
    <Card aria-labelledby="health-title">
      <CardHeader
        titleId="health-title"
        title="System health"
        subtitle={health ? `Live · ${health.service}` : 'Waiting for health endpoint'}
        divided
      />
      <ul className="health-list" aria-label={issues ? `${issues} check needs attention` : 'All checks operational'}>
        {checks.map((check) => {
          const Icon = ICONS[check.id] ?? HardDrive
          return (
            <li className="health-item" key={check.id}>
              <span className="health-item__icon" aria-hidden="true">
                <Icon />
              </span>
              <span>
                <span className="health-item__label">{check.label}</span>
                <span className="health-item__summary">{check.summary}</span>
              </span>
              <StatusBadge meta={HEALTH_META[check.state]} />
              <span className="health-item__detail">{check.detail}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
