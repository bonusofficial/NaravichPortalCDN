import { X } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../hooks/useModalLayer'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  eyebrow?: ReactNode
  subtitle?: ReactNode
  headerActions?: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
  children: ReactNode
}

/** Right-hand detail panel used for projects, assets, logs, and audit entries. */
export function Drawer(props: DrawerProps) {
  if (!props.open) return null
  return createPortal(<DrawerSurface {...props} />, document.body)
}

function DrawerSurface({ onClose, title, eyebrow, subtitle, headerActions, footer, size = 'md', children }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModalLayer(true, ref, onClose)
  return (
    <div
      className="overlay overlay--drawer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        ref={ref}
        className={cn('drawer', size === 'lg' && 'drawer--lg')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="drawer__header">
          <div className="drawer__titles">
            {eyebrow ? <p className="drawer__eyebrow">{eyebrow}</p> : null}
            <h2 className="drawer__title" id={titleId}>
              {title}
            </h2>
            {subtitle ? <div className="drawer__subtitle">{subtitle}</div> : null}
          </div>
          {headerActions}
          <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close panel" onClick={onClose} data-dismiss="true" />
        </header>
        <div className="drawer__body">{children}</div>
        {footer ? <footer className="drawer__footer">{footer}</footer> : null}
      </aside>
    </div>
  )
}

export function DrawerSection({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="drawer-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 className="drawer-section__title">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}
