import { PageHeader } from '../../components/layout/PageHeader'
import type { RouteParams } from '../../lib/router'
import { StorageTab } from './StorageTab'
import { PreferencesTab } from './PreferencesTab'
import { AccountSecurityCard } from './AccountSecurityCard'

export function SettingsView(props: { params: RouteParams }) {
  void props.params
  return (
    <div className="view settings">
      <PageHeader title="Server settings" description="Live runtime configuration, persisted defaults, and account security." />
      <StorageTab />
      <PreferencesTab />
      <AccountSecurityCard />
    </div>
  )
}
