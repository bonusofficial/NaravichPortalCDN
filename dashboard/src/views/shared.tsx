import { ArrowRight } from 'lucide-react'
import { formatBytes, formatDateTime, formatIsoBangkok, formatRelative } from '../lib/format'
import { useStore } from '../state/store-context'

/** Relative time with the absolute Bangkok time on hover and for assistive tech. */
export function TimeCell({ ts, absolute = false }: { ts: number | null; absolute?: boolean }) {
  if (ts == null) return <span className="cell-muted">Never</span>
  return (
    <time dateTime={formatIsoBangkok(ts)} title={formatDateTime(ts)}>
      {absolute ? formatDateTime(ts) : formatRelative(ts)}
    </time>
  )
}

export function ProjectName({ projectId, withSlug = false }: { projectId: string; withSlug?: boolean }) {
  const { projects } = useStore()
  const project = projects.find((item) => item.id === projectId)
  if (!project) return <span className="cell-muted">Unknown project</span>
  if (!withSlug) return <span>{project.name}</span>
  return (
    <span className="cell-stack">
      <span>{project.name}</span>
      <span className="cell-sub mono">{project.slug}</span>
    </span>
  )
}

export function SizeFlow({ from, to }: { from: number; to: number | null }) {
  return (
    <span className="size-flow">
      {formatBytes(from)}
      <ArrowRight aria-label="to" />
      {to == null ? <span className="cell-muted">—</span> : formatBytes(to)}
    </span>
  )
}
