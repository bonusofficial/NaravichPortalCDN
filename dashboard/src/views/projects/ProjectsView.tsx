import { Eye, FolderKanban, Image, KeyRound, MoreHorizontal, Pause, Pencil, Play, Plus } from 'lucide-react'
import { useState } from 'react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { Toolbar } from '../../components/data-table/Toolbar'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput, Select } from '../../components/ui/Field'
import { Menu, MenuItem, MenuSeparator } from '../../components/ui/Menu'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { EmptyState } from '../../components/ui/States'
import { formatBytes, formatNumber } from '../../lib/format'
import { toMessage } from '../../lib/api'
import { navigate, setRouteParams, type RouteParams } from '../../lib/router'
import { PROJECT_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { Project, ProjectStatus } from '../../types'
import { TimeCell } from '../shared'
import { ProjectDrawer } from './ProjectDrawer'
import { ProjectFormDialog } from './ProjectFormDialog'

export function ProjectsView({ params }: { params: RouteParams }) {
  const { projects, apiKeys, setProjectStatus, setScope } = useStore()
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ProjectStatus>('all')
  const [form, setForm] = useState<{ open: boolean; project?: Project }>({ open: false })
  const [pauseTarget, setPauseTarget] = useState<Project | null>(null)

  const selected = projects.find((project) => project.id === params.id)
  const activeKeys = (id: string) => apiKeys.filter((key) => key.projectId === id && key.status === 'active').length

  const q = query.trim().toLowerCase()
  const rows = projects.filter(
    (project) =>
      (status === 'all' || project.status === status) &&
      (!q || project.name.toLowerCase().includes(q) || project.slug.includes(q) || project.domain.toLowerCase().includes(q)),
  )

  const openProject = (project: Project) => setRouteParams('projects', { id: project.id })

  const columns: Column<Project>[] = [
    {
      id: 'name',
      header: 'Project / slug',
      primary: true,
      sticky: true,
      sortValue: (project) => project.name,
      cell: (project) => (
        <span className="project-cell">
          <span className="project-cell__icon" aria-hidden="true">
            {project.name
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join('')}
          </span>
          <span className="cell-stack">
            <span className="cell-title">{project.name}</span>
            <span className="cell-sub mono">{project.slug}</span>
          </span>
        </span>
      ),
    },
    { id: 'status', header: 'Status', sortValue: (project) => project.status, cell: (project) => <StatusBadge meta={PROJECT_STATUS_META[project.status]} /> },
    { id: 'assets', header: 'Assets', align: 'right', sortValue: (project) => project.assetCount, cell: (project) => formatNumber(project.assetCount) },
    {
      id: 'storage',
      header: 'Storage / quota',
      sortValue: (project) => project.storageBytes,
      cell: (project) => (
        <div style={{ minWidth: 170 }}>
          <ProgressBar
            label={`${project.name} storage`}
            heading={formatBytes(project.storageBytes)}
            valueText={`of ${formatBytes(project.quotaBytes)}`}
            value={(project.storageBytes / project.quotaBytes) * 100}
            tone="auto"
            size="sm"
          />
        </div>
      ),
    },
    { id: 'requests', header: 'Requests (30d)', align: 'right', sortValue: (project) => project.requests30d, cell: (project) => formatNumber(project.requests30d) },
    { id: 'keys', header: 'Active keys', align: 'right', sortValue: (project) => activeKeys(project.id), cell: (project) => activeKeys(project.id) },
    { id: 'activity', header: 'Last activity', sortValue: (project) => project.lastActivityAt, cell: (project) => <TimeCell ts={project.lastActivityAt} /> },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      width: 56,
      cell: (project) => (
        <Menu
          label={`Actions for ${project.name}`}
          trigger={(props) => <Button {...props} variant="ghost" size="sm" iconOnly icon={MoreHorizontal} aria-label={`Actions for ${project.name}`} />}
        >
          <MenuItem icon={Eye} onSelect={() => openProject(project)}>
            View details
          </MenuItem>
          <MenuItem icon={Pencil} disabled={project.status === 'archived'} onSelect={() => setForm({ open: true, project })}>
            Edit settings
          </MenuItem>
          <MenuItem
            icon={Image}
            onSelect={() => {
              setScope(project.id)
              navigate('assets')
            }}
          >
            View assets
          </MenuItem>
          <MenuItem
            icon={KeyRound}
            onSelect={() => {
              setScope(project.id)
              navigate('api-keys')
            }}
          >
            Manage API keys
          </MenuItem>
          {project.status !== 'archived' ? <MenuSeparator /> : null}
          {project.status === 'active' ? (
            <MenuItem icon={Pause} onSelect={() => setPauseTarget(project)}>
              Pause uploads…
            </MenuItem>
          ) : project.status === 'paused' ? (
            <MenuItem
              icon={Play}
              onSelect={async () => {
                try {
                  await setProjectStatus(project.id, 'active')
                  notify({ title: 'Uploads resumed', description: `${project.name} accepts uploads again.` })
                } catch (error) {
                  notify({ tone: 'error', title: 'Could not resume project', description: toMessage(error) })
                }
              }}
            >
              Resume uploads
            </MenuItem>
          ) : null}
        </Menu>
      ),
    },
  ]

  const totalStorage = projects.reduce((sum, project) => sum + project.storageBytes, 0)

  return (
    <div className="view">
      <PageHeader
        title="Projects"
        description="Each website that stores images on the server is a project with its own quota, API keys, and compression rules."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setForm({ open: true })}>
            Create project
          </Button>
        }
      />
      <Card>
        <Toolbar
          end={
            <span className="muted" style={{ fontSize: 13 }}>
              {projects.length} projects · {formatBytes(totalStorage)} stored
            </span>
          }
        >
          <SearchInput label="Search projects" placeholder="Search name, slug, or domain" value={query} onValueChange={setQuery} />
          <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as 'all' | ProjectStatus)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </Select>
        </Toolbar>
        <DataTable
          label="Projects"
          columns={columns}
          rows={rows}
          getRowId={(project) => project.id}
          onRowClick={openProject}
          rowLabel={(project) => `Open ${project.name}`}
          selectedId={selected?.id}
          empty={
            <EmptyState
              icon={FolderKanban}
              title="No projects match"
              description="Try a different search or status filter."
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          }
        />
      </Card>

      <ProjectDrawer
        project={selected}
        onClose={() => setRouteParams('projects', {})}
        onEdit={(project) => setForm({ open: true, project })}
        onRequestPause={setPauseTarget}
      />
      <ConfirmDialog
        open={pauseTarget != null}
        onClose={() => setPauseTarget(null)}
        title={`Pause uploads for ${pauseTarget?.name ?? 'project'}?`}
        description="New upload requests will be rejected with 403 until you resume. Existing images stay online and API keys are not revoked."
        confirmLabel="Pause uploads"
        tone="warning"
        icon={Pause}
        onConfirm={async () => {
          if (!pauseTarget) return
          try {
            await setProjectStatus(pauseTarget.id, 'paused')
            notify({ tone: 'warning', title: 'Uploads paused', description: `${pauseTarget.name} is no longer accepting uploads.` })
            setPauseTarget(null)
          } catch (error) {
            notify({ tone: 'error', title: 'Could not pause project', description: toMessage(error) })
          }
        }}
      />
      <ProjectFormDialog
        open={form.open}
        project={form.project}
        onClose={() => setForm({ open: false })}
        onSaved={(project) => {
          if (!form.project) setRouteParams('projects', { id: project.id })
        }}
      />
    </div>
  )
}
