import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ProgressMarker {
  value: number
  label: string
  tone?: 'warning' | 'danger' | 'neutral'
}

interface ProgressBarProps {
  value: number
  max?: number
  /** Accessible name, e.g. "Disk usage". */
  label: string
  /** Visible label text (defaults to `label`); pass `false` to hide the header row. */
  heading?: ReactNode | false
  valueText?: string
  tone?: 'brand' | 'default' | 'warning' | 'danger' | 'neutral' | 'auto'
  size?: 'sm' | 'md' | 'lg'
  markers?: ProgressMarker[]
  showLegend?: boolean
  /** Thresholds (percent) used when tone is "auto". */
  thresholds?: { warning: number; danger: number }
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  heading,
  valueText,
  tone = 'default',
  size = 'md',
  markers = [],
  showLegend = false,
  thresholds = { warning: 80, danger: 95 },
  className,
}: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  const resolvedTone =
    tone === 'auto' ? (percent >= thresholds.danger ? 'danger' : percent >= thresholds.warning ? 'warning' : 'default') : tone
  const text = valueText ?? `${percent.toFixed(1)}%`
  return (
    <div className={cn('progress', `progress--${size}`, className)}>
      {heading !== false ? (
        <div className="progress__head">
          <span className="progress__label">{heading ?? label}</span>
          <span className="progress__value">{text}</span>
        </div>
      ) : null}
      <div
        className={cn('progress__track', (resolvedTone === 'warning' || resolvedTone === 'danger') && `progress__track--${resolvedTone}`)}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent * 10) / 10}
        aria-valuetext={text}
      >
        <div
          className={cn('progress__fill', resolvedTone !== 'default' && `progress__fill--${resolvedTone}`)}
          style={{ width: `${percent}%` }}
        />
        {markers.map((marker) => (
          <span
            key={marker.label}
            className={cn('progress__marker', marker.tone && `progress__marker--${marker.tone}`)}
            style={{ left: `${Math.min(100, (marker.value / max) * 100)}%` }}
            title={marker.label}
            aria-hidden="true"
          />
        ))}
      </div>
      {showLegend && markers.length ? (
        <div className="progress__legend">
          {markers.map((marker) => (
            <span key={marker.label}>
              <i className={marker.tone ? `is-${marker.tone}` : undefined} aria-hidden="true" />
              {marker.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
