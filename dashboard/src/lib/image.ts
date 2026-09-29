import { newChecksum } from './ids'
import { buildPreview, previewToSvg, type PreviewKind } from './preview'

/** Decode a local image file to read its real pixel dimensions. */
export async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Real SHA-256 of the file contents (falls back to a mock digest outside secure contexts). */
export async function sha256Hex(file: Blob): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return newChecksum()
  }
}

/** Generate a local JPEG so the upload flow can be tried without picking a file. */
export async function createSampleImage(index: number): Promise<File> {
  const kinds: PreviewKind[] = ['banner', 'photo', 'product']
  const kind = kinds[index % kinds.length]
  const [width, height] = kind === 'product' ? [2000, 2000] : kind === 'banner' ? [3200, 1350] : [4000, 2667]
  const model = buildPreview(1000 + index * 97, kind, width / height)
  const svg = previewToSvg(model)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(image, 0, 0, width, height)
    // Light grain so the JPEG has realistic weight.
    const grain = context.getImageData(0, 0, width, height)
    for (let i = 0; i < grain.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18
      grain.data[i] += noise
      grain.data[i + 1] += noise
      grain.data[i + 2] += noise
    }
    context.putImageData(grain, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
    if (!blob) throw new Error('Could not encode sample')
    const name = `sample-${kind}-${width}x${height}-${String(index + 1).padStart(2, '0')}.jpg`
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    URL.revokeObjectURL(url)
  }
}
