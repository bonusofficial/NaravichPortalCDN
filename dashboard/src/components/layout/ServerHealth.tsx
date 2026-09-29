import { Server } from 'lucide-react'
import { SERVER } from '../../lib/constants'
import { formatBytes, formatPercent } from '../../lib/format'
import { useStore } from '../../state/store-context'
import { StatusDot } from '../ui/Badge'
import { ProgressBar } from '../ui/ProgressBar'

export function ServerHealth({ rail = false, onNavigate }: { rail?: boolean; onNavigate?: () => void }) {
  const { settings, health } = useStore()
  const disk = health
    ? { percent: health.storage.usedPercent, used: Number(health.storage.usedBytes), total: Number(health.storage.totalBytes) }
    : { percent: 0, used: 0, total: 1 }
  const { diskWarningPercent, stopUploadsPercent } = settings.storage
  const tone = disk.percent >= stopUploadsPercent ? 'danger' : disk.percent >= diskWarningPercent ? 'warning' : 'default'
  const online = health?.database === 'up'
  const summary = `Storage server ${online ? 'online' : 'unavailable'}. Disk ${formatPercent(disk.percent)} used, ${formatBytes(disk.used)} of ${formatBytes(disk.total)}.`

  if (rail) {
    return (
      <a href="#/settings?tab=storage" className="health health--rail" aria-label={summary} data-tooltip={`Online · disk ${formatPercent(disk.percent)}`} onClick={onNavigate}>
        <Server aria-hidden="true" />
        <StatusDot tone={online ? (tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'success') : 'danger'} />
      </a>
    )
  }

  return (
    <section className="health" aria-label="Server health">
      <p className="health__head">
        <StatusDot tone={online ? (tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'success') : 'danger'} />
        Storage server {online ? 'online' : 'unavailable'}
      </p>
      <p className="health__host">
        {SERVER.hostname} · {SERVER.os}
      </p>
      <ProgressBar
        label="Disk usage on /srv"
        heading={`Disk ${SERVER.volume}`}
        value={disk.percent}
        valueText={formatPercent(disk.percent)}
        tone={tone === 'default' ? 'brand' : tone}
        size="sm"
        markers={[
          { value: diskWarningPercent, label: `Warn ${diskWarningPercent}%`, tone: 'warning' },
          { value: stopUploadsPercent, label: `Stop ${stopUploadsPercent}%`, tone: 'danger' },
        ]}
      />
      <p className="health__meta">
        {formatBytes(disk.used)} of {formatBytes(disk.total)}
      </p>
      <a className="health__link" href="#/settings?tab=storage" onClick={onNavigate}>
        Warn at {diskWarningPercent}% · stop at {stopUploadsPercent}%
      </a>
    </section>
  )
}
