import { Database, Gauge, Timer, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { BarChart } from '../../components/charts/BarChart'
import { ChartCard } from '../../components/charts/ChartCard'
import { HBarList } from '../../components/charts/HBarList'
import { LineChart } from '../../components/charts/LineChart'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Segmented } from '../../components/ui/Segmented'
import { StatCard } from '../../components/ui/StatCard'
import { DAY } from '../../lib/constants'
import { formatBytes, formatDate, formatDuration, formatMonthYear, formatNumber, formatPercent, formatShortDate } from '../../lib/format'
import { navigate } from '../../lib/router'
import { usageSeries } from '../../lib/usage'
import { useStore } from '../../state/store-context'
import type { Project } from '../../types'

type Range = '30d' | '90d'
const PROJECTION_DAYS = 240

export function UsageView() {
  const { projects, settings, health, summary, usage } = useStore()
  const [range, setRange] = useState<Range>('30d')
  const days = range === '30d' ? 30 : 90

  const storageNow = summary?.storageBytes ?? projects.reduce((sum, project) => sum + project.storageBytes, 0)
  const series = usageSeries(usage, storageNow, days)
  const { input, output, latency, uploads, storage } = series
  const totalInput = input.reduce((sum, point) => sum + point.value, 0)
  const totalOutput = output.reduce((sum, point) => sum + point.value, 0)
  const totalRequests = uploads.reduce((sum, day) => sum + day.requests, 0)
  const measuredLatency = latency.filter((day) => day.p50 > 0)
  const averageDuration = measuredLatency.length ? measuredLatency.reduce((sum, day) => sum + day.p50, 0) / measuredLatency.length : 0
  const peakDuration = measuredLatency.reduce((peak, day) => Math.max(peak, day.p95), 0)
  const storageGrowth = storageNow - (storage[0]?.value ?? storageNow)

  const { diskWarningPercent, stopUploadsPercent } = settings.storage
  const diskTotal = Number(health?.storage.totalBytes ?? 1)
  const diskUsed = Number(health?.storage.usedBytes ?? 0)
  const growthPerDay = Math.max(0, storageGrowth / Math.max(1, days - 1))
  const history = storage.map((point) => Math.max(0, diskUsed - (storageNow - point.value)))
  const today = storage.at(-1)?.date ?? 0
  const projectionDates = [...storage.map((point) => point.date), ...Array.from({ length: PROJECTION_DAYS }, (_, i) => today + (i + 1) * DAY)]
  const actual = [...history, ...Array<null>(PROJECTION_DAYS).fill(null)]
  const projected = [
    ...Array<null>(history.length - 1).fill(null),
    diskUsed,
    ...Array.from({ length: PROJECTION_DAYS }, (_, i) => diskUsed + (i + 1) * growthPerDay),
  ]
  const thresholds = [
    { percent: diskWarningPercent, label: `Warning ${diskWarningPercent}%`, tone: 'warning' as const, effect: 'Disk warning notifications to admins' },
    { percent: stopUploadsPercent, label: `Stop uploads ${stopUploadsPercent}%`, tone: 'danger' as const, effect: 'New uploads rejected with 507' },
    { percent: 100, label: 'Volume full', tone: 'danger' as const, effect: 'Writes fail; backups cannot run' },
  ].map((threshold) => {
    const bytes = (threshold.percent / 100) * diskTotal
    const daysLeft = growthPerDay ? Math.max(0, (bytes - diskUsed) / growthPerDay) : null
    return { ...threshold, bytes, daysLeft, date: daysLeft == null ? null : today + daysLeft * DAY }
  })

  const byStorage = [...projects].sort((a, b) => b.storageBytes - a.storageBytes).slice(0, 5)
  const byRequests = [...projects].sort((a, b) => b.requests30d - a.requests30d).slice(0, 5)

  const columns: Column<Project>[] = [
    {
      id: 'name',
      header: 'Project',
      primary: true,
      sticky: true,
      sortValue: (project) => project.name,
      cell: (project) => (
        <span className="cell-stack">
          <span className="cell-title">{project.name}</span>
          <span className="cell-sub mono">{project.slug}</span>
        </span>
      ),
    },
    { id: 'assets', header: 'Assets', align: 'right', sortValue: (project) => project.assetCount, cell: (project) => formatNumber(project.assetCount) },
    {
      id: 'quota',
      header: 'Storage / quota',
      sortValue: (project) => project.storageBytes / project.quotaBytes,
      cell: (project) => (
        <div className="quota-cell">
          <ProgressBar
            label={`${project.name} quota`}
            heading={`${formatBytes(project.storageBytes)} / ${formatBytes(project.quotaBytes)}`}
            value={(project.storageBytes / project.quotaBytes) * 100}
            tone="auto"
            size="sm"
          />
        </div>
      ),
    },
    { id: 'requests', header: 'Requests (30d)', align: 'right', sortValue: (project) => project.requests30d, cell: (project) => formatNumber(project.requests30d) },
    {
      id: 'notStored',
      header: 'Not stored (30d)',
      align: 'right',
      sortValue: (project) => project.failed30d,
      cell: (project) =>
        project.requests30d ? `${formatNumber(project.failed30d)} · ${formatPercent((project.failed30d / project.requests30d) * 100)}` : '—',
    },
    {
      id: 'avg',
      header: 'Avg. per asset',
      align: 'right',
      sortValue: (project) => project.storageBytes / Math.max(1, project.assetCount),
      cell: (project) => (project.assetCount ? formatBytes(project.storageBytes / project.assetCount) : '—'),
    },
  ]

  return (
    <div className="view">
      <PageHeader
        title="Usage"
        description="Live storage and upload processing metrics, with a capacity estimate based on recorded optimized-output growth."
        actions={
          <Segmented
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: '30d', label: '30 days' },
              { value: '90d', label: '90 days' },
            ]}
          />
        }
      />

      <section className="kpi-grid" aria-label="Usage summary">
        <StatCard
          label="Storage"
          icon={Database}
          value={formatBytes(storageNow)}
          meta={`+${formatBytes(storageGrowth)} in ${days} days · ${formatPercent((diskUsed / Math.max(1, diskTotal)) * 100)} of server disk`}
        />
        <StatCard label="Optimized output" icon={Gauge} value={formatBytes(totalOutput)} meta={`${formatBytes(totalInput)} received over ${days} days`} />
        <StatCard label="Upload requests" icon={UploadCloud} value={formatNumber(totalRequests)} meta={`≈${formatNumber(totalRequests / days)}/day over ${days} days`} />
        <StatCard
          label="Processing time"
          icon={Timer}
          value={formatDuration(averageDuration)}
          suffix="daily avg"
          meta={`Peak ${formatDuration(peakDuration)} · upload received → response`}
        />
      </section>

      <div className="grid">
        <ChartCard
          className="span-6"
          title="Bytes processed per day"
          subtitle={`Upload input and optimized output, last ${days} days`}
          legend={[
            { label: 'Input', color: 'var(--chart-ord-1)' },
            { label: 'Output', color: 'var(--chart-ord-2)' },
          ]}
          table={{ columns: ['Date', 'Input', 'Output'], rows: input.map((point, index) => [formatShortDate(point.date), formatBytes(point.value, { fixed: true }), formatBytes(output[index].value, { fixed: true })]) }}
        >
          <BarChart
            label={`Bytes processed per day, last ${days} days`}
            dates={input.map((point) => point.date)}
            series={[
              { id: 'input', label: 'input', color: 'var(--chart-ord-1)', values: input.map((point) => point.value) },
              { id: 'output', label: 'output', color: 'var(--chart-ord-2)', values: output.map((point) => point.value) },
            ]}
            height={220}
            formatValue={(value) => formatBytes(value)}
            formatTick={(value) => formatBytes(value)}
          />
        </ChartCard>
        <ChartCard
          className="span-6"
          title="Processing time"
          subtitle="Daily average and peak, upload received → response"
          legend={[
            { label: 'Average', color: 'var(--chart-ord-1)', kind: 'line' },
            { label: 'Peak', color: 'var(--chart-ord-2)', kind: 'line' },
          ]}
          table={{
            columns: ['Date', 'Average', 'Peak'],
            rows: latency.map((day) => [formatShortDate(day.date), formatDuration(day.p50), formatDuration(day.p95)]),
          }}
        >
          <LineChart
            label={`Processing time average and peak, last ${days} days`}
            dates={latency.map((day) => day.date)}
            series={[
              { id: 'average', label: 'average', color: 'var(--chart-ord-1)', values: latency.map((day) => day.p50) },
              { id: 'peak', label: 'peak', color: 'var(--chart-ord-2)', values: latency.map((day) => day.p95) },
            ]}
            baseline="zero"
            height={220}
            formatValue={formatDuration}
          />
        </ChartCard>

        <ChartCard
          className="span-8"
          title="Disk growth projection"
          subtitle={`Server disk: last ${days} days and a linear estimate at +${formatBytes(growthPerDay)}/day from optimized assets`}
          legend={[
            { label: 'Used', color: 'var(--chart-1)', kind: 'line' },
            { label: 'Projected', color: 'var(--chart-1)', kind: 'dashed' },
          ]}
          table={{
            columns: ['Date', 'Used', 'Projected'],
            rows: projectionDates
              .map((date, index) => [
                formatShortDate(date),
                actual[index] == null ? '—' : formatBytes(actual[index] as number, { fixed: true }),
                projected[index] == null ? '—' : formatBytes(projected[index] as number, { fixed: true }),
              ])
              .filter((_, index) => index % 7 === 0),
          }}
          footer="Operational estimate only. Excludes changes to backup rotation, trash purges, and new projects."
        >
          <LineChart
            label="Disk usage history and projection"
            dates={projectionDates}
            series={[
              { id: 'actual', label: 'Used', color: 'var(--chart-1)', values: actual },
              { id: 'projected', label: 'Projected', color: 'var(--chart-1)', values: projected, dashed: true },
            ]}
            thresholds={thresholds.slice(0, 2).map((t) => ({ value: t.bytes, label: t.label, tone: t.tone }))}
            height={260}
            formatValue={(value) => formatBytes(value)}
            formatX={formatMonthYear}
          />
        </ChartCard>

        <Card className="span-4">
          <CardHeader title="Capacity thresholds" subtitle={`${formatBytes(diskUsed)} of ${formatBytes(diskTotal)} used today`} divided />
          <div className="table-wrap">
            <table className="table table--compact table--fit projection-table">
              <caption className="sr-only">Estimated dates for disk thresholds</caption>
              <thead>
                <tr>
                  <th scope="col">Threshold</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Estimated
                  </th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map((threshold) => (
                  <tr key={threshold.label}>
                    <td style={{ whiteSpace: 'normal' }}>
                      <span className="cell-stack">
                        <span className="cell-title">{threshold.label}</span>
                        <span className="cell-sub">
                          {formatBytes(threshold.bytes)} · {threshold.effect}
                        </span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="cell-stack">
                        <span>{threshold.date == null ? 'No estimate' : formatDate(threshold.date)}</span>
                        <span className="cell-sub">{threshold.daysLeft == null ? 'No recorded growth' : `≈${formatNumber(threshold.daysLeft)} days`}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardBody>
            <p className="projection-note">
              Projection uses optimized asset growth recorded by this application. Database, logs, backups, and other files on the volume can change the actual date.
            </p>
          </CardBody>
        </Card>

        <Card className="span-6">
          <CardHeader title="Top projects by storage" subtitle="Originals + optimized outputs" divided />
          <CardBody>
            <HBarList
              label="Top projects by storage"
              items={byStorage.map((project) => ({
                id: project.id,
                label: project.name,
                value: project.storageBytes,
                display: formatBytes(project.storageBytes),
                meta: `${formatPercent((project.storageBytes / storageNow) * 100)}`,
              }))}
              onSelect={(id) => navigate('projects', { id })}
            />
          </CardBody>
        </Card>
        <Card className="span-6">
          <CardHeader title="Top projects by requests" subtitle="Last 30 days" divided />
          <CardBody>
            <HBarList
              label="Top projects by requests"
              items={byRequests.map((project) => ({
                id: project.id,
                label: project.name,
                value: project.requests30d,
                display: formatNumber(project.requests30d),
                meta: `${formatPercent((project.requests30d / Math.max(1, projects.reduce((sum, item) => sum + item.requests30d, 0))) * 100)}`,
              }))}
              onSelect={(id) => navigate('projects', { id })}
            />
          </CardBody>
        </Card>

        <Card className="span-12">
          <CardHeader title="Project breakdown" subtitle="Quota, traffic, and upload health per project" divided />
          <DataTable
            label="Project usage breakdown"
            columns={columns}
            rows={projects}
            getRowId={(project) => project.id}
            onRowClick={(project) => navigate('projects', { id: project.id })}
            rowLabel={(project) => `Open ${project.name}`}
            initialSort={{ id: 'quota', direction: 'desc' }}
          />
        </Card>
      </div>
    </div>
  )
}
