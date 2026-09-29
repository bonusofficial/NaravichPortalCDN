import { downloadBlob, extensionForBlob, rasterizeSvg } from '../../lib/download'
import { buildPreview, previewKind, previewToSvg } from '../../lib/preview'
import type { Asset } from '../../types'
import { FORMAT_EXT } from '../../lib/assets'

/** Download the stored asset; legacy generated previews remain supported. */
export async function downloadAsset(asset: Asset): Promise<'stored' | 'preview'> {
  const base = asset.fileName.replace(/\.[a-z0-9]+$/i, '')
  if (asset.preview.kind === 'blob') {
    const blob = await fetch(asset.preview.url).then((response) => response.blob())
    downloadBlob(blob, `${base}.${FORMAT_EXT[asset.outputFormat]}`)
    return 'stored'
  }
  const scale = Math.min(1, 1600 / Math.max(asset.width, asset.height))
  const width = Math.max(1, Math.round(asset.width * scale))
  const height = Math.max(1, Math.round(asset.height * scale))
  const svg = previewToSvg(buildPreview(asset.preview.seed, previewKind(asset.fileName), asset.width / asset.height))
  const blob = await rasterizeSvg(svg, width, height)
  downloadBlob(blob, `${base}-preview.${extensionForBlob(blob)}`)
  return 'preview'
}
