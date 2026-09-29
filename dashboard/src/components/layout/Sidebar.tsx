import { X } from 'lucide-react'
import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../hooks/useModalLayer'
import { CDN_HOST, WORKSPACE_LABEL } from '../../lib/constants'
import { NAV_GROUPS } from '../../lib/navigation'
import { buildHash } from '../../lib/router'
import type { ViewId } from '../../types'
import { Button } from '../ui/Button'
import { Logo, LogoMark } from '../ui/Logo'
import { ServerHealth } from './ServerHealth'

interface NavContentProps {
  activeView: ViewId
  rail?: boolean
  onNavigate?: () => void
}

function NavContent({ activeView, rail = false, onNavigate }: NavContentProps) {
  return (
    <>
      <div className="sidebar__brand">
        <a className="sidebar__brand-link" href={buildHash('overview')} onClick={onNavigate} aria-label="Naravich Sure CDN Manager — Overview">
          {rail ? <LogoMark size={30} /> : <Logo height={46} />}
        </a>
        {rail ? null : (
          <div className="sidebar__workspace">
            <span className="sidebar__workspace-name">
              {WORKSPACE_LABEL}
              <span className="sidebar__env">Prod</span>
            </span>
            <span className="sidebar__workspace-host">{CDN_HOST}</span>
          </div>
        )}
      </div>
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-group__label" aria-hidden={rail || undefined}>
              {group.label}
            </p>
            <ul className="nav-list">
              {group.items.map((item) => {
                const Icon = item.icon
                const current = item.id === activeView
                return (
                  <li key={item.id}>
                    <a
                      className="nav-link"
                      href={buildHash(item.id)}
                      aria-current={current ? 'page' : undefined}
                      aria-label={rail ? item.label : undefined}
                      data-tooltip={rail ? item.label : undefined}
                      onClick={onNavigate}
                    >
                      <Icon aria-hidden="true" />
                      <span className="nav-link__label">{item.label}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <ServerHealth rail={rail} onNavigate={onNavigate} />
    </>
  )
}

export function Sidebar({ activeView, collapsed }: { activeView: ViewId; collapsed: boolean }) {
  return (
    <aside className="sidebar sidebar--fixed" aria-label="Sidebar">
      <NavContent activeView={activeView} rail={collapsed} />
    </aside>
  )
}

export function MobileNav({ open, onClose, activeView }: { open: boolean; onClose: () => void; activeView: ViewId }) {
  if (!open) return null
  return createPortal(<MobileNavPanel onClose={onClose} activeView={activeView} />, document.body)
}

function MobileNavPanel({ onClose, activeView }: { onClose: () => void; activeView: ViewId }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalLayer(true, ref, onClose)
  return (
    <div
      className="overlay overlay--nav"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div ref={ref} className="mobile-nav" role="dialog" aria-modal="true" aria-label="Navigation" tabIndex={-1}>
        <Button variant="ghost" iconOnly icon={X} aria-label="Close navigation" className="mobile-nav__close" onClick={onClose} data-dismiss="true" />
        <NavContent activeView={activeView} onNavigate={onClose} />
      </div>
    </div>
  )
}
