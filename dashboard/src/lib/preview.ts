import { createRng } from './rng'

/*
 * Deterministic stand-in imagery for mock assets. Produces a small list of SVG
 * shapes that can be rendered as React elements or serialised for download.
 * Muted, natural palettes keep the asset grid calm.
 */

export type PreviewKind = 'photo' | 'product' | 'portrait' | 'banner' | 'document' | 'logo' | 'screen'

export interface PreviewShape {
  tag: 'rect' | 'circle' | 'ellipse' | 'path'
  attrs: Record<string, string | number>
}

export interface PreviewModel {
  width: number
  height: number
  background: string
  shapes: PreviewShape[]
}

const PALETTES = [
  ['#f3e9dc', '#e7c9a9', '#c98f6b', '#6d5a4f'],
  ['#e4eff3', '#a9cfdc', '#5f9fb3', '#2f5d6b'],
  ['#edf1e8', '#c5d4b8', '#8ca77f', '#4d6446'],
  ['#ece6f0', '#c4b6d0', '#8a7aa0', '#4a4160'],
  ['#f5efe4', '#e2d3b6', '#b89a6e', '#6b5a3e'],
  ['#eef1f3', '#c9d2d8', '#8d9ba5', '#46545e'],
  ['#e6f2f1', '#b3d8d3', '#6fb1a8', '#2e6a63'],
] as const

export function previewKind(fileName: string): PreviewKind {
  const name = fileName.toLowerCase()
  if (/logo/.test(name)) return 'logo'
  if (/portrait|team|leadership/.test(name)) return 'portrait'
  if (/infographic|spec-sheet|job-card/.test(name)) return 'document'
  if (/screenshot/.test(name)) return 'screen'
  if (/product|sku|angle/.test(name)) return 'product'
  if (/banner|hero|promo|og-|lp-/.test(name)) return 'banner'
  return 'photo'
}

