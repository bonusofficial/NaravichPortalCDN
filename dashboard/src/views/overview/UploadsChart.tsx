import { useState } from 'react'
import { BarChart } from '../../components/charts/BarChart'
import { ChartCard } from '../../components/charts/ChartCard'
import { formatCompact, formatDate, formatNumber, formatShortDate } from '../../lib/format'
import type { UploadDay } from '../../types'

const LEFT = 44

export function UploadsChart({ days, subtitle }: { days: UploadDay[]; subtitle: string }) {
  const [active, setActive] = useState<{ index: number; panel: 'stored' | 'issues' } | null>(null)
  const dates = days.map((day) => day.date)
  const stored = days.map((day) => day.requests - day.rejected - day.failed)
  const rejected = days.map((day) => day.rejected)
  const failed = days.map((day) => day.failed)

  const tooltip = (index: number) => {
    const day = days[index]
    return (
      <>
        <p className="chart__tooltip-title">{formatDate(day.date)}</p>
        <p className="chart__tooltip-row">
          <span className="chart__key chart__key--rect" style={{ background: 'var(--chart-1)' }} aria-hidden="true" />
          <strong>{formatNumber(stored[index])}</strong>
          <span>stored</span>
        </p>
        <p className="chart__tooltip-row">
          <span className="chart__key chart__key--rect" style={{ background: 'var(--warning)' }} aria-hidden="true" />
          <strong>{formatNumber(day.rejected)}</strong>
          <span>rejected (4xx)</span>
        </p>
        <p className="chart__tooltip-row">
          <span className="chart__key chart__key--rect" style={{ background: 'var(--chart-danger)' }} aria-hidden="true" />
          <strong>{formatNumber(day.failed)}</strong>
          <span>failed after acceptance</span>
        </p>
        <p className="chart__tooltip-row">
          <span className="chart__key" aria-hidden="true" />
          <strong>{formatNumber(day.requests)}</strong>
          <span>requests</span>
        </p>
      </>
    )
  }

  const sync = (panel: 'stored' | 'issues') => (index: number | null) => setActive(index == null ? null : { index, panel })

  return (
    <ChartCard
      title="Upload requests"
      subtitle={subtitle}
      legend={[
        { label: 'Stored', color: 'var(--chart-1)' },
        { label: 'Rejected (4xx)', color: 'var(--warning)' },
        { label: 'Failed after acceptance', color: 'var(--chart-danger)' },
      ]}
      table={{
        columns: ['Date', 'Requests', 'Stored', 'Rejected', 'Failed'],
        rows: days.map((day, index) => [
          formatShortDate(day.date),
          formatNumber(day.requests),
          formatNumber(stored[index]),
          formatNumber(day.rejected),
          formatNumber(day.failed),
        ]),
      }}
    >
      <div className="chart-stack">
        <span className="chart-stack__label">Stored per day</span>
        <BarChart
          label="Stored uploads per day"
          dates={dates}
          series={[{ id: 'stored', label: 'stored', color: 'var(--chart-1)', values: stored }]}
          height={170}
          formatValue={formatNumber}
          formatTick={formatCompact}
          showXAxis={false}
          leftMargin={LEFT}
          activeIndex={active?.index ?? null}
          onActiveIndexChange={sync('stored')}
          showTooltip={active?.panel === 'stored'}
          renderTooltip={tooltip}
        />
        <span className="chart-stack__label">Not stored per day (own scale)</span>
        <BarChart
          label="Rejected and failed uploads per day"
          dates={dates}
          series={[
            { id: 'rejected', label: 'rejected (4xx)', color: 'var(--warning)', values: rejected },
            { id: 'failed', label: 'failed', color: 'var(--chart-danger)', values: failed },
          ]}
          height={92}
          tickCount={2}
          formatValue={formatNumber}
          leftMargin={LEFT}
          activeIndex={active?.index ?? null}
          onActiveIndexChange={sync('issues')}
          showTooltip={active?.panel === 'issues'}
          renderTooltip={tooltip}
        />
      </div>
    </ChartCard>
  )
}
