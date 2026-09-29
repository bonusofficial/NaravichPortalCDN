import { Copy, Download, Eye, Images, KeyRound, LayoutGrid, MoreHorizontal, Rows3, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { DataTable, type Column } from '../../components/data-table/DataTable'
import { Pagination } from '../../components/data-table/Pagination'
import { Toolbar } from '../../components/data-table/Toolbar'
import { PageHeader } from '../../components/layout/PageHeader'
import { AssetThumb } from '../../components/ui/AssetThumb'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput, Select } from '../../components/ui/Field'
import { Menu, MenuItem, MenuSeparator } from '../../components/ui/Menu'
import { Segmented } from '../../components/ui/Segmented'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { copyText } from '../../hooks/useClipboard'
import { MOBILE_QUERY } from '../../hooks/useMediaQuery'
import { usePagination } from '../../hooks/usePagination'
import { assetUrl, FORMAT_LABEL } from '../../lib/assets'
import { toMessage } from '../../lib/api'
import { DAY, mockNow } from '../../lib/constants'
import { formatBytes, formatNumber, formatPercent, savedPercent } from '../../lib/format'
import { navigate, setRouteParams, type RouteParams } from '../../lib/router'
import { ASSET_STATUS_META } from '../../lib/status'
import { useShell } from '../../state/shell-context'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { Asset, AssetStatus, ImageFormat } from '../../types'
import { ProjectName, TimeCell } from '../shared'
import { useScope } from '../useScope'
import { AssetDrawer } from './AssetDrawer'
import { downloadAsset } from './assetActions'

