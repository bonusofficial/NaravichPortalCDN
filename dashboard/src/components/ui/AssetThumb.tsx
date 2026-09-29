import { CircleAlert, LoaderCircle } from 'lucide-react'
import { createElement } from 'react'
import { cn } from '../../lib/cn'
import { buildPreview, previewKind } from '../../lib/preview'
import type { Asset } from '../../types'

interface AssetThumbProps {
  asset: Asset
  /** "cover" crops into a fixed box; "contain" keeps the real aspect ratio. */
  fit?: 'cover' | 'contain'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AssetThumb({ asset, fit = 'cover', size = 'md', className }: AssetThumbProps) {
  const aspect = asset.width / Math.max(1, asset.height)
  const overlay =
    asset.status === 'processing' ? (
      <span className="thumb__overlay">
        <LoaderCircle className="spin" aria-hidden="true" />
        {size !== 'sm' ? <span>Processing</span> : null}
      </span>
    ) : asset.status === 'failed' ? (
      <span className="thumb__overlay thumb__overlay--failed">
        <CircleAlert aria-hidden="true" />
        {size !== 'sm' ? <span>Failed</span> : null}
      </span>
    ) : null

  let media
  if (asset.preview.kind === 'blob') {
    media = <img src={asset.preview.url} alt="" className="thumb__media" style={{ objectFit: fit }} />
  } else {
    const model = buildPreview(asset.preview.seed, previewKind(asset.fileName), aspect)
    media = (
      <svg
        className="thumb__media"
        viewBox={`0 0 ${model.width} ${model.height}`}
        preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
        aria-hidden="true"
      >
        <rect width="100%" height="100%" fill={model.background} />
        {model.shapes.map((shape, index) => createElement(shape.tag, { key: index, ...shape.attrs }))}
      </svg>
    )
  }

  return (
    <span
      className={cn('thumb', `thumb--${size}`, fit === 'contain' && 'thumb--contain', asset.status !== 'ready' && 'thumb--dimmed', className)}
      style={fit === 'contain' ? { aspectRatio: `${asset.width} / ${asset.height}` } : undefined}
      role="img"
      aria-label={`Preview of ${asset.fileName}${asset.status !== 'ready' ? ` (${asset.status})` : ''}`}
    >
      {media}
      {overlay}
    </span>
  )
}
