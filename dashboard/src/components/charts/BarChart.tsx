import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { formatDate, formatShortDate } from '../../lib/format'
import { nextIndex } from '../../lib/keys'
import { estimateTextWidth, linearScale, niceTicks, tickIndices } from './scale'

export interface BarSeries {
  id: string
  label: string
  color: string
  values: number[]
}

interface BarChartProps {
  label: string
  dates: number[]
  /** One series = simple columns; several = stacked in the given order (bottom first). */
  series: BarSeries[]
  height?: number
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
  showXAxis?: boolean
  tickCount?: number
  /** Controlled active index, to sync hover across stacked panels. */
  activeIndex?: number | null
  onActiveIndexChange?: (index: number | null) => void
  showTooltip?: boolean
  renderTooltip?: (index: number) => ReactNode
  /** Fixed left margin so stacked panels align. */
  leftMargin?: number
}

const TOP = 10
const GAP = 2

/** Daily column chart: ≤24px bars, 4px rounded data-end, square baseline, 2px gaps. */
export function BarChart({
  label,
  dates,
  series,
  height = 200,
  formatValue,
  formatTick = formatValue,
  showXAxis = true,
  tickCount = 4,
  activeIndex,
  onActiveIndexChange,
  showTooltip = true,
  renderTooltip,
  leftMargin,
}: BarChartProps) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [localActive, setLocalActive] = useState<number | null>(null)
  const active = activeIndex !== undefined ? activeIndex : localActive
  const setActive = (index: number | null) => {
    setLocalActive(index)
    onActiveIndexChange?.(index)
  }

  const count = dates.length
  const totals = dates.map((_, index) => series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0))
  const bottom = showXAxis ? 26 : 6
  const ticks = niceTicks(0, Math.max(...totals, 1), tickCount)
  const tickLabels = ticks.map(formatTick)
  const left = leftMargin ?? Math.ceil(Math.max(...tickLabels.map(estimateTextWidth))) + 8
  const right = 6
  const plotW = Math.max(0, width - left - right)
  const plotH = height - TOP - bottom
  const slot = plotW / Math.max(1, count)
  const barW = Math.max(2, Math.min(24, slot * 0.7, slot - GAP))
  const y = linearScale([0, ticks[ticks.length - 1]], [TOP + plotH, TOP])
  const xTicks = tickIndices(count, plotW)

  const segment = (x0: number, yTop: number, yBottom: number, rounded: boolean) => {
    const h = yBottom - yTop
    if (h <= 0.5) return ''
    if (!rounded) return `M${x0} ${yBottom} V${yTop} H${x0 + barW} V${yBottom} Z`
    const r = Math.min(4, barW / 2, h)
    return `M${x0} ${yBottom} V${yTop + r} Q${x0} ${yTop} ${x0 + r} ${yTop} H${x0 + barW - r} Q${x0 + barW} ${yTop} ${x0 + barW} ${yTop + r} V${yBottom} Z`
  }

  const bars = dates.map((date, index) => {
    const x0 = left + slot * index + (slot - barW) / 2
    const visible = series.map((s) => s.values[index] ?? 0)
    const topMost = visible.reduce((last, value, i) => (value > 0 ? i : last), -1)
    let cursor = 0
    let previousTop = y(0)
    const paths = series.map((s, i) => {
      const value = visible[i]
      if (value <= 0) return null
      cursor += value
      const yTop = y(cursor)
      const yBottom = i === 0 || previousTop === y(0) ? previousTop : previousTop - GAP
      previousTop = yTop
      return { id: s.id, color: s.color, d: segment(x0, yTop, Math.max(yTop, yBottom), i === topMost) }
    })
    return { date, paths }
  })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setActive(null)
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') return
    const next = nextIndex(event.key, active ?? count - 1, count, { wrap: false })
    if (next == null) return
    event.preventDefault()
    setActive(next)
  }

  const activeCenter = active != null ? left + slot * active + slot / 2 : 0

  return (
    <div
      ref={ref}
      className="chart"
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use left and right arrow keys to read values.`}
      onKeyDown={onKeyDown}
      onFocus={() => setActive(active ?? count - 1)}
      onBlur={() => setActive(null)}
    >
      {width > 0 ? (
        <svg width={width} height={height} aria-hidden="true">
          {ticks.map((tick, index) => (
            <g key={tick}>
              <line x1={left} x2={left + plotW} y1={y(tick)} y2={y(tick)} className={index === 0 ? 'chart__axis' : 'chart__grid'} />
              <text x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart__tick">
                {tickLabels[index]}
              </text>
            </g>
          ))}
          {showXAxis
            ? xTicks.map((index) => (
                <text
                  key={index}
                  x={left + slot * index + slot / 2}
                  y={height - 8}
                  textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
                  className="chart__tick"
                >
                  {formatShortDate(dates[index])}
                </text>
              ))
            : null}
          {bars.map((bar, index) => (
            <g key={bar.date} opacity={active == null || active === index ? 1 : 0.45}>
              {bar.paths.map((path) => (path ? <path key={path.id} d={path.d} fill={path.color} /> : null))}
            </g>
          ))}
          {dates.map((date, index) => (
            <rect
              key={`hit-${date}`}
              x={left + slot * index}
              y={TOP}
              width={slot}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
        </svg>
      ) : null}
      {showTooltip && active != null && width > 0 ? (
        <div
          className="chart__tooltip"
          style={{
            left: activeCenter,
            top: TOP,
            transform: activeCenter > width * 0.6 ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)',
          }}
        >
          {renderTooltip ? (
            renderTooltip(active)
          ) : (
            <>
              <p className="chart__tooltip-title">{formatDate(dates[active])}</p>
              {series.map((s) => (
                <p key={s.id} className="chart__tooltip-row">
                  <span className="chart__key chart__key--rect" style={{ background: s.color }} aria-hidden="true" />
                  <strong>{formatValue(s.values[active] ?? 0)}</strong>
                  <span>{s.label}</span>
                </p>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
