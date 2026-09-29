import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { HTTP_STATUS_META, type StatusMeta } from '../../lib/status'
import type { Tone, UploadHttpStatus } from '../../types'

interface BadgeProps {
  tone?: Tone
  icon?: LucideIcon
  square?: boolean
  className?: string
  children: ReactNode
  title?: string
}

export function Badge({ tone = 'neutral', icon: Icon, square, className, children, title }: BadgeProps) {
  return (
    <span className={cn('badge', `badge--${tone}`, square && 'badge--square', className)} title={title}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

/** Status with icon + label so state is never conveyed by colour alone. */
export function StatusBadge({ meta, label }: { meta: StatusMeta; label?: string }) {
  return (
    <Badge tone={meta.tone} icon={meta.icon} title={meta.description}>
      {label ?? meta.label}
    </Badge>
  )
}

export function HttpCode({ status }: { status: UploadHttpStatus }) {
  const meta = HTTP_STATUS_META[status]
  return (
    <span className={`http-code http-code--${meta.tone === 'neutral' ? 'info' : meta.tone}`} title={`${status} ${meta.label}`}>
      {status}
    </span>
  )
}

export function StatusDot({ tone, label }: { tone: Tone; label?: string }) {
  return <span className={cn('status-dot', `status-dot--${tone}`)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
}

export function Tag({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="tag" title={title}>
      {children}
    </span>
  )
}
