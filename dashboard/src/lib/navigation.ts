import type { LucideIcon } from 'lucide-react'
import {
  ChartColumn,
  FolderKanban,
  History,
  Images,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import type { ViewId } from '../types'

export interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
  description: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Manage',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Operational snapshot' },
      { id: 'projects', label: 'Projects', icon: FolderKanban, description: 'Websites that store images' },
      { id: 'assets', label: 'Assets', icon: Images, description: 'Stored images and metadata' },
      { id: 'api-keys', label: 'API Keys', icon: KeyRound, description: 'Backend upload credentials' },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { id: 'logs', label: 'Upload Logs', icon: ScrollText, description: 'Per-request upload results' },
      { id: 'usage', label: 'Usage', icon: ChartColumn, description: 'Storage, bandwidth, and processing' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'users', label: 'Users', icon: Users, description: 'Staff access and roles' },
      { id: 'audit', label: 'Audit Logs', icon: History, description: 'Append-only change history' },
      { id: 'settings', label: 'Settings', icon: Settings, description: 'Server, storage, and security' },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

export function navItem(id: ViewId): NavItem {
  return NAV_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0]
}
