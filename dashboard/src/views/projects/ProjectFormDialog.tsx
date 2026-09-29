import { FolderPlus, Pencil } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Check, Field, Select, SuffixInput, TextInput, Textarea } from '../../components/ui/Field'
import { fieldA11y } from '../../lib/a11y'
import { FORMAT_EXT, FORMAT_LABEL } from '../../lib/assets'
import { CDN_BASE_URL, GB, MB } from '../../lib/constants'
import { toMessage } from '../../lib/api'
import { useStore, type ProjectInput } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { ImageFormat, OutputFormatSetting, Project } from '../../types'

interface ProjectFormDialogProps {
  open: boolean
  onClose: () => void
  /** Edit this project; omit to create a new one. */
  project?: Project
  onSaved?: (project: Project) => void
}

interface FormState {
  name: string
  slug: string
  domain: string
  description: string
  quotaGb: string
  formats: ImageFormat[]
  maxInputMb: string
  maxOutputMb: string
  outputFormat: OutputFormatSetting
  quality: number
}

type Errors = Partial<Record<keyof FormState, string>>

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/-$/, '')
}

export function ProjectFormDialog(props: ProjectFormDialogProps) {
  if (!props.open) return null
  return <ProjectForm {...props} />
}

function ProjectForm({ onClose, project, onSaved }: ProjectFormDialogProps) {
  const { projects, settings, createProject, updateProject } = useStore()
  const { notify } = useToast()
  const id = useId()
  const editing = Boolean(project)
  const globalMaxInput = settings.processing.maxInputMb
  const globalMaxOutput = settings.processing.maxOutputMb
  const [slugTouched, setSlugTouched] = useState(editing)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(() => ({
    name: project?.name ?? '',
    slug: project?.slug ?? '',
    domain: project?.domain ?? '',
    description: project?.description ?? '',
    quotaGb: project ? String(Math.round(project.quotaBytes / GB)) : '50',
    formats: project?.settings.allowedFormats ?? ['jpeg', 'png', 'webp'],
    maxInputMb: project ? String(project.settings.maxInputBytes / MB) : String(globalMaxInput),
    maxOutputMb: project ? String(project.settings.maxOutputBytes / MB) : String(globalMaxOutput),
    outputFormat: project?.settings.outputFormat ?? 'webp',
    quality: project?.settings.startingQuality ?? settings.processing.startingQuality,
  }))

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const validate = (state: FormState): Errors => {
    const errors: Errors = {}
    const name = state.name.trim()
    if (name.length < 3) errors.name = 'Enter a project name of at least 3 characters.'
    else if (name.length > 60) errors.name = 'Keep the name under 60 characters.'
    if (!editing) {
      if (state.slug.length < 3) errors.slug = 'Slug must be at least 3 characters.'
      else if (!SLUG_PATTERN.test(state.slug)) errors.slug = 'Use lowercase letters, numbers, and single hyphens only.'
      else if (projects.some((p) => p.slug === state.slug)) errors.slug = `“${state.slug}” is already used by another project.`
    }
    if (state.domain.trim() && !HOST_PATTERN.test(state.domain.trim())) errors.domain = 'Enter a hostname such as www.example.com (no https://).'
    const quota = Number(state.quotaGb)
    if (!Number.isFinite(quota) || quota < 1 || quota > 1000) errors.quotaGb = 'Quota must be between 1 and 1,000 GB.'
    if (state.formats.length === 0) errors.formats = 'Allow at least one input format.'
    const maxIn = Number(state.maxInputMb)
    if (!Number.isFinite(maxIn) || maxIn < 1 || maxIn > globalMaxInput) errors.maxInputMb = `Between 1 and ${globalMaxInput} MB (server limit).`
    const maxOut = Number(state.maxOutputMb)
    if (!Number.isFinite(maxOut) || maxOut < 0.5 || maxOut > globalMaxOutput) errors.maxOutputMb = `Between 0.5 and ${globalMaxOutput} MB (server limit).`
    else if (!errors.maxInputMb && maxOut > maxIn) errors.maxOutputMb = 'Output limit cannot exceed the input limit.'
    return errors
  }

  const errors = validate(form)
  const shown: Errors = submitted ? errors : {}
  const exampleExt = FORMAT_EXT[form.outputFormat === 'original' ? 'jpeg' : form.outputFormat]

  const submit = async () => {
    setSubmitted(true)
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0]
      document.getElementById(`${id}-${first}`)?.focus()
      return
    }
    const input: ProjectInput = {
      name: form.name.trim(),
      slug: form.slug,
      description: form.description.trim(),
      domain: form.domain.trim().toLowerCase(),
      quotaBytes: Number(form.quotaGb) * GB,
      settings: {
        allowedFormats: form.formats,
        maxInputBytes: Number(form.maxInputMb) * MB,
        maxOutputBytes: Number(form.maxOutputMb) * MB,
        outputFormat: form.outputFormat,
        startingQuality: form.quality,
        minQuality: project?.settings.minQuality ?? settings.processing.minQuality,
        maxDimension: project?.settings.maxDimension ?? settings.processing.maxWidth,
        stripMetadata: project?.settings.stripMetadata ?? settings.processing.stripMetadata,
      },
    }
    setSaving(true)
    try {
      if (project) {
        const updated = await updateProject(project.id, input)
        notify({ title: 'Project updated', description: `${input.name} settings were saved.` })
        onSaved?.(updated)
      } else {
        const created = await createProject(input)
        notify({ title: 'Project created', description: `${created.name} is ready. Create an API key to start uploading.` })
        onSaved?.(created)
      }
      onClose()
    } catch (error) {
      notify({ tone: 'error', title: `Could not ${project ? 'update' : 'create'} project`, description: toMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit ${project?.name}` : 'Create project'}
      description={editing ? 'Changes apply to new uploads. Existing objects are not reprocessed.' : 'A project represents one website that stores images on the server.'}
      icon={editing ? Pencil : FolderPlus}
      size="lg"
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {editing ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Project name" htmlFor={`${id}-name`} error={shown.name} helper="Shown to staff in this console.">
          <TextInput
            {...fieldA11y(`${id}-name`, shown.name)}
            value={form.name}
            placeholder="e.g. Partner Portal"
            autoComplete="off"
            data-autofocus
            onChange={(event) => {
              const name = event.target.value
              setForm((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }))
            }}
          />
        </Field>
        <Field
          label="Slug"
          htmlFor={`${id}-slug`}
          error={shown.slug}
          helper={editing ? 'The slug is part of every CDN URL and cannot be changed.' : 'Lowercase, used in URLs and the storage path. Cannot be changed later.'}
        >
          <TextInput
            {...fieldA11y(`${id}-slug`, shown.slug)}
            mono
            value={form.slug}
            disabled={editing}
            placeholder="partner-portal"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setSlugTouched(true)
              set('slug', event.target.value.toLowerCase())
            }}
          />
        </Field>
        <div className="span-2">
          <p className="copy-stack__label">Public URL format</p>
          <p className="url-preview">
            {CDN_BASE_URL}/<strong>{form.slug || 'your-slug'}</strong>/2026/09/019c1234.{exampleExt}
          </p>
        </div>
        <Field label="Website domain" htmlFor={`${id}-domain`} error={shown.domain} optional helper="Reference hostname shown to staff; uploads should come from the website server.">
          <TextInput
            {...fieldA11y(`${id}-domain`, shown.domain)}
            value={form.domain}
            placeholder="www.example.com"
            spellCheck={false}
            onChange={(event) => set('domain', event.target.value)}
          />
        </Field>
        <Field label="Storage quota" htmlFor={`${id}-quotaGb`} error={shown.quotaGb} helper="Uploads are rejected once the project reaches its quota.">
          <SuffixInput
            {...fieldA11y(`${id}-quotaGb`, shown.quotaGb)}
            suffix="GB"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={form.quotaGb}
            onChange={(event) => set('quotaGb', event.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor={`${id}-description`} optional className="span-2">
          <Textarea
            id={`${id}-description`}
            rows={2}
            maxLength={200}
            value={form.description}
            placeholder="What this website uses images for"
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>

        <fieldset className="field span-2" aria-describedby={shown.formats ? `${id}-formats-error` : `${id}-formats-helper`}>
          <legend className="field__label">Allowed input formats</legend>
          <div className="choice-inline" id={`${id}-formats`} tabIndex={-1}>
            {(['jpeg', 'png', 'webp'] as const).map((format) => (
              <Check
                key={format}
                label={FORMAT_LABEL[format]}
                checked={form.formats.includes(format)}
                onChange={(event) =>
                  set('formats', event.target.checked ? [...form.formats, format] : form.formats.filter((f) => f !== format))
                }
              />
            ))}
          </div>
          {shown.formats ? (
            <p className="field__error" id={`${id}-formats-error`} role="alert">
              {shown.formats}
            </p>
          ) : (
            <p className="field__helper" id={`${id}-formats-helper`}>
              Files are checked by content (magic bytes), not by extension.
            </p>
          )}
        </fieldset>

        <Field label="Max input size" htmlFor={`${id}-maxInputMb`} error={shown.maxInputMb} helper={`Server limit: ${globalMaxInput} MB.`}>
          <SuffixInput
            {...fieldA11y(`${id}-maxInputMb`, shown.maxInputMb)}
            suffix="MB"
            type="number"
            inputMode="decimal"
            step={1}
            value={form.maxInputMb}
            onChange={(event) => set('maxInputMb', event.target.value)}
          />
        </Field>
        <Field label="Max output size" htmlFor={`${id}-maxOutputMb`} error={shown.maxOutputMb} helper={`Compression target. Server limit: ${globalMaxOutput} MB.`}>
          <SuffixInput
            {...fieldA11y(`${id}-maxOutputMb`, shown.maxOutputMb)}
            suffix="MB"
            type="number"
            inputMode="decimal"
            step={0.5}
            value={form.maxOutputMb}
            onChange={(event) => set('maxOutputMb', event.target.value)}
          />
        </Field>
        <Field label="Output format" htmlFor={`${id}-output`} helper="The server currently stores every output as WebP.">
          <Select
            id={`${id}-output`}
            aria-describedby={`${id}-output-helper`}
            value="webp"
            disabled
            onChange={() => undefined}
          >
            <option value="webp">WebP</option>
          </Select>
        </Field>
        <Field
          label="Starting quality"
          htmlFor={`${id}-quality`}
          helper={`Steps down by ${settings.processing.qualityStep} (minimum ${settings.processing.minQuality}) until the output fits, then resizes.`}
        >
          <div className="range">
            <input
              id={`${id}-quality`}
              aria-describedby={`${id}-quality-helper`}
              type="range"
              min={40}
              max={95}
              value={form.quality}
              onChange={(event) => set('quality', Number(event.target.value))}
            />
            <output htmlFor={`${id}-quality`}>{form.quality}</output>
          </div>
        </Field>
      </div>
    </Dialog>
  )
}
