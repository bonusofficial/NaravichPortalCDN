import { Bot } from 'lucide-react'
import { cn } from '../../lib/cn'
import { hashString } from '../../lib/rng'

const TINT_COUNT = 5

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Initials avatar with a quiet, theme-aware tint derived from the name. */
export function Avatar({ name, size = 'md', system }: { name: string; size?: 'md' | 'lg'; system?: boolean }) {
  if (system) {
    return (
      <span className={cn('avatar', 'avatar--system', size === 'lg' && 'avatar--lg')} aria-hidden="true">
        <Bot />
      </span>
    )
  }
  return (
    <span className={cn('avatar', size === 'lg' && 'avatar--lg')} data-tint={hashString(name) % TINT_COUNT} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function Person({ name, meta, system }: { name: string; meta?: string; system?: boolean }) {
  return (
    <span className="person">
      <Avatar name={name} system={system} />
      <span className="person__text">
        <span className="person__name truncate">{name}</span>
        {meta ? <span className="person__meta truncate">{meta}</span> : null}
      </span>
    </span>
  )
}
