import { Copy, Download, RefreshCw, ScrollText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CopyField } from '../../components/ui/CopyField'
import { AssetThumb } from '../../components/ui/AssetThumb'
import { DescriptionList } from '../../components/ui/DescriptionList'
import { Drawer, DrawerSection } from '../../components/ui/Drawer'
import { Alert, InlineError } from '../../components/ui/States'
import { copyText } from '../../hooks/useClipboard'
import { assetUrl, FORMAT_LABEL, objectPath } from '../../lib/assets'
import { formatBytes, formatDateTime, formatPercent, formatRelative, savedPercent } from '../../lib/format'
import { navigate } from '../../lib/router'
import { ASSET_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { Asset } from '../../types'
import { downloadAsset } from './assetActions'

interface AssetDrawerProps {
  asset: Asset | undefined
  onClose: () => void
  onDelete: (asset: Asset) => void
}

export function AssetDrawer({ asset, onClose, onDelete }: AssetDrawerProps) {
  const { projects, logs, retryAsset } = useStore()
  const { notify } = useToast()
  const [downloading, setDownloading] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  if (!asset) return null

  const project = projects.find((item) => item.id === asset.projectId)
  const url = assetUrl(asset, project)
  const path = objectPath(project?.slug ?? 'unknown', asset.objectKey)
  const saved = savedPercent(asset.originalBytes, asset.optimizedBytes)
  const log = logs.find((item) => item.requestId === asset.requestId)
  const resized = asset.width !== asset.originalWidth || asset.height !== asset.originalHeight

  const download = async () => {
    setDownloading(true)
    try {
      const kind = await downloadAsset(asset)
      notify({
        title: 'Download started',
        description: kind === 'stored' ? `Stored ${asset.outputFormat.toUpperCase()} output` : 'Locally generated preview rendition of this asset.',
      })
    } catch {
      notify({ tone: 'error', title: 'Download failed', description: 'The browser could not render this file.' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      eyebrow={`Asset · ${project?.name ?? 'Unknown project'}`}
      title={asset.fileName}
      subtitle={
        <>
          <StatusBadge meta={ASSET_STATUS_META[asset.status]} />
          <span>
            {FORMAT_LABEL[asset.outputFormat]} · {asset.width} × {asset.height}
          </span>
          <span>· uploaded {formatRelative(asset.uploadedAt)}</span>
        </>
      }
      footer={
        <>
          <Button
            variant="secondary"
            icon={Copy}
            disabled={asset.status !== 'ready'}
            onClick={async () => {
              const ok = await copyText(url)
              notify(ok ? { title: 'CDN URL copied', description: url, duration: 3000 } : { tone: 'error', title: 'Could not copy' })
            }}
          >
            Copy URL
          </Button>
          <Button variant="secondary" icon={Download} loading={downloading} disabled={asset.status !== 'ready'} onClick={download}>
            Download
          </Button>
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={reprocessing}
            disabled={asset.status !== 'ready' || !asset.retainedOriginal}
            title={asset.retainedOriginal ? 'Rebuild using current project compression settings' : 'No retained original is available'}
            onClick={async () => {
              setReprocessing(true)
              try {
                await retryAsset(asset.id)
                notify({ title: 'Reprocessing completed', description: `${asset.fileName} was rebuilt from the retained original.` })
              } catch (error) {
                notify({ tone: 'error', title: 'Reprocessing failed', description: error instanceof Error ? error.message : 'Request failed' })
              } finally {
                setReprocessing(false)
              }
            }}
          >
            Reprocess
          </Button>
          <div className="drawer__footer-end">
            <Button variant="danger-outline" icon={Trash2} onClick={() => onDelete(asset)}>
              Delete
            </Button>
          </div>
        </>
      }
    >
      <AssetThumb asset={asset} fit="contain" size="lg" />

      {asset.status === 'failed' ? (
        <div style={{ marginTop: 16 }}>
          <InlineError
            title="Processing failed"
            description={asset.error ?? 'The image processor could not complete this job.'}
            retryLabel="Retry processing"
            onRetry={() => {
              void retryAsset(asset.id)
                .then(() => notify({ title: 'Reprocessing completed', description: `${asset.fileName} was rebuilt from the retained original.` }))
                .catch((error) => notify({ tone: 'error', title: 'Reprocessing failed', description: error instanceof Error ? error.message : 'Request failed' }))
            }}
          />
        </div>
      ) : null}
      {asset.status === 'processing' ? (
        <div style={{ marginTop: 16 }}>
          <Alert tone="info" title="Compressing">
            Accepted with 202 and queued for the image processor. The CDN URL becomes available when processing finishes.
          </Alert>
        </div>
      ) : null}

      <DrawerSection title="Identifiers">
        <div className="copy-stack">
          <CopyField label="CDN URL" value={url} />
          <CopyField label="Object path" value={path} />
          <CopyField label="Checksum (SHA-256)" value={`sha256:${asset.checksum}`} truncate />
          <div>
            <CopyField label="Request ID" value={asset.requestId} />
            {log ? (
              <Button size="sm" variant="link" icon={ScrollText} style={{ marginTop: 8 }} onClick={() => navigate('logs', { id: log.id })}>
                View upload request log
              </Button>
            ) : (
              <p className="field__helper" style={{ marginTop: 6 }}>
                This request log is outside the currently loaded log page.
              </p>
            )}
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Original vs output">
        <div className="mini-table-wrap">
          <table className="mini-table">
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Original</th>
                <th scope="col">Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Format</th>
                <td>{FORMAT_LABEL[asset.originalFormat]}</td>
                <td>{FORMAT_LABEL[asset.outputFormat]}</td>
              </tr>
              <tr>
                <th scope="row">Dimensions</th>
                <td>
                  {asset.originalWidth} × {asset.originalHeight}
                </td>
                <td>
                  {asset.width} × {asset.height}
                  {resized ? ' (resized)' : ''}
                </td>
              </tr>
              <tr>
                <th scope="row">File size</th>
                <td>{formatBytes(asset.originalBytes)}</td>
                <td>{asset.optimizedBytes == null ? '—' : formatBytes(asset.optimizedBytes)}</td>
              </tr>
              <tr>
                <th scope="row">Quality</th>
                <td>Source</td>
                <td>{asset.quality == null ? '—' : `q${asset.quality} · ${asset.attempts} ${asset.attempts === 1 ? 'attempt' : 'attempts'}`}</td>
              </tr>
              <tr>
                <th scope="row">Saved</th>
                <td>—</td>
                <td>{saved == null ? '—' : <span className="saved">{formatPercent(saved)}</span>}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DrawerSection>

      <DrawerSection title="Details">
        <DescriptionList
          label="Asset details"
          items={[
            { label: 'Object ID', value: <span className="mono">{asset.id}</span> },
            { label: 'Project', value: project ? `${project.name} (${project.slug})` : '—' },
            { label: 'Uploaded', value: formatDateTime(asset.uploadedAt) },
            { label: 'Uploaded via', value: <span className="mono">{asset.keyLabel}</span> },
            { label: 'Cache', value: 'Cache-Control: public, max-age=31536000, immutable' },
          ]}
        />
      </DrawerSection>
    </Drawer>
  )
}
