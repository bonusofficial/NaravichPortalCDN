import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DESKTOP_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { navItem } from '../../lib/navigation'
import { ShellContext } from '../../state/shell-context'
import type { ViewId } from '../../types'
import { UploadDialog } from '../../views/assets/UploadDialog'
import { MobileNav, Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const COLLAPSE_KEY = 'ncdn-sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppShell({ view, children }: { view: ViewId; children: ReactNode }) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [navOpen, setNavOpen] = useState(false)
  // Mobile search row: scoped to the view it was opened on, so navigation closes it.
  const [search, setSearch] = useState<{ open: boolean; view: ViewId }>({ open: false, view })
  const searchOpen = !desktop && search.open && search.view === view
  const [upload, setUpload] = useState<{ open: boolean; projectId?: string }>({ open: false })
  const firstRender = useRef(true)

  // Announce view changes: update the document title and move focus to the page heading.
  useEffect(() => {
    document.title = `${navItem(view).label} · Naravich Sure CDN Manager`
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    document.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true })
  }, [view])

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, String(!value))
      } catch {
        // Persistence is a convenience only.
      }
      return !value
    })
  }

  const railMode = desktop && collapsed

  return (
    <ShellContext value={{ openUpload: (projectId) => setUpload({ open: true, projectId }) }}>
      <div className="app" data-collapsed={railMode}>
        <a className="skip-link" href="#main" onClick={(event) => {
          event.preventDefault()
          document.getElementById('main')?.focus()
        }}>
          Skip to content
        </a>
        <Sidebar activeView={view} collapsed={railMode} />
        <MobileNav open={navOpen && !desktop} onClose={() => setNavOpen(false)} activeView={view} />
        <div className="app__column">
          <TopBar
            view={view}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            onOpenNav={() => setNavOpen(true)}
            searchOpen={searchOpen}
            onSearchOpenChange={(open) => setSearch({ open, view })}
          />
          <main id="main" className="app__content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
      <UploadDialog open={upload.open} initialProjectId={upload.projectId} onClose={() => setUpload({ open: false })} />
    </ShellContext>
  )
}
