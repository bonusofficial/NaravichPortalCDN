import { ChevronsUpDown, FolderKanban, Layers } from 'lucide-react'
import { PROJECT_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import { Menu, MenuLabel, MenuRadioItem, MenuSeparator } from '../ui/Menu'

/** Global project context: scopes Overview, Assets, API Keys, Upload Logs and Usage. */
export function ProjectSelector() {
  const { projects, scope, setScope } = useStore()
  const { notify } = useToast()
  const current = projects.find((project) => project.id === scope)
  const groups = (['active', 'paused', 'archived'] as const)
    .map((status) => ({ status, items: projects.filter((project) => project.status === status) }))
    .filter((group) => group.items.length > 0)

  const select = (id: string) => {
    setScope(id)
    const name = id === 'all' ? 'All projects' : projects.find((project) => project.id === id)?.name
    notify({ tone: 'info', title: `Project context: ${name}`, duration: 2500 })
  }

  return (
    <Menu
      label="Project context"
      align="start"
      minWidth={280}
      trigger={(props) => (
        <button type="button" className="project-trigger" {...props} aria-label={`Project context: ${current?.name ?? 'All projects'}`}>
          {current ? <FolderKanban aria-hidden="true" /> : <Layers aria-hidden="true" />}
          <span className="project-trigger__text">
            <span className="project-trigger__eyebrow">Project</span>
            <span className="project-trigger__name">{current?.name ?? 'All projects'}</span>
          </span>
          <ChevronsUpDown aria-hidden="true" />
        </button>
      )}
    >
      <MenuRadioItem checked={scope === 'all'} icon={Layers} hint={`${projects.length} projects`} onSelect={() => select('all')}>
        All projects
      </MenuRadioItem>
      {groups.map((group) => (
        <div key={group.status} role="group" aria-label={PROJECT_STATUS_META[group.status].label}>
          <MenuSeparator />
          <MenuLabel>{PROJECT_STATUS_META[group.status].label}</MenuLabel>
          {group.items.map((project) => (
            <MenuRadioItem key={project.id} checked={scope === project.id} hint={project.slug} onSelect={() => select(project.id)}>
              {project.name}
            </MenuRadioItem>
          ))}
        </div>
      ))}
    </Menu>
  )
}
