import { Fragment, type ReactNode } from 'react'

export interface DescriptionItem {
  label: string
  value: ReactNode
}

export function DescriptionList({ items, label }: { items: DescriptionItem[]; label?: string }) {
  return (
    <dl className="dl" aria-label={label}>
      {items.map((item) => (
        <Fragment key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}
