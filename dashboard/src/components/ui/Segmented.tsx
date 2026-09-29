import type { LucideIcon } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { nextIndex } from '../../lib/keys'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  /** Hide the text label visually (icon-only), keeping it for screen readers. */
  iconOnly?: boolean
}

interface SegmentedProps<T extends string> {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Single-choice segmented control (radio-group semantics, arrow-key navigation). */
export function Segmented<T extends string>({ label, options, value, onChange, className }: SegmentedProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home' || event.key === 'End') return
    const next = nextIndex(event.key, options.findIndex((option) => option.value === value), options.length)
    if (next == null) return
    event.preventDefault()
    onChange(options[next].value)
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons[next]?.focus()
  }

  return (
    <div className={cn('segmented', className)} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option) => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="segmented__item"
            onClick={() => onChange(option.value)}
            title={option.iconOnly ? option.label : undefined}
          >
            {Icon ? <Icon aria-hidden="true" /> : null}
            <span className={option.iconOnly ? 'sr-only' : undefined}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
