import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Select, SuffixInput, Switch, TextInput } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import { SettingsSection } from './SettingsLayout'

export function PreferencesTab() {
  const { settings, updateSettings, currentUser } = useStore()
  const { notify } = useToast()
  const [workspaceName, setWorkspaceName] = useState(settings.general.workspaceName)
  const [supportEmail, setSupportEmail] = useState(settings.general.supportEmail)
  const [timeZone, setTimeZone] = useState(settings.general.timeZone)
  const [retainOriginals, setRetainOriginals] = useState(settings.storage.retainOriginals)
  const [trashRetentionDays, setTrashRetentionDays] = useState(settings.storage.trashRetentionDays)
  const [minQuality, setMinQuality] = useState(settings.processing.minQuality)
  const [qualityStep, setQualityStep] = useState(settings.processing.qualityStep)
  const [stripMetadata, setStripMetadata] = useState(settings.processing.stripMetadata)
  const [defaultKeyExpiryDays, setDefaultKeyExpiryDays] = useState(settings.security.defaultKeyExpiryDays)
  const [defaultRateLimit, setDefaultRateLimit] = useState(settings.security.defaultRateLimit)
  const [saving, setSaving] = useState(false)

  if (currentUser.role !== 'admin') return null

  const save = async () => {
    setSaving(true)
    try {
      await updateSettings('general', { ...settings.general, workspaceName, supportEmail, timeZone })
      await updateSettings('storage', { ...settings.storage, retainOriginals, trashRetentionDays })
      await updateSettings('processing', { ...settings.processing, minQuality, qualityStep, stripMetadata })
      await updateSettings('security', { ...settings.security, defaultKeyExpiryDays, defaultRateLimit })
      notify({ title: 'Server preferences saved', description: 'New uploads and newly created API keys use the updated defaults.' })
    } catch (error) {
      notify({ tone: 'error', title: 'Could not save settings', description: error instanceof Error ? error.message : 'Request failed' })
    } finally {
      setSaving(false)
    }
  }

  const invalid = workspaceName.trim().length < 3 || !supportEmail.includes('@') || trashRetentionDays < 1 || trashRetentionDays > 365 || minQuality < 30 || minQuality > 95 || qualityStep < 1 || qualityStep > 20 || defaultKeyExpiryDays < 1 || defaultRateLimit < 1

  return (
    <Card as="div">
      <SettingsSection title="Editable server preferences" description="These values are stored in MySQL. Paths, URL, worker count, hard size limits, and disk thresholds remain deployment configuration.">
        <Alert tone="neutral" title="Applies without restarting">Compression preferences affect new uploads and manual reprocessing. Turning off retained originals disables future reprocessing for new files.</Alert>
        <div className="form-grid">
          <Field label="Workspace name" htmlFor="setting-workspace"><TextInput id="setting-workspace" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} /></Field>
          <Field label="Support email" htmlFor="setting-email"><TextInput id="setting-email" type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} /></Field>
          <Field label="Time zone" htmlFor="setting-timezone"><Select id="setting-timezone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)}><option value="Asia/Bangkok">Asia/Bangkok</option><option value="Asia/Singapore">Asia/Singapore</option><option value="UTC">UTC</option></Select></Field>
          <Field label="Trash retention" htmlFor="setting-trash"><SuffixInput id="setting-trash" suffix="days" type="number" min={1} max={365} value={trashRetentionDays} onChange={(event) => setTrashRetentionDays(Number(event.target.value))} /></Field>
          <Field label="Minimum WebP quality" htmlFor="setting-quality"><SuffixInput id="setting-quality" suffix="q" type="number" min={30} max={95} value={minQuality} onChange={(event) => setMinQuality(Number(event.target.value))} /></Field>
          <Field label="Quality decrement" htmlFor="setting-step"><SuffixInput id="setting-step" suffix="−q" type="number" min={1} max={20} value={qualityStep} onChange={(event) => setQualityStep(Number(event.target.value))} /></Field>
          <Field label="Default API key expiry" htmlFor="setting-expiry"><SuffixInput id="setting-expiry" suffix="days" type="number" min={1} max={3650} value={defaultKeyExpiryDays} onChange={(event) => setDefaultKeyExpiryDays(Number(event.target.value))} /></Field>
          <Field label="Default API rate limit" htmlFor="setting-rate"><SuffixInput id="setting-rate" suffix="/min" type="number" min={1} max={10000} value={defaultRateLimit} onChange={(event) => setDefaultRateLimit(Number(event.target.value))} /></Field>
        </div>
        <Switch id="setting-retain" label="Retain original images" description="Stores the private source file for later reprocessing; it counts toward project storage usage." checked={retainOriginals} onChange={setRetainOriginals} />
        <Switch id="setting-metadata" label="Strip image metadata" description="Sharp removes EXIF/GPS metadata while producing WebP output." checked={stripMetadata} onChange={setStripMetadata} />
        <Button variant="primary" icon={Save} loading={saving} disabled={invalid} onClick={() => void save()}>Save preferences</Button>
      </SettingsSection>
    </Card>
  )
}
