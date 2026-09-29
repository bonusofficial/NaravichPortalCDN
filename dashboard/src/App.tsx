import './components/ui/ui.css'
import './components/data-table/data-table.css'
import './components/charts/charts.css'
import './App.css'
import './views/views.css'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Skeleton } from './components/ui/States'
import { Alert } from './components/ui/States'
import { Button } from './components/ui/Button'
import { ToastProvider } from './components/ui/ToastProvider'
import { useRoute, type Route } from './lib/router'
import { StoreProvider } from './state/StoreProvider'
import { AuthProvider } from './state/AuthProvider'
import { useAuth } from './state/auth-context'
import { useStore } from './state/store-context'
import { ThemeProvider } from './state/ThemeProvider'
import { LoginView } from './views/auth/LoginView'
import { PasswordChangeView } from './views/auth/PasswordChangeView'

// Route-level code splitting: each view is its own chunk, prefetched when the browser is idle.
const loaders = {
  overview: () => import('./views/overview/OverviewView').then((m) => ({ default: m.OverviewView })),
  projects: () => import('./views/projects/ProjectsView').then((m) => ({ default: m.ProjectsView })),
  assets: () => import('./views/assets/AssetsView').then((m) => ({ default: m.AssetsView })),
  apiKeys: () => import('./views/api-keys/ApiKeysView').then((m) => ({ default: m.ApiKeysView })),
  logs: () => import('./views/logs/UploadLogsView').then((m) => ({ default: m.UploadLogsView })),
  usage: () => import('./views/usage/UsageView').then((m) => ({ default: m.UsageView })),
  users: () => import('./views/users/UsersView').then((m) => ({ default: m.UsersView })),
  audit: () => import('./views/audit/AuditLogsView').then((m) => ({ default: m.AuditLogsView })),
  settings: () => import('./views/settings/SettingsView').then((m) => ({ default: m.SettingsView })),
}

const OverviewView = lazy(loaders.overview)
const ProjectsView = lazy(loaders.projects)
const AssetsView = lazy(loaders.assets)
const ApiKeysView = lazy(loaders.apiKeys)
const UploadLogsView = lazy(loaders.logs)
const UsageView = lazy(loaders.usage)
const UsersView = lazy(loaders.users)
const AuditLogsView = lazy(loaders.audit)
const SettingsView = lazy(loaders.settings)

function renderView({ view, params }: Route): ReactNode {
  switch (view) {
    case 'overview':
      return <OverviewView />
    case 'projects':
      return <ProjectsView params={params} />
    case 'assets':
      return <AssetsView params={params} />
    case 'api-keys':
      // Re-mount when arriving from search/notifications with a new query.
      return <ApiKeysView key={params.q ?? ''} params={params} />
    case 'logs':
      return <UploadLogsView key={`${params.http ?? ''}|${params.result ?? ''}`} params={params} />
    case 'usage':
      return <UsageView />
    case 'users':
      return <UsersView key={params.q ?? ''} params={params} />
    case 'audit':
      return <AuditLogsView params={params} />
    case 'settings':
      return <SettingsView params={params} />
  }
}

function ViewFallback() {
  return (
    <div className="view" aria-busy="true" aria-label="Loading page">
      <Skeleton width={220} height={26} />
      <Skeleton width="45%" height={14} />
      <Skeleton height={320} radius={12} style={{ marginTop: 8 }} />
    </div>
  )
}

function LiveView({ route }: { route: Route }) {
  const { loading, loadError, refresh } = useStore()
  if (loading) return <ViewFallback />
  if (loadError) {
    return (
      <div className="view">
        <Alert
          tone="danger"
          title="เชื่อมต่อ Backend ไม่สำเร็จ"
          actions={<Button size="sm" variant="secondary" onClick={() => void refresh().catch(() => undefined)}>ลองใหม่</Button>}
        >
          {loadError}
        </Alert>
      </div>
    )
  }
  return <Suspense fallback={<ViewFallback />}>{renderView(route)}</Suspense>
}

function DashboardApp() {
  const route = useRoute()

  useEffect(() => {
    const prefetch = () => Object.values(loaders).forEach((load) => void load())
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(prefetch, { timeout: 3000 })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = globalThis.setTimeout(prefetch, 1500)
    return () => globalThis.clearTimeout(timer)
  }, [])

  return (
    <StoreProvider>
      <AppShell view={route.view}>
        <LiveView route={route} />
      </AppShell>
    </StoreProvider>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  if (loading) return <main className="auth-loading" aria-label="กำลังตรวจสอบ session"><Skeleton width={220} height={56} /></main>
  if (!user) return <LoginView />
  return user.mustChangePassword ? <PasswordChangeView /> : <DashboardApp />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
