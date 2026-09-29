import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Sparkline } from '../charts/Sparkline'
import { Card } from './Card'

export interface StatDelta {
  /** Text shown, e.g. "+3.4%". */
  label: string
  direction: 'up' | 'down' | 'flat'
  /** Whether this direction is good for the metric. */
  sentiment: 'good' | 'bad' | 'neutral'
  /** Period the delta compares against, e.g. "vs previous 30 days". */
  period: string
}

interface StatCardProps {
  label: string
  icon?: LucideIcon
  value: ReactNode
  suffix?: ReactNode
  meta?: ReactNode
  delta?: StatDelta
  trend?: number[]
  children?: ReactNode
}

export function StatCard({ label, icon: Icon, value, suffix, meta, delta, trend, children }: StatCardProps) {
  const DeltaIcon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus
  return (
    <Card as="article" className="stat" aria-label={label}>
      <div className="stat__top">
        <span className="stat__label">
          {Icon ? <Icon aria-hidden="true" /> : null}
          {label}
        </span>
        {delta ? (
          <span className={`delta delta--${delta.sentiment}`} title={delta.period}>
            <DeltaIcon aria-hidden="true" />
            {delta.label}
            <span className="sr-only"> {delta.period}</span>
          </span>
        ) : null}
      </div>
      <p className="stat__value">
        {value}
        {suffix ? <span className="stat__value-suffix">{suffix}</span> : null}
      </p>
      {children}
      <div className="stat__foot">
        {meta ? <p className="stat__meta">{meta}</p> : <span />}
        {trend && trend.length > 1 ? <Sparkline values={trend} label={`${label} trend`} /> : null}
      </div>
    </Card>
  )
}
