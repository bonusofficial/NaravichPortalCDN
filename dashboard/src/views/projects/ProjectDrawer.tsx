import { History, Image, KeyRound, Pause, Pencil, Play, Settings2 } from 'lucide-react'
import { StatusBadge, Tag } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CopyField } from '../../components/ui/CopyField'
import { DescriptionList } from '../../components/ui/DescriptionList'
import { Drawer, DrawerSection } from '../../components/ui/Drawer'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Alert } from '../../components/ui/States'
import { AUDIT_ACTION_LABEL } from '../../lib/audit'
import { FORMAT_LABEL, OUTPUT_SETTING_LABEL } from '../../lib/assets'
import { formatBytes, formatDate, formatNumber, formatPercent, formatRelative } from '../../lib/format'
import { navigate } from '../../lib/router'
import { PROJECT_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { Project } from '../../types'

interface ActivityItem {
  id: string
  at: number
  text: string
  kind: 'upload' | 'audit'
}

interface ProjectDrawerProps {
  project: Project | undefined
  onClose: () => void
  onEdit: (project: Project) => void
  onRequestPause: (project: Project) => void
}

export function ProjectDrawer({ project, onClose, onEdit, onRequestPause }: ProjectDrawerProps) {
  const { assets, audit, apiKeys, settings, setProjectStatus, setScope } = useStore()
  const { notify } = useToast()

  if (!project) return null

  const activeKeys = apiKeys.filter((key) => key.projectId === project.id && key.status === 'active').length
  const usage = (project.storageBytes / project.quotaBytes) * 100
  const s = project.settings

  const activity: ActivityItem[] = [
    ...assets
      .filter((asset) => asset.projectId === project.id)
      .slice(0, 4)
      .map((asset) => ({
        id: asset.id,
        at: asset.uploadedAt,
        text: `${asset.status === 'failed' ? 'Upload failed' : asset.status === 'processing' ? 'Processing' : 'Uploaded'} ${asset.fileName}`,
        kind: 'upload' as const,
      })),
    ...audit
      .filter((entry) => entry.resource.id === project.id || entry.details.project === project.slug)
      .slice(0, 4)
      .map((entry) => ({
        id: entry.id,
        at: entry.timestamp,
        text: `${entry.actor.name}: ${AUDIT_ACTION_LABEL[entry.action].toLowerCase()} · ${entry.resource.label}`,
        kind: 'audit' as const,
      })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)

  const openScoped = (view: 'assets' | 'api-keys') => {
    setScope(project.id)
    navigate(view)
  }

  return (
    <Drawer
        open
        onClose={onClose}
        eyebrow="Project"
        title={project.name}
        subtitle={
          <>
            <StatusBadge meta={PROJECT_STATUS_META[project.status]} />
            <span className="mono">{project.slug}</span>
            {project.domain ? <span>· {project.domain}</span> : null}
          </>
        }
        headerActions={
          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(project)} disabled={project.status === 'archived'}>
            Edit
          </Button>
        }
        footer={
          <>
            <Button variant="secondary" icon={Image} onClick={() => openScoped('assets')}>
              View assets
            </Button>
            <Button variant="secondary" icon={KeyRound} onClick={() => openScoped('api-keys')}>
              API keys
            </Button>
            <div className="drawer__footer-end">
              {project.status === 'active' ? (
                <Button variant="danger-outline" icon={Pause} onClick={() => onRequestPause(project)}>
                  Pause uploads
                </Button>
              ) : project.status === 'paused' ? (
                <Button
                  variant="secondary"
                  icon={Play}
                  onClick={() => {
                    setProjectStatus(project.id, 'active')
                    notify({ title: 'Uploads resumed', description: `${project.name} accepts uploads again.` })
                  }}
                >
                  Resume uploads
                </Button>
              ) : null}
            </div>
          </>
        }
      >
        {project.description ? <p className="muted" style={{ marginBottom: 16 }}>{project.description}</p> : null}
        {project.status === 'paused' ? (
          <Alert tone="warning" title="Uploads are paused">
            API requests return 403 until uploads are resumed. Existing objects are still served.
          </Alert>
        ) : null}
        {project.status === 'archived' ? (
          <Alert tone="neutral" title="Archived project">
            Read-only. Objects are served but no uploads or key changes are allowed.
          </Alert>
        ) : null}

        <DrawerSection title="Usage">
          <dl className="stat-row">
            <div>
              <dt>Assets</dt>
              <dd>{formatNumber(project.assetCount)}</dd>
            </div>
            <div>
              <dt>Requests (30 days)</dt>
              <dd>{formatNumber(project.requests30d)}</dd>
            </div>
            <div>
              <dt>Active API keys</dt>
              <dd>{activeKeys}</dd>
            </div>
          </dl>
          <div style={{ marginTop: 14 }}>
            <ProgressBar
              label="Storage quota"
              heading="Storage quota"
              value={usage}
              valueText={`${formatBytes(project.storageBytes)} of ${formatBytes(project.quotaBytes)} · ${formatPercent(usage)}`}
              tone="auto"
            />
          </div>
        </DrawerSection>

        <DrawerSection title="Delivery & storage">
          <div className="copy-stack">
            <CopyField label="Public base URL" value={`${settings.general.publicBaseUrl}/${project.slug}/`} />
            <CopyField label="Storage path" value={`${settings.storage.storagePath}/${project.slug}`} />
          </div>
        </DrawerSection>

        <DrawerSection
          title="Upload & compression rules"
          actions={
            <Button size="sm" variant="ghost" icon={Settings2} onClick={() => navigate('settings', { tab: 'processing' })}>
              Server defaults
            </Button>
          }
        >
          <DescriptionList
            label="Upload and compression rules"
            items={[
              {
                label: 'Allowed formats',
                value: (
                  <span className="tag-list">
                    {s.allowedFormats.map((format) => (
                      <Tag key={format}>{FORMAT_LABEL[format]}</Tag>
                    ))}
                  </span>
                ),
              },
              { label: 'Max input size', value: formatBytes(s.maxInputBytes) },
              { label: 'Max output size', value: `${formatBytes(s.maxOutputBytes)} (hard limit)` },
              { label: 'Output format', value: OUTPUT_SETTING_LABEL[s.outputFormat] },
              { label: 'Quality', value: `Start q${s.startingQuality}, step −${settings.processing.qualityStep}, minimum q${s.minQuality}` },
              { label: 'Max dimensions', value: `${s.maxDimension} px on the longest edge` },
              { label: 'Metadata', value: s.stripMetadata ? 'EXIF/GPS stripped · colour converted to sRGB' : 'Preserved' },
              { label: 'Created', value: `${formatDate(project.createdAt)} · owner ${project.owner}` },
            ]}
          />
        </DrawerSection>

        <DrawerSection title="Recent activity">
          {activity.length ? (
            <ul className="activity">
              {activity.map((item) => (
                <li key={item.id}>
                  {item.kind === 'upload' ? <Image aria-hidden="true" /> : <History aria-hidden="true" />}
                  <span className="activity__text">{item.text}</span>
                  <span className="activity__time">{formatRelative(item.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No activity yet.</p>
          )}
        </DrawerSection>
    </Drawer>
  )
}
