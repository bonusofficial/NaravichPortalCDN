import { ChartColumn, Table2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, CardHeader } from '../ui/Card'
import { Segmented } from '../ui/Segmented'

export interface LegendItem {
  label: string
  color: string
  kind?: 'line' | 'rect' | 'dashed'
}

export interface ChartTable {
  columns: string[]
  rows: (string | number)[][]
}

interface ChartCardProps {
  title: string
  subtitle?: ReactNode
  legend?: LegendItem[]
  actions?: ReactNode
  table: ChartTable
  footer?: ReactNode
  className?: string
  /** Dim while refetching instead of flashing a skeleton. */
  busy?: boolean
  children: ReactNode
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label}>
          <span
            className={`legend__key legend__key--${item.kind ?? 'rect'}`}
            style={item.kind === 'dashed' ? { borderColor: item.color } : { background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Card wrapper that pairs every chart with a table-view twin. */
export function ChartCard({ title, subtitle, legend, actions, table, footer, className, busy, children }: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <Card className={className ? `chart-card ${className}` : 'chart-card'}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {actions}
            <Segmented
              label={`${title} view`}
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart', icon: ChartColumn, iconOnly: true },
                { value: 'table', label: 'Table', icon: Table2, iconOnly: true },
              ]}
            />
          </>
        }
      />
      <div className="chart-card__body" style={{ opacity: busy ? 0.55 : 1 }} aria-busy={busy || undefined}>
        {legend && legend.length > 1 && view === 'chart' ? <Legend items={legend} /> : null}
        {view === 'chart' ? (
          children
        ) : (
          <div className="chart-table" tabIndex={0} role="region" aria-label={`${title} data`}>
            <table>
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr>
                  {table.columns.map((column, index) => (
                    <th key={column} scope="col" style={{ textAlign: index === 0 ? 'left' : 'right' }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={String(row[0])}>
                    {row.map((cell, index) =>
                      index === 0 ? (
                        <th key={index} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={index}>{cell}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {footer ? <div className="chart-card__footer">{footer}</div> : null}
    </Card>
  )
}
