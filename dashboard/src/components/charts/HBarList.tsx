import type { ReactNode } from 'react'

export interface HBarItem {
  id: string
  label: ReactNode
  value: number
  display: string
  meta?: string
}

interface HBarListProps {
  items: HBarItem[]
  label: string
  max?: number
  onSelect?: (id: string) => void
}

/** Ranked horizontal bars with the value at the tip — single series, one colour. */
export function HBarList({ items, label, max, onSelect }: HBarListProps) {
  const top = max ?? Math.max(...items.map((item) => item.value), 1)
  return (
    <ol className="hbar" aria-label={label}>
      {items.map((item) => {
        const percent = Math.max(item.value > 0 ? 1.5 : 0, (item.value / top) * 100)
        const content = (
          <>
            <span className="hbar__head">
              <span className="hbar__label">{item.label}</span>
              <span className="hbar__value">
                {item.display}
                {item.meta ? <span className="hbar__meta"> · {item.meta}</span> : null}
              </span>
            </span>
            <span className="hbar__track" aria-hidden="true">
              <span className="hbar__fill" style={{ width: `${percent}%` }} />
            </span>
          </>
        )
        return (
          <li key={item.id}>
            {onSelect ? (
              <button type="button" className="hbar__row hbar__row--button" onClick={() => onSelect(item.id)}>
                {content}
              </button>
            ) : (
              <div className="hbar__row">{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
