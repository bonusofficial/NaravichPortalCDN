import { createContext, useContext } from 'react'
import type {
  ApiKey,
  ApiKeyScope,
  AppNotification,
  AppSettings,
  Asset,
  AuditChange,
  AuditEntry,
  KeyEnvironment,
  Project,
  ProjectSettings,
  ProjectStatus,
  SettingsSection,
  StaffRole,
  StaffStatus,
  StaffUser,
  ServerHealth,
  DashboardSummary,
  UsageMetrics,
  TrashSummary,
  UploadLog,
} from '../types'

export type ProjectScope = 'all' | string

export interface ProjectInput {
  name: string
  slug: string
  description: string
  domain: string
  quotaBytes: number
  settings: ProjectSettings
}

export interface ApiKeyInput {
  name: string
  projectId: string
  environment: KeyEnvironment
  scopes: ApiKeyScope[]
  expiresInDays: number | null
  rateLimitPerMin: number
  ipAllowlist: string[]
}

export interface CreatedKey {
  key: ApiKey
  secret: string
}

export interface StoreState {
  projects: Project[]
  assets: Asset[]
  apiKeys: ApiKey[]
  logs: UploadLog[]
  users: StaffUser[]
  audit: AuditEntry[]
  settings: AppSettings
  notifications: AppNotification[]
  currentUser: StaffUser
  scope: ProjectScope
  loading: boolean
  loadError: string | null
  health: ServerHealth | null
  summary: DashboardSummary | null
  usage: UsageMetrics | null
  trash: TrashSummary
}

export interface StoreActions {
  setScope(scope: ProjectScope): void
  refresh(): Promise<void>
  createProject(input: ProjectInput): Promise<Project>
  updateProject(id: string, input: ProjectInput): Promise<Project>
  setProjectStatus(id: string, status: ProjectStatus): Promise<void>
  uploadFile(projectId: string, file: File): Promise<Asset>
  addUpload(asset: Asset, log: UploadLog): void
  deleteAsset(id: string): Promise<Asset | undefined>
  restoreAsset(asset: Asset): Promise<void>
  retryAsset(id: string): Promise<void>
  createApiKey(input: ApiKeyInput): Promise<CreatedKey>
  rotateApiKey(id: string, graceHours: number): Promise<CreatedKey | undefined>
  revokeApiKey(id: string): Promise<void>
  inviteUser(input: { name: string; email: string; role: StaffRole; password: string }): Promise<StaffUser>
  updateUserRole(id: string, role: StaffRole): Promise<void>
  setUserStatus(id: string, status: StaffStatus): Promise<void>
  removeUser(id: string): Promise<void>
  resendInvite(id: string): void
  updateSettings<S extends SettingsSection>(section: S, values: AppSettings[S], changes?: AuditChange[]): Promise<void>
  runBackup(): void
  purgeTrash(): Promise<TrashSummary>
  markNotificationRead(id: string): void
  markAllNotificationsRead(): void
  appendLogs(logs: UploadLog[]): void
}

export type Store = StoreState & StoreActions

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

/** Lookup helpers shared by views. */
export function projectMap(projects: Project[]): Map<string, Project> {
  return new Map(projects.map((project) => [project.id, project]))
}
