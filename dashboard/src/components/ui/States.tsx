import type { LucideIcon } from 'lucide-react'
import { CircleAlert, CircleCheck, Info, RotateCw, TriangleAlert, X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function Skeleton({ width = '100%', height = 14, radius, style }: { width?: number | string; height?: number | string; radius?: number; style?: CSSProperties }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  actions?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, actions, compact }: EmptyStateProps) {
  return (
    <div className={cn('empty', compact && 'empty--compact')}>
      <span className="empty__icon" aria-hidden="true">
        <Icon />
      </span>
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__description">{description}</p> : null}
      {actions ? <div className="empty__actions">{actions}</div> : null}
    </div>
  )
}

type AlertTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral'

const ALERT_ICONS: Record<AlertTone, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
  success: CircleCheck,
  neutral: Info,
}

interface AlertProps {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  onDismiss?: () => void
  role?: 'status' | 'alert' | 'note'
  className?: string
}

export function Alert({ tone = 'info', title, children, icon, actions, onDismiss, role, className }: AlertProps) {
  const Icon = icon ?? ALERT_ICONS[tone]
  return (
    <div className={cn('alert', tone !== 'info' && `alert--${tone}`, className)} role={role}>
      <Icon aria-hidden="true" />
      <div className="alert__content">
        {title ? <p className="alert__title">{title}</p> : null}
        {children ? <div className="alert__body">{children}</div> : null}
      </div>
      {actions || onDismiss ? (
        <div className="alert__actions">
          {actions}
          {onDismiss ? <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Dismiss" onClick={onDismiss} /> : null}
        </div>
      ) : null}
    </div>
  )
}

/** Inline error with an optional retry, for a panel or section that failed. */
export function InlineError({ title, description, onRetry, retryLabel = 'Retry' }: { title: string; description?: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <Alert
      tone="danger"
      title={title}
      role="alert"
      actions={onRetry ? <Button size="sm" variant="secondary" icon={RotateCw} onClick={onRetry}>{retryLabel}</Button> : undefined}
    >
      {description}
    </Alert>
  )
}
