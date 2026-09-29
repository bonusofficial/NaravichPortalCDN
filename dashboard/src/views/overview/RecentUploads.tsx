import { ArrowRight, Images } from 'lucide-react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { AssetThumb } from '../../components/ui/AssetThumb'
import { EmptyState } from '../../components/ui/States'
import { FORMAT_LABEL } from '../../lib/assets'
import { formatPercent, savedPercent } from '../../lib/format'
import { navigate } from '../../lib/router'
import { ASSET_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import type { Asset } from '../../types'
import { ProjectName, SizeFlow, TimeCell } from '../shared'
import { useScope } from '../useScope'

export function RecentUploads() {
  const { assets } = useStore()
  const { inScope, scopedProject } = useScope()
  const rows = assets.filter((asset) => inScope(asset.projectId)).slice(0, 8)

  const columns: Column<Asset>[] = [
    {
      id: 'file',
      header: 'File',
      primary: true,
      sticky: true,
      cell: (asset) => (
        <>
          <AssetThumb asset={asset} size="sm" />
          <span className="cell-stack">
            <span className="cell-title">{asset.fileName}</span>
            <span className="cell-sub">
              {asset.width} × {asset.height}
            </span>
          </span>
        </>
      ),
    },
    { id: 'project', header: 'Project', cell: (asset) => <ProjectName projectId={asset.projectId} /> },
    { id: 'format', header: 'Output', cell: (asset) => <span className="tag">{FORMAT_LABEL[asset.outputFormat]}</span> },
    { id: 'size', header: 'Original → optimized', cell: (asset) => <SizeFlow from={asset.originalBytes} to={asset.optimizedBytes} /> },
    {
      id: 'saved',
      header: 'Saved',
      align: 'right',
      cell: (asset) => {
        const saved = savedPercent(asset.originalBytes, asset.optimizedBytes)
        return saved == null ? <span className="cell-muted">—</span> : <span className="saved">{formatPercent(saved, 0)}</span>
      },
    },
    { id: 'status', header: 'Status', cell: (asset) => <StatusBadge meta={ASSET_STATUS_META[asset.status]} /> },
    { id: 'uploaded', header: 'Uploaded', cell: (asset) => <TimeCell ts={asset.uploadedAt} /> },
  ]

  return (
    <Card aria-labelledby="recent-title">
      <CardHeader
        titleId="recent-title"
        title="Recent uploads"
        subtitle={scopedProject ? `Latest objects stored for ${scopedProject.name}` : 'Latest objects stored across all projects'}
        actions={
          <Button size="sm" variant="ghost" iconRight={ArrowRight} onClick={() => navigate('assets')}>
            All assets
          </Button>
        }
        divided
      />
      <DataTable
        label="Recent uploads"
        columns={columns}
        rows={rows}
        getRowId={(asset) => asset.id}
        onRowClick={(asset) => navigate('assets', { id: asset.id })}
        rowLabel={(asset) => `Open details for ${asset.fileName}`}
        density="compact"
        empty={<EmptyState compact icon={Images} title="No uploads yet" description="Uploads for this project will appear here." />}
      />
    </Card>
  )
}
