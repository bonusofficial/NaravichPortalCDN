import { CircleCheck, CircleDashed, CircleX, Image, LoaderCircle } from 'lucide-react'
import { HttpCode, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { CopyField } from '../../components/ui/CopyField'
import { DescriptionList } from '../../components/ui/DescriptionList'
import { Drawer, DrawerSection } from '../../components/ui/Drawer'
import { Alert } from '../../components/ui/States'
import { formatBytes, formatDateTime, formatDuration, formatNumber } from '../../lib/format'
import { navigate } from '../../lib/router'
import { HTTP_STATUS_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import type { StepState, UploadLog } from '../../types'
import { outcomeMeta } from './outcome'

const STEP_ICON: Record<StepState, typeof CircleCheck> = {
  passed: CircleCheck,
  failed: CircleX,
  skipped: CircleDashed,
  running: LoaderCircle,
}

export function LogDrawer({ log, onClose }: { log: UploadLog | undefined; onClose: () => void }) {
  const { projects, assets } = useStore()
  if (!log) return null
  const project = projects.find((item) => item.id === log.projectId)
  const asset = log.assetId ? assets.find((item) => item.id === log.assetId) : undefined
  const status = HTTP_STATUS_META[log.httpStatus]

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      eyebrow="Upload request"
      title={<span className="mono">{log.requestId}</span>}
      subtitle={
        <>
          <HttpCode status={log.httpStatus} />
          <StatusBadge meta={outcomeMeta(log)} />
          <span>· {formatDateTime(log.timestamp)}</span>
        </>
      }
      footer={
        asset ? (
          <Button variant="secondary" icon={Image} onClick={() => navigate('assets', { id: asset.id })}>
            Open asset
          </Button>
        ) : undefined
      }
    >
      <dl className="summary-strip">
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(log.durationMs)}</dd>
        </div>
        <div>
          <dt>Original → optimized</dt>
          <dd>
            {formatBytes(log.originalBytes)} → {log.optimizedBytes == null ? '—' : formatBytes(log.optimizedBytes)}
          </dd>
        </div>
        <div>
          <dt>Source IP</dt>
          <dd className="mono">{log.sourceIp}</dd>
        </div>
      </dl>

      {log.error ? (
        <div style={{ marginTop: 16 }}>
          <Alert tone={status.tone === 'danger' || log.outcome === 'failed' ? 'danger' : 'warning'} title={log.error.message}>
            <span className="mono">{log.error.code}</span> — {log.error.hint}
          </Alert>
        </div>
      ) : null}

      <DrawerSection title="Validation & processing">
        <ol className="steps">
          {log.steps.map((step) => {
            const Icon = STEP_ICON[step.state]
            return (
              <li key={step.label} className={`step step--${step.state}`}>
                <span className="step__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="step__label">
                  {step.label}
                  <span className="sr-only"> — {step.state}</span>
                </span>
                <span className="step__time">{step.durationMs != null ? formatDuration(step.durationMs) : ''}</span>
                <span className="step__detail">{step.detail}</span>
              </li>
            )
          })}
        </ol>
      </DrawerSection>

      <DrawerSection title="Compression attempts">
        {log.attempts.length ? (
          <div className="mini-table-wrap">
            <table className="mini-table">
              <thead>
                <tr>
                  <th scope="col">Attempt</th>
                  <th scope="col">Quality</th>
                  <th scope="col">Dimensions</th>
                  <th scope="col">Output</th>
                  <th scope="col">Within limit</th>
                </tr>
              </thead>
              <tbody>
                {log.attempts.map((attempt) => (
                  <tr key={attempt.attempt}>
                    <td>#{attempt.attempt}</td>
                    <td>q{attempt.quality}</td>
                    <td>
                      {formatNumber(attempt.width)} × {formatNumber(attempt.height)}
                    </td>
                    <td>{formatBytes(attempt.bytes)}</td>
                    <td>
                      {attempt.withinLimit ? (
                        <span className="text-success">Yes</span>
                      ) : (
                        <span className="text-danger">No — {formatBytes(project?.settings.maxOutputBytes ?? 0)} limit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>
            {log.outcome === 'processing' ? 'Compression is still running.' : 'Not reached — the request was rejected before processing.'}
          </p>
        )}
      </DrawerSection>

      {log.objectPath ? (
        <DrawerSection title="Stored object">
          <CopyField label="Object path" value={log.objectPath} />
        </DrawerSection>
      ) : null}

      <DrawerSection title="Request">
        <DescriptionList
          label="Request details"
          items={[
            { label: 'Project', value: project ? `${project.name} (${project.slug})` : log.projectId },
            { label: 'API key', value: <span className="mono">{log.keyLabel}</span> },
            { label: 'File', value: `${log.fileName} · ${log.mimeType}` },
            { label: 'User agent', value: <span className="mono">{log.userAgent}</span> },
            { label: 'Received', value: formatDateTime(log.timestamp) },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Response payload">
        <CodeBlock
          label="Response payload"
          title={`HTTP ${log.httpStatus} · application/json`}
          samples={[{ id: 'response', label: `HTTP ${log.httpStatus}`, language: 'json', code: JSON.stringify(log.response, null, 2) }]}
        />
      </DrawerSection>
    </Drawer>
  )
}
