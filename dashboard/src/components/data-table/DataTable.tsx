import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Skeleton } from '../ui/States'

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: number | string
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number
  /** Wraps the cell in the row's activation button (one per table). */
  primary?: boolean
  /** Keep the column visible while scrolling horizontally. */
  sticky?: boolean
  className?: string
}

export type SortState = { id: string; direction: 'asc' | 'desc' } | null

interface DataTableProps<T> {
  label: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  /** Accessible name for the row button, e.g. "Open details for hero.jpg". */
  rowLabel?: (row: T) => string
  loading?: boolean
  skeletonRows?: number
  empty?: ReactNode
  initialSort?: SortState
  selectedId?: string | null
  density?: 'default' | 'compact'
  footer?: ReactNode
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="menu"], [role="menuitem"]'

export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  onRowClick,
  rowLabel,
  loading,
  skeletonRows = 8,
  empty,
  initialSort = null,
  selectedId,
  density = 'default',
  footer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(initialSort)

  const sortColumn = sort ? columns.find((column) => column.id === sort.id) : undefined
  const sorted =
    sortColumn?.sortValue && sort
      ? [...rows].sort((a, b) => {
          const av = sortColumn.sortValue!(a)
          const bv = sortColumn.sortValue!(b)
          const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
          return sort.direction === 'asc' ? result : -result
        })
      : rows

  const toggleSort = (id: string) => {
    setSort((current) => {
      if (!current || current.id !== id) return { id, direction: 'desc' }
      if (current.direction === 'desc') return { id, direction: 'asc' }
      return null
    })
  }

  const onRowMouseClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return
    const target = event.target as HTMLElement
    const interactive = target.closest(INTERACTIVE)
    if (interactive && !interactive.classList.contains('row-link')) return
    if (window.getSelection()?.toString()) return
    onRowClick(row)
  }

  return (
    <div className="table-shell">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
        <table className={cn('table', density === 'compact' && 'table--compact', onRowClick && 'table--interactive')}>
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue)
                const direction = sort?.id === column.id ? sort.direction : null
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(column.sticky && 'is-sticky', column.className)}
                    style={{ width: column.width, textAlign: column.align ?? 'left' }}
                    aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                  >
                    {sortable ? (
                      <button type="button" className="table__sort" onClick={() => toggleSort(column.id)}>
                        {column.header}
                        {direction === 'asc' ? (
                          <ArrowUp aria-hidden="true" />
                        ) : direction === 'desc' ? (
                          <ArrowDown aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown aria-hidden="true" className="table__sort-idle" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, index) => (
                  <tr key={`skeleton-${index}`} aria-hidden="true">
                    {columns.map((column, columnIndex) => (
                      <td key={column.id} className={cn(column.sticky && 'is-sticky')}>
                        <Skeleton width={columnIndex === 0 ? '70%' : `${40 + ((index * 7 + columnIndex * 13) % 45)}%`} height={12} />
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((row) => {
                  const id = getRowId(row)
                  return (
                    <tr
                      key={id}
                      className={cn(selectedId === id && 'is-selected')}
                      onClick={onRowClick ? (event) => onRowMouseClick(event, row) : undefined}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(column.sticky && 'is-sticky', column.className)}
                          style={{ textAlign: column.align ?? 'left' }}
                        >
                          {column.primary && onRowClick ? (
                            <button
                              type="button"
                              className="row-link"
                              aria-label={rowLabel?.(row)}
                              onClick={(event) => {
                                event.stopPropagation()
                                onRowClick(row)
                              }}
                            >
                              {column.cell(row)}
                            </button>
                          ) : (
                            column.cell(row)
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <div className="table__empty">{empty}</div> : null}
      </div>
      {footer}
    </div>
  )
}
