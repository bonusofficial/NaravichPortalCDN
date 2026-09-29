import { useStore } from '../state/store-context'

/** Global project context from the top-bar selector. */
export function useScope() {
  const { scope, projects, setScope } = useStore()
  const scopedProject = scope === 'all' ? null : (projects.find((project) => project.id === scope) ?? null)
  return {
    scope,
    setScope,
    scopedProject,
    inScope: (projectId: string) => scope === 'all' || projectId === scope,
  }
}
