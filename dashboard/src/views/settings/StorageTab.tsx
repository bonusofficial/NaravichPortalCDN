import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DescriptionList } from '../../components/ui/DescriptionList'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Alert } from '../../components/ui/States'
import { formatBytes, formatNumber, formatPercent } from '../../lib/format'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import { DangerRow, DangerZone, SettingsSection } from './SettingsLayout'

export function StorageTab() {
  const { settings, purgeTrash, health, trash } = useStore()
  const { notify } = useToast()
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [purging, setPurging] = useState(false)
  const disk = health
    ? { percent: health.storage.usedPercent, used: Number(health.storage.usedBytes), total: Number(health.storage.totalBytes), free: Number(health.storage.availableBytes) }
    : { percent: 0, used: 0, total: 1, free: 0 }
  const { diskWarningPercent, stopUploadsPercent } = settings.storage

  return (
    <>
      <Alert tone="neutral" title="Runtime settings are read-only here">
        Paths, public URL, hard processing limits, worker count, disk thresholds, and backup jobs are deployment configuration. Change them in the VPS environment and restart the API.
      </Alert>

      <Card as="div">
        <SettingsSection title="Runtime configuration" description="Non-secret values currently reported by the API.">
          <DescriptionList
            label="Runtime configuration"
            items={[
              { label: 'Storage path', value: <span className="mono">{settings.storage.storagePath}</span> },
              { label: 'Temporary path', value: <span className="mono">{settings.storage.tempPath}</span> },
              { label: 'Public base URL', value: <span className="mono">{settings.general.publicBaseUrl}</span> },
              { label: 'Max input', value: `${settings.processing.maxInputMb} MB` },
              { label: 'Max output', value: `${settings.processing.maxOutputMb} MB` },
              { label: 'Processing workers', value: formatNumber(settings.processing.workers) },
            ]}
          />
        </SettingsSection>

        <SettingsSection title="Disk capacity" description="Live filesystem values from the API health check.">
          <ProgressBar
            label="Current disk usage against thresholds"
            heading={`Current usage ${formatPercent(disk.percent)}`}
            valueText={`${formatBytes(disk.used)} used · ${formatBytes(disk.free)} available`}
            value={disk.percent}
            tone={disk.percent >= stopUploadsPercent ? 'danger' : disk.percent >= diskWarningPercent ? 'warning' : 'brand'}
            size="lg"
            showLegend
            markers={[
              { value: diskWarningPercent, label: `Warning ${diskWarningPercent}%`, tone: 'warning' },
              { value: stopUploadsPercent, label: `Stop uploads ${stopUploadsPercent}%`, tone: 'danger' },
            ]}
          />
        </SettingsSection>
      </Card>

      <DangerZone>
        <DangerRow
          title="Empty trash now"
          description={`Permanently removes ${formatNumber(trash.objects)} deleted objects (${formatBytes(trash.bytes)}). They cannot be restored.`}
          action={
            <Button variant="danger-outline" icon={Trash2} loading={purging} disabled={trash.objects === 0} onClick={() => setConfirmPurge(true)}>
              Empty trash…
            </Button>
          }
        />
      </DangerZone>

      <ConfirmDialog
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        title="Permanently empty trash?"
        description={`${formatNumber(trash.objects)} objects (${formatBytes(trash.bytes)}) will be deleted from disk. This cannot be undone.`}
        confirmLabel="Empty trash"
        icon={Trash2}
        confirmText="empty trash"
        onConfirm={async () => {
          setPurging(true)
          try {
            const result = await purgeTrash()
            setConfirmPurge(false)
            notify({ title: 'Trash emptied', description: `${formatBytes(result.bytes)} freed from ${formatNumber(result.objects)} objects.` })
          } catch (error) {
            notify({ tone: 'error', title: 'Could not empty trash', description: error instanceof Error ? error.message : 'Request failed' })
          } finally {
            setPurging(false)
          }
        }}
      />
    </>
  )
}
