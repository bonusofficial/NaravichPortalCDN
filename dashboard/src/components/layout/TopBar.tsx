import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search, Upload } from 'lucide-react'
import { DESKTOP_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { buildHash } from '../../lib/router'
import { useShell } from '../../state/shell-context'
import type { ViewId } from '../../types'
import { Button } from '../ui/Button'
import { LogoMark } from '../ui/Logo'
import { AccountMenu } from './AccountMenu'
import { GlobalSearch } from './GlobalSearch'
import { Notifications } from './Notifications'
import { ProjectSelector } from './ProjectSelector'

/** Views whose page header already carries "Upload asset" as the primary action, or where uploads don't belong. */
const HIDE_UPLOAD: ViewId[] = ['overview', 'assets', 'users', 'audit', 'settings']

interface TopBarProps {
  view: ViewId
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenNav: () => void
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
}

export function TopBar({ view, collapsed, onToggleCollapsed, onOpenNav, searchOpen, onSearchOpenChange }: TopBarProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const { openUpload } = useShell()

  return (
    <header className="topbar">
      {desktop ? (
        <Button
          variant="ghost"
          iconOnly
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        />
      ) : (
        <>
          <Button variant="ghost" iconOnly icon={MenuIcon} aria-label="Open navigation" aria-haspopup="dialog" onClick={onOpenNav} />
          <a className="topbar__mark" href={buildHash('overview')} aria-label="Overview">
            <LogoMark size={26} />
          </a>
        </>
      )}
      <span className="topbar__divider" aria-hidden="true" />
      <ProjectSelector />
      <GlobalSearch key={view} open={searchOpen} onRequestClose={() => onSearchOpenChange(false)} />
      <div className="topbar__end">
        <Button
          variant="ghost"
          iconOnly
          icon={Search}
          className="topbar__search-toggle"
          aria-label={searchOpen ? 'Close search' : 'Search'}
          aria-expanded={searchOpen}
          onClick={() => onSearchOpenChange(!searchOpen)}
        />
        {HIDE_UPLOAD.includes(view) ? null : (
          <Button variant="secondary" icon={Upload} className="topbar__upload" onClick={() => openUpload()} aria-label="Upload asset">
            <span className="topbar__upload-label">Upload asset</span>
          </Button>
        )}
        <Notifications />
        <AccountMenu />
      </div>
    </header>
  )
}
