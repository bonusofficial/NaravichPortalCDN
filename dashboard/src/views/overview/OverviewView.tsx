import { CircleCheck, Database, Gauge, Images, Upload } from 'lucide-react'
import { useState } from 'react'
import { ChartCard } from '../../components/charts/ChartCard'
import { LineChart } from '../../components/charts/LineChart'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Segmented'
import { StatCard } from '../../components/ui/StatCard'
import { Alert } from '../../components/ui/States'
import { DAY, SERVER } from '../../lib/constants'
import { formatBytes, formatDate, formatNumber, formatPercent, formatShortDate } from '../../lib/format'
import { navigate } from '../../lib/router'
import { usageSeries } from '../../lib/usage'
import { useShell } from '../../state/shell-context'
import { useStore } from '../../state/store-context'
import { useScope } from '../useScope'
import { FailureBreakdown } from './FailureBreakdown'
import { RecentUploads } from './RecentUploads'
import { SystemHealthCard } from './SystemHealthCard'
import { UploadsChart } from './UploadsChart'

type Range = '7d' | '30d' | '90d'
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 }
export function OverviewView() {
  const { projects, settings, health, summary, usage } = useStore()
  const { scopedProject } = useScope()
  const { openUpload } = useShell()
  const [range, setRange] = useState<Range>('30d')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const days = RANGE_DAYS[range]
  const storageNow = scopedProject ? scopedProject.storageBytes : (summary?.storageBytes ?? projects.reduce((sum, project) => sum + project.storageBytes, 0))
  const series = usageSeries(usage, storageNow, days, scopedProject?.id)
  const { storage, uploads, output } = series
  const storageStart = storage[0]?.value ?? storageNow
  const assetsTotal = scopedProject ? scopedProject.assetCount : (summary?.totalAssets ?? projects.reduce((sum, project) => sum + project.assetCount, 0))
  const requests = uploads.reduce((sum, day) => sum + day.requests, 0)
  const rejected = uploads.reduce((sum, day) => sum + day.rejected, 0)
  const failed = uploads.reduce((sum, day) => sum + day.failed, 0)
  const accepted = requests - rejected
  const stored = accepted - failed
  const successRate = accepted > 0 ? (stored / accepted) * 100 : 100
  const optimizedOutput = output.reduce((sum, point) => sum + point.value, 0)

  const disk = health
    ? { percent: health.storage.usedPercent, used: Number(health.storage.usedBytes), total: Number(health.storage.totalBytes) }
    : { percent: 0, used: 0, total: 1 }
  const warnAt = settings.storage.diskWarningPercent
  const approaching = disk.percent >= warnAt - 5
  const growthPerDay = Math.max(0, (storageNow - storageStart) / Math.max(1, days - 1))
  const daysToWarning = growthPerDay ? Math.max(0, ((warnAt / 100) * disk.total - disk.used) / growthPerDay) : null
  const latestDate = storage.at(-1)?.date ?? 0
  const rangeLabel = `last ${days} days`

  const sample = (values: number[], points = 14) =>
    values.filter((_, index) => index % Math.max(1, Math.floor(values.length / points)) === 0 || index === values.length - 1)

  return (
    <div className="view">
      <PageHeader
        title="Overview"
        description={
          scopedProject
            ? `Operational snapshot for ${scopedProject.name} (${scopedProject.slug}).`
            : 'Operational snapshot of the Naravich Sure image storage server and its projects.'
        }
        actions={
          <>
            <Segmented
              label="Time range"
              value={range}
              onChange={setRange}
              options={[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
              ]}
            />
            <Button variant="primary" icon={Upload} onClick={() => openUpload(scopedProject?.id)}>
              Upload asset
            </Button>
          </>
        }
      />

      {approaching && !bannerDismissed ? (
        <Alert
          tone="warning"
          role="status"
          title={`Disk usage on ${SERVER.volume} is ${formatPercent(disk.percent)} — approaching the ${warnAt}% warning threshold`}
          onDismiss={() => setBannerDismissed(true)}
          actions={
            <Button size="sm" variant="secondary" onClick={() => navigate('usage')}>
              Review projection
            </Button>
          }
        >
          {daysToWarning == null
            ? 'There is not enough stored-output growth data to estimate a date.'
            : `At the current stored-output growth of ${formatBytes(growthPerDay)}/day the threshold is reached around ${formatDate(latestDate + daysToWarning * DAY)}.`}{' '}
          Uploads stop automatically at {settings.storage.stopUploadsPercent}%.
        </Alert>
      ) : null}

      <section className="kpi-grid" aria-label="Key metrics">
        <StatCard
          label="Storage used"
          icon={Database}
          value={formatBytes(storageNow)}
          suffix={scopedProject ? `/ ${formatBytes(scopedProject.quotaBytes)}` : `/ ${formatBytes(disk.total)}`}
          delta={{
            label: `+${formatBytes(Math.max(0, storageNow - storageStart))}`,
            direction: 'up',
            sentiment: 'neutral',
            period: `growth over the ${rangeLabel}`,
          }}
          meta={
            scopedProject
              ? `${formatPercent((storageNow / scopedProject.quotaBytes) * 100)} of project quota`
              : `${formatPercent((storageNow / Math.max(1, disk.total)) * 100)} of ${SERVER.volume} · originals + outputs`
          }
          trend={sample(storage.map((point) => point.value))}
        />
        <StatCard
          label="Total assets"
          icon={Images}
          value={formatNumber(assetsTotal)}
          delta={{ label: `+${formatNumber(stored)}`, direction: 'up', sentiment: 'neutral', period: `stored in the ${rangeLabel}` }}
          meta={scopedProject ? `Stored in ${scopedProject.name}` : `Across ${projects.length} projects`}
          trend={sample(uploads.map((day) => day.requests - day.rejected - day.failed))}
        />
        <StatCard
          label="Optimized output"
          icon={Gauge}
          value={formatBytes(optimizedOutput)}
          meta={`${formatBytes(optimizedOutput / Math.max(1, days))}/day average over the ${rangeLabel}`}
          trend={sample(output.map((point) => point.value))}
        />
        <StatCard
          label="Upload success"
          icon={CircleCheck}
          value={`${successRate.toFixed(2)}%`}
          meta={`${formatNumber(stored)} of ${formatNumber(accepted)} accepted uploads stored · ${formatNumber(rejected)} rejected (4xx)`}
        />
      </section>

      <div className="grid">
        <ChartCard
          className="span-8"
          title="Storage usage"
          subtitle={`Asset storage (originals + optimized outputs), ${rangeLabel}`}
          table={{
            columns: ['Date', 'Storage'],
            rows: storage.map((point) => [formatShortDate(point.date), formatBytes(point.value, { fixed: true })]),
          }}
        >
          <LineChart
            label={`Storage usage over the ${rangeLabel}`}
            dates={storage.map((point) => point.date)}
            series={[{ id: 'storage', label: 'Storage', color: 'var(--chart-1)', values: storage.map((point) => point.value) }]}
            formatValue={(value) => formatBytes(value)}
            formatTick={(value) => formatBytes(value)}
            height="fill"
            endLabel
          />
        </ChartCard>
        <div className="span-4">
          <SystemHealthCard />
        </div>
        <div className="span-8">
          <UploadsChart
            days={uploads}
            subtitle={`${formatNumber(requests)} requests, ${rangeLabel}${scopedProject ? ` · ${scopedProject.name}` : ''}`}
          />
        </div>
        <div className="span-4">
          <FailureBreakdown />
        </div>
        <div className="span-12">
          <RecentUploads />
        </div>
      </div>
    </div>
  )
}
