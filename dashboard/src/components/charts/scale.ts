/** Round tick values for an axis spanning [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) {
    max = min === 0 ? 1 : min * 1.1
    min = min === 0 ? 0 : min * 0.9
  }
  const rawStep = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalised = rawStep / magnitude
  const step = (normalised < 1.5 ? 1 : normalised < 3 ? 2 : normalised < 7 ? 5 : 10) * magnitude
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Number(value.toPrecision(12)))
  }
  return ticks
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0)
}

/** Evenly spaced indices for x-axis labels that fit the available width. */
export function tickIndices(length: number, width: number, minSpacing = 84): number[] {
  if (length <= 1) return [0]
  const maxTicks = Math.max(2, Math.floor(width / minSpacing))
  const step = Math.max(1, Math.ceil((length - 1) / (maxTicks - 1)))
  const indices: number[] = []
  for (let i = length - 1; i >= 0; i -= step) indices.unshift(i)
  return indices
}

/** Rough label width for tick text at 11px (avoids measuring the DOM). */
export function estimateTextWidth(text: string): number {
  return text.length * 6.4 + 4
}
