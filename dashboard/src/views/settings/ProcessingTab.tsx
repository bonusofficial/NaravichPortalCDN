import { useId, type ChangeEvent } from 'react'
import { Field, Select, SuffixInput, Switch } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { fieldA11y } from '../../lib/a11y'
import { useToast } from '../../state/toast-context'
import type { ProcessingSettings } from '../../types'
import { SettingsForm, SettingsSection } from './SettingsLayout'
import { useSettingsDraft } from './useSettingsDraft'

type NumericKey = { [K in keyof ProcessingSettings]: ProcessingSettings[K] extends number ? K : never }[keyof ProcessingSettings]

export function ProcessingTab() {
  const { draft, set, dirty, changedCount, save, discard } = useSettingsDraft('processing')
  const { notify } = useToast()
  const id = useId()

  const errors: Record<string, string> = {}
  const within = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max
  if (!within(draft.maxInputMb, 1, 100)) errors.maxInputMb = 'Between 1 and 100 MB.'
  if (!within(draft.maxOutputMb, 0.5, 20)) errors.maxOutputMb = 'Between 0.5 and 20 MB.'
  else if (draft.maxOutputMb > draft.maxInputMb) errors.maxOutputMb = 'Cannot exceed the max input size.'
  if (!within(draft.startingQuality, 40, 100)) errors.startingQuality = 'Between 40 and 100.'
  if (!within(draft.minQuality, 30, 95)) errors.minQuality = 'Between 30 and 95.'
  else if (draft.minQuality > draft.startingQuality) errors.minQuality = 'Must not exceed the starting quality.'
  if (!within(draft.qualityStep, 1, 20)) errors.qualityStep = 'Between 1 and 20.'
  if (!within(draft.maxWidth, 256, 8192)) errors.maxWidth = '256 – 8192 px.'
  if (!within(draft.maxHeight, 256, 8192)) errors.maxHeight = '256 – 8192 px.'
  if (!Number.isInteger(draft.workers) || !within(draft.workers, 1, 16)) errors.workers = 'Whole number between 1 and 16.'

  const steps =
    Number.isFinite(draft.startingQuality) && Number.isFinite(draft.minQuality) && draft.qualityStep > 0
      ? Math.max(1, Math.floor((draft.startingQuality - draft.minQuality) / draft.qualityStep) + 1)
      : 0

  const num = (key: NumericKey) => (event: ChangeEvent<HTMLInputElement>) =>
    set(key, event.target.value === '' ? Number.NaN : Number(event.target.value))
  const value = (n: number) => (Number.isNaN(n) ? '' : n)

  return (
    <SettingsForm
      label="Image processing settings"
      dirty={dirty}
      changedCount={changedCount}
      errorCount={Object.keys(errors).length}
      onDiscard={discard}
      onSave={() => {
        const count = save()
        notify({ title: 'Processing settings saved', description: `${count} ${count === 1 ? 'change' : 'changes'}. New uploads use the new rules.` })
      }}
    >
      <SettingsSection title="Size limits" description="Server-wide ceilings. Projects can set lower limits but not higher.">
        <div className="form-grid">
          <Field label="Max input size" htmlFor={`${id}-maxInputMb`} error={errors.maxInputMb} helper="Larger uploads get 413.">
            <SuffixInput {...fieldA11y(`${id}-maxInputMb`, errors.maxInputMb)} suffix="MB" type="number" inputMode="decimal" value={value(draft.maxInputMb)} onChange={num('maxInputMb')} />
          </Field>
          <Field label="Max output size" htmlFor={`${id}-maxOutputMb`} error={errors.maxOutputMb} helper="Compression target, hard limit.">
            <SuffixInput {...fieldA11y(`${id}-maxOutputMb`, errors.maxOutputMb)} suffix="MB" type="number" inputMode="decimal" step={0.5} value={value(draft.maxOutputMb)} onChange={num('maxOutputMb')} />
          </Field>
          <Field label="Max width" htmlFor={`${id}-maxWidth`} error={errors.maxWidth} helper="Larger images are downscaled.">
            <SuffixInput {...fieldA11y(`${id}-maxWidth`, errors.maxWidth)} suffix="px" type="number" inputMode="numeric" value={value(draft.maxWidth)} onChange={num('maxWidth')} />
          </Field>
          <Field label="Max height" htmlFor={`${id}-maxHeight`} error={errors.maxHeight} helper={`Currently ${draft.maxWidth} × ${draft.maxHeight}.`}>
            <SuffixInput {...fieldA11y(`${id}-maxHeight`, errors.maxHeight)} suffix="px" type="number" inputMode="numeric" value={value(draft.maxHeight)} onChange={num('maxHeight')} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Compression" description="Quality steps down until the output fits, then the image is resized by 10% per attempt.">
        <Field label="Output format" htmlFor={`${id}-format`} helper="Default for new projects.">
          <Select
            id={`${id}-format`}
            aria-describedby={`${id}-format-helper`}
            value={draft.outputFormat}
            onChange={(event) => set('outputFormat', event.target.value as ProcessingSettings['outputFormat'])}
          >
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="original">Keep original format</option>
          </Select>
        </Field>
        <div className="form-grid form-grid--3">
          <Field label="Starting quality" htmlFor={`${id}-startingQuality`} error={errors.startingQuality}>
            <SuffixInput {...fieldA11y(`${id}-startingQuality`, errors.startingQuality, false)} suffix="q" type="number" inputMode="numeric" value={value(draft.startingQuality)} onChange={num('startingQuality')} />
          </Field>
          <Field label="Minimum quality" htmlFor={`${id}-minQuality`} error={errors.minQuality}>
            <SuffixInput {...fieldA11y(`${id}-minQuality`, errors.minQuality, false)} suffix="q" type="number" inputMode="numeric" value={value(draft.minQuality)} onChange={num('minQuality')} />
          </Field>
          <Field label="Quality step" htmlFor={`${id}-qualityStep`} error={errors.qualityStep}>
            <SuffixInput {...fieldA11y(`${id}-qualityStep`, errors.qualityStep, false)} suffix="−q" type="number" inputMode="numeric" value={value(draft.qualityStep)} onChange={num('qualityStep')} />
          </Field>
        </div>
        {steps > 0 && Object.keys(errors).length === 0 ? (
          <Alert tone="neutral" title={`Up to ${steps} quality ${steps === 1 ? 'attempt' : 'attempts'} before resizing`}>
            q{draft.startingQuality} → q{draft.startingQuality - (steps - 1) * draft.qualityStep} in steps of {draft.qualityStep}, then 90% dimensions per attempt
            until the output is ≤ {draft.maxOutputMb} MB.
          </Alert>
        ) : null}
        <Switch
          id={`${id}-strip`}
          label="Strip metadata"
          description="Removes EXIF (including GPS) and converts colour to sRGB. Recommended for public images."
          checked={draft.stripMetadata}
          onChange={(checked) => set('stripMetadata', checked)}
        />
      </SettingsSection>

      <SettingsSection title="Workers" description="libvips processes on the server. More workers use more memory (≈350 MB each).">
        <Field label="Worker processes" htmlFor={`${id}-workers`} error={errors.workers} helper="The server has 8 vCPUs and 16 GB RAM.">
          <SuffixInput {...fieldA11y(`${id}-workers`, errors.workers)} suffix="workers" type="number" inputMode="numeric" value={value(draft.workers)} onChange={num('workers')} />
        </Field>
      </SettingsSection>
    </SettingsForm>
  )
}
