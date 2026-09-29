import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Filter row placed directly above a table; wraps on small screens. */
export function Toolbar({ children, end, label = 'Filters', className }: { children: ReactNode; end?: ReactNode; label?: string; className?: string }) {
  return (
    <div className={cn('toolbar', className)}>
      <div className="toolbar__filters" role="group" aria-label={label}>
        {children}
      </div>
      {end ? <div className="toolbar__end">{end}</div> : null}
    </div>
  )
}
