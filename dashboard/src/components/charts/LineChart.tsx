import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { formatDate, formatShortDate } from '../../lib/format'
import { nextIndex } from '../../lib/keys'
import { estimateTextWidth, linearScale, niceTicks, tickIndices } from './scale'

export interface LineSeries {
  id: string
  label: string
  /** CSS colour, usually a chart token such as var(--chart-1). */
  color: string
  values: (number | null)[]
  area?: boolean
  dashed?: boolean
}

export interface Threshold {
  value: number
  label: string
  tone: 'warning' | 'danger'
}

interface LineChartProps {
  label: string
  dates: number[]
  series: LineSeries[]
  /** Fixed pixel height, or "fill" to grow with the card (min 220px). */
  height?: number | 'fill'
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
  /** Formats x-axis dates (default "29 Sep"). */
  formatX?: (ts: number) => string
  /** "zero" anchors the y-axis at 0 (required for area fills). */
  baseline?: 'zero' | 'auto'
  thresholds?: Threshold[]
  /** Direct-label the last value of the first series. */
  endLabel?: boolean
}

const MARGIN = { top: 12, right: 14, bottom: 26 }

export function LineChart({
  label,
  dates,
  series,
  height: heightProp = 220,
  formatValue,
  formatTick = formatValue,
  formatX = formatShortDate,
  baseline = 'auto',
  thresholds = [],
  endLabel = false,
}: LineChartProps) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const width = size.width
  const fill = heightProp === 'fill'
  const height = fill ? size.height : heightProp
  const [active, setActive] = useState<number | null>(null)

  const values = series.flatMap((s) => s.values.filter((v): v is number => v != null))
  const thresholdValues = thresholds.map((t) => t.value)
  const rawMin = Math.min(...values, ...thresholdValues)
  const rawMax = Math.max(...values, ...thresholdValues)
  const pad = (rawMax - rawMin) * 0.08
  const ticks = baseline === 'zero' ? niceTicks(0, rawMax * 1.05) : niceTicks(rawMin - pad, rawMax + pad)
  const domain: [number, number] = [ticks[0], ticks[ticks.length - 1]]
  const tickLabels = ticks.map(formatTick)
  const left = Math.ceil(Math.max(...tickLabels.map(estimateTextWidth))) + 8
  const endLabelText = endLabel ? formatValue(series[0].values.filter((v): v is number => v != null).at(-1) ?? 0) : ''
  const right = endLabel ? Math.max(MARGIN.right, estimateTextWidth(endLabelText) + 12) : MARGIN.right
  const plotW = Math.max(0, width - left - right)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const x = linearScale([0, Math.max(1, dates.length - 1)], [left, left + plotW])
  const y = linearScale(domain, [MARGIN.top + plotH, MARGIN.top])
  const xTicks = tickIndices(dates.length, plotW)

  const pathFor = (s: LineSeries) => {
    let d = ''
    let pen = false
    s.values.forEach((value, index) => {
      if (value == null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)} `
      pen = true
    })
    return d.trim()
  }

  const areaFor = (s: LineSeries) => {
    const indices = s.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0)
    if (!indices.length) return ''
    const top = indices.map((i, n) => `${n === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(s.values[i] as number).toFixed(1)}`).join(' ')
    const base = y(domain[0])
    return `${top} L${x(indices[indices.length - 1]).toFixed(1)} ${base} L${x(indices[0]).toFixed(1)} ${base} Z`
  }

  const indexFromPointer = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - bounds.left) / bounds.width
    return Math.max(0, Math.min(dates.length - 1, Math.round(ratio * (dates.length - 1))))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setActive(null)
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') return
    const next = nextIndex(event.key, active ?? dates.length - 1, dates.length, { wrap: false })
    if (next == null) return
    event.preventDefault()
    setActive(next)
  }

  const activeX = active != null ? x(active) : 0
  const lastIndex = series[0]?.values.findLastIndex((v) => v != null) ?? -1

  return (
    <div
      ref={ref}
      className={fill ? 'chart chart--fill' : 'chart'}
      style={fill ? undefined : { height }}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use left and right arrow keys to read values.`}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((value) => value ?? dates.length - 1)}
      onBlur={() => setActive(null)}
    >
      {width > 0 && height > 0 ? (
        <svg width={width} height={height} aria-hidden="true" style={fill ? { position: 'absolute', inset: 0 } : undefined}>
          {ticks.map((tick, index) => (
            <g key={tick}>
              <line x1={left} x2={left + plotW} y1={y(tick)} y2={y(tick)} className={index === 0 ? 'chart__axis' : 'chart__grid'} />
              <text x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart__tick">
                {tickLabels[index]}
              </text>
            </g>
          ))}
          {xTicks.map((index) => (
            <text key={index} x={x(index)} y={height - 8} textAnchor={index === 0 ? 'start' : index === dates.length - 1 ? 'end' : 'middle'} className="chart__tick">
              {formatX(dates[index])}
            </text>
          ))}
          {thresholds.map((threshold) => (
            <g key={threshold.label} className={`chart__threshold chart__threshold--${threshold.tone}`}>
              <line x1={left} x2={left + plotW} y1={y(threshold.value)} y2={y(threshold.value)} />
              <text x={left + plotW - 4} y={y(threshold.value) - 5} textAnchor="end">
                {threshold.label}
              </text>
            </g>
          ))}
          {series.map((s) =>
            s.area ? <path key={`${s.id}-area`} d={areaFor(s)} fill={s.color} opacity={0.1} /> : null,
          )}
          {series.map((s) => (
            <path
              key={s.id}
              d={pathFor(s)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 5' : undefined}
            />
          ))}
          {endLabel && lastIndex >= 0 ? (
            <g>
              <circle cx={x(lastIndex)} cy={y(series[0].values[lastIndex] as number)} r={4} fill={series[0].color} stroke="var(--surface)" strokeWidth={2} />
              <text x={x(lastIndex) + 8} y={y(series[0].values[lastIndex] as number)} dy="0.32em" className="chart__end-label">
                {endLabelText}
              </text>
            </g>
          ) : null}
          {active != null ? (
            <g>
              <line x1={activeX} x2={activeX} y1={MARGIN.top} y2={MARGIN.top + plotH} className="chart__crosshair" />
              {series.map((s) =>
                s.values[active] != null ? (
                  <circle key={s.id} cx={activeX} cy={y(s.values[active] as number)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ) : null,
              )}
            </g>
          ) : null}
          <rect
            x={left}
            y={MARGIN.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={(event) => setActive(indexFromPointer(event))}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      ) : null}
      {active != null && width > 0 ? (
        <div
          className="chart__tooltip"
          style={{
            left: activeX,
            top: MARGIN.top,
            transform: activeX > width * 0.6 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <p className="chart__tooltip-title">{formatDate(dates[active])}</p>
          {series.map((s) =>
            s.values[active] != null ? (
              <p key={s.id} className="chart__tooltip-row">
                <span className="chart__key" style={{ background: s.color }} aria-hidden="true" />
                <strong>{formatValue(s.values[active] as number)}</strong>
                <span>{s.label}</span>
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  )
}
