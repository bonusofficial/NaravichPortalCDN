import { CircleAlert, CircleCheck, FileImage, ImagePlus, LoaderCircle, Trash2, Upload, UploadCloud } from 'lucide-react'
import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyField'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Select } from '../../components/ui/Field'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Alert } from '../../components/ui/States'
import { assetUrl, FORMAT_LABEL, FORMAT_MIME, mimeToFormat, OUTPUT_SETTING_LABEL } from '../../lib/assets'
import { formatBytes, formatPercent, pluralize, savedPercent } from '../../lib/format'
import { createSampleImage, readImageDimensions } from '../../lib/image'
import { toMessage } from '../../lib/api'
import { navigate } from '../../lib/router'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { Asset, ImageFormat, Project } from '../../types'

type ItemStatus = 'checking' | 'invalid' | 'queued' | 'uploading' | 'processing' | 'done' | 'failed'

interface UploadItem {
  id: string
  file: File
  format: ImageFormat | null
  previewUrl: string | null
  width?: number
  height?: number
  status: ItemStatus
  progress: number
  error?: string
  asset?: Asset
}

const MAX_FILES = 10

interface UploadDialogProps {
  open: boolean
  initialProjectId?: string
  onClose: () => void
}

export function UploadDialog(props: UploadDialogProps) {
  if (!props.open) return null
  return <UploadDialogContent {...props} />
}

