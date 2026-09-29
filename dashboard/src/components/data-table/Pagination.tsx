import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '../../lib/format'
import { Button } from '../ui/Button'
import { Select } from '../ui/Field'

interface PaginationProps {
  page: number
  pageSize: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  noun?: string
}

export function Pagination({ page, pageSize, pageCount, total, onPageChange, onPageSizeChange, noun = 'results' }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary" aria-live="polite">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)} {noun}
      </p>
      <div className="pagination__controls">
        {onPageSizeChange ? (
          <label className="pagination__size">
            <span className="sr-only">Rows per page</span>
            <Select selectSize="sm" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <span className="pagination__page">
          Page {page} of {pageCount}
        </span>
        <Button size="sm" variant="secondary" iconOnly icon={ChevronLeft} aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
        <Button size="sm" variant="secondary" iconOnly icon={ChevronRight} aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
      </div>
    </nav>
  )
}
