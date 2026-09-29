import { Archive, CircleCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, SuffixInput, Switch, TextInput } from '../../components/ui/Field'
import { Alert, InlineError } from '../../components/ui/States'
import { LAST_BACKUP } from '../../data/system'
import { fieldA11y } from '../../lib/a11y'
import { DAY, HOUR, mockNow } from '../../lib/constants'
import { formatDateTime, formatRelative } from '../../lib/format'
import { HEALTH_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import { SettingsForm, SettingsSection } from './SettingsLayout'
import { useSettingsDraft } from './useSettingsDraft'

const HISTORY = [
  { at: LAST_BACKUP.finishedAt, size: '382.9 GB', duration: '38 min' },
  { at: LAST_BACKUP.finishedAt - DAY + 3 * 60_000, size: '382.4 GB', duration: '37 min' },
  { at: LAST_BACKUP.finishedAt - 2 * DAY - 60_000, size: '381.8 GB', duration: '39 min' },
  { at: LAST_BACKUP.finishedAt - 3 * DAY + 2 * 60_000, size: '381.3 GB', duration: '36 min' },
  { at: LAST_BACKUP.finishedAt - 4 * DAY, size: '380.9 GB', duration: '38 min' },
]

export function BackupTab() {
  const { draft, set, dirty, changedCount, save, discard } = useSettingsDraft('backup')
  const { runBackup } = useStore()
  const { notify } = useToast()
  const id = useId()
  const [running, setRunning] = useState(false)
  const [manualAt, setManualAt] = useState<number | null>(null)
  const [offsite, setOffsite] = useState<'lagging' | 'syncing' | 'ok'>('lagging')
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const errors: Record<string, string> = {}
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.schedule)) errors.schedule = 'Use 24-hour HH:MM.'
  if (!Number.isInteger(draft.retentionDays) || draft.retentionDays < 1 || draft.retentionDays > 90) errors.retentionDays = 'Between 1 and 90 days.'
  if (!/^[\w.-]+:\/[\w/.-]+$/.test(draft.target)) errors.target = 'Use host:/absolute/path.'

  const startBackup = () => {
    setRunning(true)
    runBackup()
    notify({ tone: 'info', title: 'Backup started', description: `Snapshot to ${draft.target}` })
    timers.current.push(
      window.setTimeout(() => {
        setRunning(false)
        setManualAt(mockNow())
        notify({ title: 'Backup completed', description: 'Manual snapshot finished and verified (prototype: simulated in 3 s).' })
      }, 3000),
    )
  }

  const retrySync = () => {
    setOffsite('syncing')
    timers.current.push(
      window.setTimeout(() => {
        setOffsite('ok')
        notify({ title: 'Offsite copy in sync', description: 'Latest snapshot replicated to the offsite target.' })
      }, 1800),
    )
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Backup status"
          subtitle={`Nightly snapshot of ${draft.target.split(':')[0]}`}
          actions={
            <Button variant="secondary" icon={Archive} loading={running} onClick={startBackup} disabled={!draft.enabled}>
              {running ? 'Backing up…' : 'Run backup now'}
            </Button>
          }
          divided
        />
        <div className="settings-section" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <div className="form-stack">
            <Alert tone="success" icon={CircleCheck} title={`Last backup ${manualAt ? 'succeeded (manual)' : 'succeeded'}`}>
              {manualAt
                ? `${formatDateTime(manualAt)} · verified`
                : `${formatDateTime(LAST_BACKUP.finishedAt)} · ${LAST_BACKUP.sizeLabel} in 38 min · verified`}
            </Alert>
            {offsite === 'ok' ? (
              <Alert tone="success" title="Offsite copy in sync">
                Replicated {formatRelative(mockNow())}.
              </Alert>
            ) : offsite === 'syncing' ? (
              <Alert tone="info" title="Syncing offsite copy…">
                Transferring the latest snapshot.
              </Alert>
            ) : (
              <InlineError
                title="Offsite copy is 2 days behind"
                description={`Last successful sync ${formatDateTime(mockNow() - 2 * DAY - 3 * HOUR)}: connection to offsite storage timed out.`}
                retryLabel="Retry sync"
                onRetry={retrySync}
              />
            )}
            <p className="muted" style={{ fontSize: 13 }}>
              {draft.enabled ? `Next scheduled run: 30 Sep 2026, ${draft.schedule} ICT` : 'Scheduled backups are disabled.'}
            </p>
          </div>
          <div>
            <p className="copy-stack__label">Recent snapshots</p>
            <ul className="backup-list">
              {HISTORY.map((item) => (
                <li className="backup-row" key={item.at}>
                  <span>{formatDateTime(item.at)}</span>
                  <StatusBadge meta={HEALTH_META.operational} label="Succeeded" />
                  <span className="muted" style={{ fontSize: 12 }}>
                    {item.size} · {item.duration}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <SettingsForm
        label="Backup settings"
        dirty={dirty}
        changedCount={changedCount}
        errorCount={Object.keys(errors).length}
        onDiscard={discard}
        onSave={() => {
          const count = save()
          notify({ title: 'Backup settings saved', description: `${count} ${count === 1 ? 'change' : 'changes'} recorded in the audit log.` })
        }}
      >
        <SettingsSection title="Schedule" description="Snapshots include asset storage, retained originals, and the MySQL metadata database.">
          <Switch
            id={`${id}-enabled`}
            label="Enable scheduled backups"
            description="Disabling is not recommended; the audit log records who turned it off."
            checked={draft.enabled}
            onChange={(value) => set('enabled', value)}
          />
          <div className="form-grid">
            <Field label="Daily start time (ICT)" htmlFor={`${id}-schedule`} error={errors.schedule}>
              <TextInput {...fieldA11y(`${id}-schedule`, errors.schedule, false)} type="time" value={draft.schedule} onChange={(event) => set('schedule', event.target.value)} />
            </Field>
            <Field label="Keep snapshots for" htmlFor={`${id}-retentionDays`} error={errors.retentionDays}>
              <SuffixInput
                {...fieldA11y(`${id}-retentionDays`, errors.retentionDays, false)}
                suffix="days"
                type="number"
                inputMode="numeric"
                value={Number.isNaN(draft.retentionDays) ? '' : draft.retentionDays}
                onChange={(event) => set('retentionDays', event.target.value === '' ? Number.NaN : Number(event.target.value))}
              />
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection title="Destination" description="Local snapshots stay on the server; the target receives a replicated copy.">
          <Field label="Backup target" htmlFor={`${id}-target`} error={errors.target} helper="rsync over SSH, host:/path.">
            <TextInput {...fieldA11y(`${id}-target`, errors.target)} mono value={draft.target} spellCheck={false} onChange={(event) => set('target', event.target.value)} />
          </Field>
          <Switch
            id={`${id}-verify`}
            label="Verify checksums after each backup"
            description="Adds about 6 minutes but detects silent corruption."
            checked={draft.verifyAfterBackup}
            onChange={(value) => set('verifyAfterBackup', value)}
          />
        </SettingsSection>
      </SettingsForm>
    </>
  )
}