type DateFilter = 'any' | '24h' | '7d' | '30d'
const DATE_WINDOW: Record<Exclude<DateFilter, 'any'>, number> = { '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY }

export function AssetsView({ params }: { params: RouteParams }) {
  const { assets, projects, deleteAsset, restoreAsset } = useStore()
  const { scope, setScope, scopedProject, inScope } = useScope()
  const { openUpload } = useShell()
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [format, setFormat] = useState<'all' | ImageFormat>('all')
  const [date, setDate] = useState<DateFilter>('any')
  const [status, setStatus] = useState<'all' | AssetStatus>('all')
  // Phones get the thumbnail grid by default; the wide table stays one tap away.
  const [layout, setLayout] = useState<'table' | 'grid'>(() => (window.matchMedia(MOBILE_QUERY).matches ? 'grid' : 'table'))
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null)
  const loading = false

  const q = query.trim().toLowerCase()
  const now = mockNow()
  const rows = assets.filter(
    (asset) =>
      inScope(asset.projectId) &&
      (format === 'all' || asset.outputFormat === format) &&
      (status === 'all' || asset.status === status) &&
      (date === 'any' || now - asset.uploadedAt <= DATE_WINDOW[date]) &&
      (!q || asset.fileName.toLowerCase().includes(q) || asset.id.includes(q) || asset.requestId.includes(q)),
  )
  const filtersKey = [scope, format, date, status, q].join('|')
  const pagination = usePagination(rows, filtersKey, layout === 'grid' ? 24 : 25)
  const filtered = format !== 'all' || date !== 'any' || status !== 'all' || q !== ''
  const selected = assets.find((asset) => asset.id === params.id)
  const totalAssets = scopedProject ? scopedProject.assetCount : projects.reduce((sum, project) => sum + project.assetCount, 0)

  const clearFilters = () => {
    setQuery('')
    setFormat('all')
    setDate('any')
    setStatus('all')
  }

  const open = (asset: Asset) => setRouteParams('assets', { id: asset.id })
  const copyUrl = async (asset: Asset) => {
    const url = assetUrl(asset, projects.find((project) => project.id === asset.projectId))
    const ok = await copyText(url)
    notify(ok ? { title: 'CDN URL copied', description: url, duration: 3000 } : { tone: 'error', title: 'Could not copy' })
  }
  const download = async (asset: Asset) => {
    try {
      const kind = await downloadAsset(asset)
      notify({ title: 'Download started', description: kind === 'stored' ? `Stored ${asset.outputFormat.toUpperCase()} output` : 'Locally generated preview rendition.' })
    } catch {
      notify({ tone: 'error', title: 'Download failed' })
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      const removed = await deleteAsset(pendingDelete.id)
      if (params.id === pendingDelete.id) setRouteParams('assets', {})
      setPendingDelete(null)
      if (!removed) return
      notify({
        tone: 'success',
        title: 'Asset moved to trash',
        description: `${removed.fileName} no longer resolves at its CDN URL.`,
        action: {
          label: 'Undo',
          onClick: () => void restoreAsset(removed).catch((error) => notify({ tone: 'error', title: 'Could not restore asset', description: toMessage(error) })),
        },
      })
    } catch (error) {
      notify({ tone: 'error', title: 'Could not delete asset', description: toMessage(error) })
    }
  }

  const actions = (asset: Asset) => (
    <Menu
      label={`Actions for ${asset.fileName}`}
      trigger={(props) => <Button {...props} variant="ghost" size="sm" iconOnly icon={MoreHorizontal} aria-label={`Actions for ${asset.fileName}`} />}
    >
      <MenuItem icon={Eye} onSelect={() => open(asset)}>
        Open details
      </MenuItem>
      <MenuItem icon={Copy} disabled={asset.status !== 'ready'} onSelect={() => copyUrl(asset)}>
        Copy CDN URL
      </MenuItem>
      <MenuItem icon={Download} disabled={asset.status !== 'ready'} onSelect={() => download(asset)}>
        Download
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} tone="danger" onSelect={() => setPendingDelete(asset)}>
        Delete…
      </MenuItem>
    </Menu>
  )

  const columns: Column<Asset>[] = [
    {
      id: 'name',
      header: 'Preview / file name',
      primary: true,
      sticky: true,
      sortValue: (asset) => asset.fileName,
      cell: (asset) => (
        <>
          <AssetThumb asset={asset} size="sm" />
          <span className="cell-stack">
            <span className="cell-title cell-title--narrow">{asset.fileName}</span>
            <span className="cell-sub mono">{asset.id}</span>
          </span>
        </>
      ),
    },
    {
      id: 'project',
      header: 'Project',
      sortValue: (asset) => asset.projectId,
      cell: (asset) => (
        <span className="cell-clip">
          <ProjectName projectId={asset.projectId} />
        </span>
      ),
    },
    { id: 'format', header: 'Output', cell: (asset) => <span className="tag">{FORMAT_LABEL[asset.outputFormat]}</span> },
    {
      id: 'dimensions',
      header: 'Dimensions',
      align: 'right',
      sortValue: (asset) => asset.width * asset.height,
      cell: (asset) => `${asset.width} × ${asset.height}`,
    },
    { id: 'original', header: 'Original', align: 'right', sortValue: (asset) => asset.originalBytes, cell: (asset) => formatBytes(asset.originalBytes) },
    {
      id: 'optimized',
      header: 'Optimized',
      align: 'right',
      sortValue: (asset) => asset.optimizedBytes ?? -1,
      cell: (asset) => (asset.optimizedBytes == null ? <span className="cell-muted">—</span> : formatBytes(asset.optimizedBytes)),
    },
    {
      id: 'saved',
      header: 'Saved',
      align: 'right',
      sortValue: (asset) => savedPercent(asset.originalBytes, asset.optimizedBytes) ?? -1,
      cell: (asset) => {
        const saved = savedPercent(asset.originalBytes, asset.optimizedBytes)
        return saved == null ? <span className="cell-muted">—</span> : <span className="saved">{formatPercent(saved, 0)}</span>
      },
    },
    { id: 'status', header: 'Status', sortValue: (asset) => asset.status, cell: (asset) => <StatusBadge meta={ASSET_STATUS_META[asset.status]} /> },
    { id: 'uploaded', header: 'Uploaded', sortValue: (asset) => asset.uploadedAt, cell: (asset) => <TimeCell ts={asset.uploadedAt} /> },
    { id: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 56, cell: actions },
  ]

  const emptyState =
    scopedProject && assets.every((asset) => asset.projectId !== scopedProject.id) && !filtered ? (
      <EmptyState
        icon={Images}
        title={`No assets in ${scopedProject.name} yet`}
        description="Upload from here, or create an API key so the website backend can upload images."
        actions={
          <>
            <Button variant="primary" icon={Upload} onClick={() => openUpload(scopedProject.id)} disabled={scopedProject.status !== 'active'}>
              Upload asset
            </Button>
            <Button variant="secondary" icon={KeyRound} onClick={() => navigate('api-keys')}>
              Create API key
            </Button>
          </>
        }
      />
    ) : (
      <EmptyState
        icon={Images}
        title="No assets match these filters"
        description="Try a different search term, format, or date range."
        actions={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    )

  return (
    <div className="view">
      <PageHeader
        title="Assets"
        description={`${formatNumber(totalAssets)} images ${scopedProject ? `in ${scopedProject.name}` : `across ${projects.length} projects`}. Outputs are compressed to the project limit and served from the storage server.`}
        actions={
          <Button variant="primary" icon={Upload} onClick={() => openUpload(scopedProject?.id)}>
            Upload asset
          </Button>
        }
      />
      <Card>
        <Toolbar
          label="Asset filters"
          end={
            <Segmented
              label="Layout"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'table', label: 'Table view', icon: Rows3, iconOnly: true },
                { value: 'grid', label: 'Grid view', icon: LayoutGrid, iconOnly: true },
              ]}
            />
          }
        >
          <SearchInput label="Search assets" placeholder="File name, object ID, or request ID" value={query} onValueChange={setQuery} />
          <Select aria-label="Project" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Output format" value={format} onChange={(event) => setFormat(event.target.value as 'all' | ImageFormat)}>
            <option value="all">All formats</option>
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
          </Select>
          <Select aria-label="Uploaded" value={date} onChange={(event) => setDate(event.target.value as DateFilter)}>
            <option value="any">Any time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </Select>
          <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as 'all' | AssetStatus)}>
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </Select>
        </Toolbar>

        {layout === 'table' ? (
          <DataTable
            label="Assets"
            columns={columns}
            rows={pagination.pageItems}
            getRowId={(asset) => asset.id}
            onRowClick={open}
            rowLabel={(asset) => `Open details for ${asset.fileName}`}
            selectedId={selected?.id}
            loading={loading}
            skeletonRows={10}
            empty={emptyState}
          />
        ) : loading ? (
          <div className="asset-grid" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <div className="asset-card" key={index}>
                <Skeleton height={140} radius={6} />
                <Skeleton width="70%" />
                <Skeleton width="45%" height={10} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          emptyState
        ) : (
          <ul className="asset-grid" aria-label="Assets">
            {pagination.pageItems.map((asset) => {
              const saved = savedPercent(asset.originalBytes, asset.optimizedBytes)
              return (
                <li key={asset.id} className="asset-card">
                  <button type="button" className="asset-card__open" onClick={() => open(asset)} aria-label={`Open details for ${asset.fileName}`}>
                    <AssetThumb asset={asset} />
                    <span className="asset-card__name" title={asset.fileName}>
                      {asset.fileName}
                    </span>
                  </button>
                  <span className="asset-card__meta">
                    <span>
                      {asset.optimizedBytes != null ? formatBytes(asset.optimizedBytes) : formatBytes(asset.originalBytes)} ·{' '}
                      {FORMAT_LABEL[asset.outputFormat]}
                      {saved != null ? <span className="saved"> · −{formatPercent(saved, 0)}</span> : null}
                    </span>
                    {asset.status !== 'ready' ? <StatusBadge meta={ASSET_STATUS_META[asset.status]} /> : actions(asset)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {!loading && rows.length > 0 ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            pageCount={pagination.pageCount}
            total={pagination.total}
            onPageChange={pagination.setPage}
            noun="loaded assets"
          />
        ) : null}
      </Card>

      <AssetDrawer asset={selected} onClose={() => setRouteParams('assets', {})} onDelete={setPendingDelete} />
      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Delete this asset?"
        description={
          <>
            <strong>{pendingDelete?.fileName}</strong> will stop resolving at its CDN URL immediately. The object and its retained original
            stay in trash for 30 days before permanent removal.
          </>
        }
        confirmLabel="Delete asset"
        icon={Trash2}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