function hills(w: number, h: number, base: number, amplitude: number, seed: number): string {
  const rng = createRng(seed)
  const points = 5
  let d = `M0 ${h} L0 ${base}`
  for (let i = 1; i <= points; i += 1) {
    const x = (w / points) * i
    const cx = x - w / points / 2
    const cy = base - amplitude * rng.float(0.2, 1)
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${(base + rng.float(-amplitude, amplitude) * 0.3).toFixed(1)}`
  }
  return `${d} L${w} ${h} Z`
}

export function buildPreview(seed: number, kind: PreviewKind, aspect: number): PreviewModel {
  const rng = createRng(seed)
  const palette = PALETTES[seed % PALETTES.length]
  const width = 480
  const height = Math.round(Math.min(960, Math.max(160, width / Math.max(0.3, aspect))))
  const shapes: PreviewShape[] = []
  const [light, mid, deep, ink] = palette

  switch (kind) {
    case 'photo':
    case 'banner': {
      shapes.push({ tag: 'circle', attrs: { cx: width * rng.float(0.2, 0.8), cy: height * rng.float(0.2, 0.38), r: Math.min(width, height) * rng.float(0.08, 0.14), fill: '#ffffff', opacity: 0.85 } })
      shapes.push({ tag: 'path', attrs: { d: hills(width, height, height * 0.62, height * 0.18, seed + 1), fill: mid } })
      shapes.push({ tag: 'path', attrs: { d: hills(width, height, height * 0.74, height * 0.16, seed + 2), fill: deep } })
      shapes.push({ tag: 'path', attrs: { d: hills(width, height, height * 0.88, height * 0.1, seed + 3), fill: ink, opacity: 0.9 } })
      if (kind === 'banner') {
        shapes.push({ tag: 'rect', attrs: { x: width * 0.07, y: height * 0.14, width: width * 0.38, height: Math.max(8, height * 0.07), rx: 3, fill: ink, opacity: 0.85 } })
        shapes.push({ tag: 'rect', attrs: { x: width * 0.07, y: height * 0.26, width: width * 0.26, height: Math.max(6, height * 0.045), rx: 3, fill: ink, opacity: 0.5 } })
        shapes.push({ tag: 'rect', attrs: { x: width * 0.07, y: height * 0.36, width: width * 0.14, height: Math.max(10, height * 0.08), rx: 4, fill: '#ffffff', opacity: 0.9 } })
      }
      break
    }
    case 'product': {
      const pw = width * rng.float(0.32, 0.42)
      const ph = height * rng.float(0.42, 0.56)
      const px = (width - pw) / 2
      const py = height * 0.5 - ph / 2
      shapes.push({ tag: 'ellipse', attrs: { cx: width / 2, cy: py + ph + height * 0.05, rx: pw * 0.62, ry: height * 0.035, fill: ink, opacity: 0.14 } })
      shapes.push({ tag: 'rect', attrs: { x: px, y: py, width: pw, height: ph, rx: Math.min(pw, ph) * 0.12, fill: deep } })
      shapes.push({ tag: 'rect', attrs: { x: px + pw * 0.14, y: py + ph * 0.18, width: pw * 0.72, height: ph * 0.3, rx: 6, fill: light, opacity: 0.9 } })
      shapes.push({ tag: 'circle', attrs: { cx: width / 2, cy: py + ph * 0.72, r: Math.min(pw, ph) * 0.1, fill: mid } })
      break
    }
    case 'portrait': {
      const r = Math.min(width, height) * 0.16
      shapes.push({ tag: 'path', attrs: { d: hills(width, height, height * 0.8, height * 0.05, seed), fill: mid, opacity: 0.6 } })
      shapes.push({ tag: 'ellipse', attrs: { cx: width / 2, cy: height * 0.98, rx: width * 0.32, ry: height * 0.3, fill: deep } })
      shapes.push({ tag: 'circle', attrs: { cx: width / 2, cy: height * 0.46, r, fill: ink, opacity: 0.85 } })
      break
    }
    case 'document': {
      shapes.push({ tag: 'rect', attrs: { x: width * 0.08, y: height * 0.06, width: width * 0.84, height: Math.max(12, height * 0.06), rx: 3, fill: ink, opacity: 0.8 } })
      const rows = Math.max(3, Math.round(height / 90))
      for (let i = 0; i < rows; i += 1) {
        const y = height * 0.18 + i * ((height * 0.74) / rows)
        const barW = width * rng.float(0.25, 0.8)
        shapes.push({ tag: 'rect', attrs: { x: width * 0.08, y, width: barW, height: Math.max(8, height * 0.035), rx: 3, fill: i % 2 ? mid : deep } })
        shapes.push({ tag: 'rect', attrs: { x: width * 0.08, y: y + Math.max(12, height * 0.05), width: width * 0.6, height: 4, rx: 2, fill: ink, opacity: 0.2 } })
      }
      break
    }
    case 'screen': {
      shapes.push({ tag: 'rect', attrs: { x: 0, y: 0, width, height: height * 0.1, fill: ink, opacity: 0.85 } })
      shapes.push({ tag: 'rect', attrs: { x: 0, y: height * 0.1, width: width * 0.2, height: height * 0.9, fill: mid, opacity: 0.6 } })
      for (let i = 0; i < 3; i += 1) {
        shapes.push({ tag: 'rect', attrs: { x: width * (0.25 + i * 0.245), y: height * 0.18, width: width * 0.22, height: height * 0.24, rx: 6, fill: '#ffffff', opacity: 0.9 } })
      }
      shapes.push({ tag: 'rect', attrs: { x: width * 0.25, y: height * 0.5, width: width * 0.71, height: height * 0.4, rx: 6, fill: '#ffffff', opacity: 0.9 } })
      shapes.push({ tag: 'path', attrs: { d: hills(width * 0.71, height * 0.36, height * 0.28, height * 0.12, seed), fill: deep, opacity: 0.5, transform: `translate(${width * 0.25} ${height * 0.53})` } })
      break
    }
    case 'logo': {
      const r = Math.min(width, height) * 0.22
      shapes.push({ tag: 'circle', attrs: { cx: width / 2, cy: height / 2, r, fill: deep } })
      shapes.push({ tag: 'rect', attrs: { x: width / 2 - r * 0.5, y: height / 2 - r * 0.14, width: r, height: r * 0.28, rx: 3, fill: '#ffffff' } })
      break
    }
  }

  return { width, height, background: kind === 'document' || kind === 'logo' || kind === 'screen' ? '#fbfbf9' : light, shapes }
}

function escapeAttr(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export function previewToSvg(model: PreviewModel): string {
  const body = model.shapes
    .map((shape) => `<${shape.tag} ${Object.entries(shape.attrs).map(([key, value]) => `${key}="${escapeAttr(value)}"`).join(' ')}/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.width} ${model.height}" width="${model.width}" height="${model.height}"><rect width="100%" height="100%" fill="${model.background}"/>${body}</svg>`
}
