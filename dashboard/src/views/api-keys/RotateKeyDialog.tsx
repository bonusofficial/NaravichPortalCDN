import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Select } from '../../components/ui/Field'
import { shortKeyLabel } from '../../lib/pipeline'
import { toMessage } from '../../lib/api'
import { useStore, type CreatedKey } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { ApiKey } from '../../types'
import { KeyReveal } from './KeyReveal'

const GRACE_OPTIONS = [
  { value: '0', label: 'Revoke the current key immediately' },
  { value: '1', label: 'Keep it working for 1 hour' },
  { value: '24', label: 'Keep it working for 24 hours' },
  { value: '168', label: 'Keep it working for 7 days' },
]

export function RotateKeyDialog({ apiKey, onClose }: { apiKey: ApiKey | null; onClose: () => void }) {
  if (!apiKey) return null
  return <RotateFlow apiKey={apiKey} onClose={onClose} />
}

function RotateFlow({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const { projects, currentUser, rotateApiKey } = useStore()
  const { notify } = useToast()
  const id = useId()
  const [grace, setGrace] = useState('24')
  const [created, setCreated] = useState<CreatedKey | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [saving, setSaving] = useState(false)
  const project = projects.find((item) => item.id === apiKey.projectId)

  if (created) {
    const requestClose = () => (acknowledged ? onClose() : setConfirmClose(true))
    return (
      <>
        <Dialog
          open
          onClose={requestClose}
          dismissible={false}
          title="Key rotated"
          description={
            grace === '0'
              ? `The previous secret ${shortKeyLabel(apiKey.environment, apiKey.last4)} was revoked.`
              : `The previous secret keeps working for ${GRACE_OPTIONS.find((o) => o.value === grace)?.label.replace('Keep it working for ', '')}. Deploy the new value before then.`
          }
          icon={RefreshCw}
          size="lg"
          footer={
            <Button
              variant="primary"
              disabled={!acknowledged}
              onClick={() => {
                notify({ title: 'Rotation complete', description: `New prefix ${shortKeyLabel(created.key.environment, created.key.last4)}.` })
                onClose()
              }}
            >
              Done
            </Button>
          }
        >
          <KeyReveal
            apiKey={created.key}
            secret={created.secret}
            project={project}
            createdBy={currentUser.name}
            acknowledged={acknowledged}
            onAcknowledgedChange={setAcknowledged}
          />
        </Dialog>
        <ConfirmDialog
          open={confirmClose}
          onClose={() => setConfirmClose(false)}
          title="Close without confirming?"
          description="The new secret cannot be displayed again. If you haven’t stored it, you will need to rotate again."
          confirmLabel="Close anyway"
          tone="warning"
          icon={TriangleAlert}
          onConfirm={() => {
            setConfirmClose(false)
            onClose()
          }}
        />
      </>
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Rotate “${apiKey.name}”?`}
      description="A new secret is generated with the same project, scopes, rate limit, and IP allowlist."
      icon={RefreshCw}
      iconTone="warning"
      size="md"
      onSubmit={async () => {
        setSaving(true)
        try {
          const result = await rotateApiKey(apiKey.id, Number(grace))
          if (result) setCreated(result)
        } catch (error) {
          notify({ tone: 'error', title: 'Could not rotate key', description: toMessage(error) })
        } finally {
          setSaving(false)
        }
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={RefreshCw} loading={saving}>
            Rotate key
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Current key" htmlFor={`${id}-current`}>
          <p id={`${id}-current`} className="url-preview">
            {shortKeyLabel(apiKey.environment, apiKey.last4)} · {project?.name}
          </p>
        </Field>
        <Field
          label="After rotation"
          htmlFor={`${id}-grace`}
          helper="A grace period lets the website keep uploading while you deploy the new secret."
        >
          <Select id={`${id}-grace`} aria-describedby={`${id}-grace-helper`} value={grace} onChange={(event) => setGrace(event.target.value)} data-autofocus>
            {GRACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}
