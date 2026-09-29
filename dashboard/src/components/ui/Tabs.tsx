import type { LucideIcon } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { nextIndex } from '../../lib/keys'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
}

interface TabsProps<T extends string> {
  label: string
  idPrefix: string
  tabs: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

function tabIds(prefix: string, id: string) {
  return { tab: `${prefix}-tab-${id}`, panel: `${prefix}-panel-${id}` }
}

export function Tabs<T extends string>({ label, idPrefix, tabs, value, onChange }: TabsProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') return
    const next = nextIndex(event.key, tabs.findIndex((tab) => tab.id === value), tabs.length)
    if (next == null) return
    event.preventDefault()
    onChange(tabs[next].id)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const ids = tabIds(idPrefix, tab.id)
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            id={ids.tab}
            type="button"
            role="tab"
            className="tabs__tab"
            aria-selected={selected}
            aria-controls={ids.panel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
          >
            {Icon ? <Icon aria-hidden="true" /> : null}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idPrefix, id, children }: { idPrefix: string; id: string; children: ReactNode }) {
  const ids = tabIds(idPrefix, id)
  return (
    <div id={ids.panel} role="tabpanel" aria-labelledby={ids.tab} tabIndex={0} className="tab-panel">
      {children}
    </div>
  )
}