function UploadDialogContent({ initialProjectId, onClose }: UploadDialogProps) {
  const { projects, scope, uploadFile, refresh } = useStore()
  const { notify } = useToast()
  const activeProjects = projects.filter((project) => project.status === 'active')
  const defaultProject =
    activeProjects.find((project) => project.id === initialProjectId) ??
    activeProjects.find((project) => project.id === scope) ??
    activeProjects[0]
  const [projectId, setProjectId] = useState(defaultProject?.id ?? '')
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [sampleCount, setSampleCount] = useState(0)
  const [addingSample, setAddingSample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])
  const inputId = useId()

  const project = projects.find((item) => item.id === projectId)

  useEffect(() => {
    const createdUrls = urls.current
    return () => {
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const running = items.some((item) => item.status === 'uploading' || item.status === 'processing')
  const queued = items.filter((item) => item.status === 'queued')
  const finished = items.filter((item) => item.status === 'done' || item.status === 'failed')
  const complete = items.length > 0 && !running && queued.length === 0 && finished.length > 0

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const validate = (file: File, target: Project | undefined): string | null => {
    const format = mimeToFormat(file.type)
    if (!format) return `Unsupported type ${file.type || 'unknown'} — upload JPEG, PNG, or WebP.`
    if (target && !target.settings.allowedFormats.includes(format))
      return `${FORMAT_LABEL[format]} is not allowed for ${target.name}.`
    if (target && file.size > target.settings.maxInputBytes)
      return `File is ${formatBytes(file.size)}; the input limit is ${formatBytes(target.settings.maxInputBytes)}.`
    if (file.size === 0) return 'File is empty.'
    return null
  }

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).slice(0, Math.max(0, MAX_FILES - items.length))
    if (fileList.length > files.length) {
      notify({ tone: 'warning', title: `Up to ${MAX_FILES} files per batch`, description: 'Extra files were not added.' })
    }
    const next: UploadItem[] = files.map((file) => {
      const error = validate(file, project)
      const format = mimeToFormat(file.type)
      const previewUrl = format ? URL.createObjectURL(file) : null
      if (previewUrl) urls.current.push(previewUrl)
      return {
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        format,
        previewUrl,
        status: error ? 'invalid' : 'checking',
        progress: 0,
        error: error ?? undefined,
      }
    })
    setItems((prev) => [...prev, ...next])
    next
      .filter((item) => item.status === 'checking')
      .forEach((item) => {
        readImageDimensions(item.file)
          .then(({ width, height }) => update(item.id, { width, height, status: 'queued' }))
          .catch(() => update(item.id, { status: 'invalid', error: 'Could not decode image — the file may be corrupt.' }))
      })
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (running) return
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  const addSample = async () => {
    setAddingSample(true)
    try {
      const file = await createSampleImage(sampleCount)
      setSampleCount((count) => count + 1)
      addFiles([file])
    } catch {
      notify({ tone: 'error', title: 'Could not generate a sample image' })
    } finally {
      setAddingSample(false)
    }
  }

  const start = async () => {
    if (!project) return
    const target = project
    const batch = queued
    const results = await Promise.all(batch.map(async (item) => {
      update(item.id, { status: 'uploading', progress: 20, error: undefined })
      try {
        update(item.id, { status: 'processing', progress: 85 })
        const asset = await uploadFile(target.id, item.file)
        update(item.id, { status: 'done', progress: 100, asset })
        return asset
      } catch (error) {
        update(item.id, { status: 'failed', progress: 100, error: toMessage(error) })
        return null
      }
    }))
    const ready = results.filter((asset): asset is Asset => asset != null)
    const failed = results.length - ready.length
    const saved = ready.reduce((sum, asset) => sum + (asset.originalBytes - (asset.optimizedBytes ?? asset.originalBytes)), 0)
    if (ready.length) await refresh().catch(() => undefined)
    notify(
      failed
        ? { tone: 'warning', title: `${ready.length} of ${results.length} uploads ready`, description: `${failed} could not be processed. ดูข้อความ error ในรายการไฟล์` }
        : { tone: 'success', title: `${pluralize(ready.length, 'image')} uploaded to ${target.name}`, description: `Saved ${formatBytes(saved)} after compression.` },
    )
  }

  const reset = () => setItems([])

  const acceptList = (project?.settings.allowedFormats ?? ['jpeg', 'png', 'webp']).map((format) => FORMAT_MIME[format]).join(',')

  const footer = complete ? (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          navigate('assets')
          onClose()
        }}
      >
        View in Assets
      </Button>
      <Button variant="secondary" icon={ImagePlus} onClick={reset}>
        Upload more
      </Button>
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </>
  ) : (
    <>
      <span className="dialog__footer-start">
        {items.length ? `${pluralize(queued.length, 'file')} ready · ${items.filter((i) => i.status === 'invalid').length} rejected` : 'Nothing selected yet'}
      </span>
      <Button variant="secondary" onClick={onClose}>
        {running ? 'Cancel remaining' : 'Cancel'}
      </Button>
      <Button variant="primary" icon={Upload} disabled={!project || queued.length === 0 || running} loading={running} onClick={start}>
        {running ? 'Uploading…' : queued.length > 1 ? `Upload ${queued.length} files` : 'Upload file'}
      </Button>
    </>
  )

  return (
    <Dialog
      open
      onClose={onClose}
      title="Upload assets"
      description="Images are validated, compressed to the project’s output limit, and stored on the storage server."
      icon={UploadCloud}
      size="lg"
      dismissible={!running}
      footer={footer}
    >
      <div className="form-stack">
        {activeProjects.length === 0 ? (
          <Alert tone="warning" title="No active projects">
            Create or resume a project before uploading.
          </Alert>
        ) : (
          <Field
            label="Project"
            htmlFor={`${inputId}-project`}
            helper={
              project
                ? `${project.settings.allowedFormats.map((f) => FORMAT_LABEL[f]).join(', ')} · max ${formatBytes(project.settings.maxInputBytes)} input · output ${OUTPUT_SETTING_LABEL[project.settings.outputFormat]} ≤ ${formatBytes(project.settings.maxOutputBytes)}`
                : undefined
            }
          >
            <Select
              id={`${inputId}-project`}
              aria-describedby={`${inputId}-project-helper`}
              value={projectId}
              disabled={running || items.length > 0}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id} disabled={item.status !== 'active'}>
                  {item.name}
                  {item.status !== 'active' ? ` (${item.status})` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {!complete ? (
          <div
            className={`dropzone${dragging ? ' is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              if (!running) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="dropzone__icon" aria-hidden="true">
              <UploadCloud />
            </span>
            <p className="dropzone__title">Drag and drop images here</p>
            <p className="dropzone__hint">
              JPEG, PNG, or WebP · up to {MAX_FILES} files · {project ? `${formatBytes(project.settings.maxInputBytes)} each` : ''}
            </p>
            <div className="dropzone__actions">
              <Button variant="secondary" icon={FileImage} disabled={running || !project} onClick={() => inputRef.current?.click()}>
                Browse files
              </Button>
              <Button variant="ghost" icon={ImagePlus} loading={addingSample} disabled={running || !project} onClick={addSample}>
                Add sample image
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={acceptList}
              hidden
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </div>
        ) : (
          <Alert tone={finished.some((i) => i.status === 'failed') ? 'warning' : 'success'} title="Upload complete">
            {pluralize(finished.filter((i) => i.status === 'done').length, 'file')} stored in {project?.name}. CDN URLs are live immediately.
          </Alert>
        )}

        {items.length ? (
          <ul className="upload-list" aria-label="Files" aria-live="polite">
            {items.map((item) => (
              <UploadRow
                key={item.id}
                item={item}
                project={project}
                canRemove={!running && !complete}
                onRemove={() => setItems((prev) => prev.filter((other) => other.id !== item.id))}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </Dialog>
  )
}

function UploadRow({ item, project, canRemove, onRemove }: { item: UploadItem; project?: Project; canRemove: boolean; onRemove: () => void }) {
  const saved = item.asset ? savedPercent(item.asset.originalBytes, item.asset.optimizedBytes) : null
  const url = item.asset && project ? assetUrl(item.asset, project) : null
  return (
    <li className="upload-item">
      {item.previewUrl && item.status !== 'invalid' ? (
        <img className="upload-item__thumb" src={item.previewUrl} alt="" />
      ) : (
        <span className="upload-item__thumb upload-item__thumb--icon" aria-hidden="true">
          <FileImage />
        </span>
      )}
      <div className="upload-item__main">
        <span className="upload-item__name" title={item.file.name}>
          {item.file.name}
        </span>
        <span className="upload-item__meta">
          {formatBytes(item.file.size)}
          {item.width ? ` · ${item.width} × ${item.height}` : ''}
          {item.format ? ` · ${FORMAT_LABEL[item.format]}` : ''}
          {item.asset?.optimizedBytes != null
            ? ` → ${formatBytes(item.asset.optimizedBytes)} ${FORMAT_LABEL[item.asset.outputFormat]} q${item.asset.quality}`
            : ''}
          {saved != null ? <span className="saved"> · −{formatPercent(saved, 0)}</span> : null}
        </span>
        {item.error ? <span className="upload-item__error">{item.error}</span> : null}
      </div>
      <div className="upload-item__end">
        {item.status === 'checking' ? <Badge icon={LoaderCircle}>Checking</Badge> : null}
        {item.status === 'queued' ? <Badge>Ready to upload</Badge> : null}
        {item.status === 'invalid' ? <Badge tone="danger" icon={CircleAlert}>Rejected</Badge> : null}
        {item.status === 'uploading' ? <Badge tone="info">{item.progress}%</Badge> : null}
        {item.status === 'processing' ? (
          <Badge tone="info" icon={LoaderCircle}>
            Compressing
          </Badge>
        ) : null}
        {item.status === 'done' ? (
          <Badge tone="success" icon={CircleCheck}>
            Ready
          </Badge>
        ) : null}
        {item.status === 'failed' ? (
          <Badge tone="danger" icon={CircleAlert}>
            Failed
          </Badge>
        ) : null}
        {url ? <CopyButton value={url} label="CDN URL" /> : null}
        {canRemove ? <Button variant="ghost" size="sm" iconOnly icon={Trash2} aria-label={`Remove ${item.file.name}`} onClick={onRemove} /> : null}
      </div>
      {item.status === 'uploading' || item.status === 'processing' ? (
        <div className="upload-item__extra">
          <ProgressBar
            label={`Uploading ${item.file.name}`}
            heading={false}
            value={item.progress}
            valueText={item.status === 'processing' ? 'Compressing' : `${item.progress}%`}
            size="sm"
            tone="brand"
          />
        </div>
      ) : null}
    </li>
  )
}
