interface SparklineProps {
  values: number[]
  label: string
  width?: number
  height?: number
}

/** Decorative trend line for stat cards; the headline value carries the data. */
export function Sparkline({ values, label, width = 96, height = 28 }: SparklineProps) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 3
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (value - min) / span) * (height - pad * 2)
    return [x, y] as const
  })
  const d = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={d} fill="none" stroke="var(--chart-axis)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <path
        d={points
          .slice(-Math.max(2, Math.round(values.length / 4)))
          .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
          .join(' ')}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={3} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  )
}
