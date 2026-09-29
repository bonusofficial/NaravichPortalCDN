import { KeyRound, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Dialog } from '../../components/ui/Dialog'
import { Check, Field, Select, SuffixInput, TextInput, Textarea } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { fieldA11y } from '../../lib/a11y'
import { DAY, mockNow } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import { toMessage } from '../../lib/api'
import { useStore, type CreatedKey } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { ApiKeyScope, KeyEnvironment } from '../../types'
import { KeyReveal } from './KeyReveal'
import { parseAllowlist } from './keyValidation'

const SCOPES: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: 'assets:write', label: 'assets:write', description: 'Upload images. Required for website backends.' },
]

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'No expiration (not recommended)' },
]

interface CreateKeyDialogProps {
  open: boolean
  onClose: () => void
  defaultProjectId?: string
}

export function CreateKeyDialog(props: CreateKeyDialogProps) {
  if (!props.open) return null
  return <CreateKeyFlow {...props} />
}

function CreateKeyFlow({ onClose, defaultProjectId }: CreateKeyDialogProps) {
  const { projects, apiKeys, settings, currentUser, createApiKey } = useStore()
  const { notify } = useToast()
  const id = useId()
  const activeProjects = projects.filter((project) => project.status === 'active')
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState(
    activeProjects.find((project) => project.id === defaultProjectId)?.id ?? activeProjects[0]?.id ?? '',
  )
  const [environment, setEnvironment] = useState<KeyEnvironment>('live')
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['assets:write'])
  const [expiry, setExpiry] = useState(String(settings.security.defaultKeyExpiryDays))
  const [rateLimit, setRateLimit] = useState(String(settings.security.defaultRateLimit))
  const [allowlist, setAllowlist] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [created, setCreated] = useState<CreatedKey | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [saving, setSaving] = useState(false)

  const project = projects.find((item) => item.id === projectId)
  const allow = parseAllowlist(allowlist)
  const errors: Record<string, string> = {}
  if (name.trim().length < 3) errors.name = 'Enter a descriptive name of at least 3 characters.'
  else if (apiKeys.some((key) => key.projectId === projectId && key.status === 'active' && key.name.toLowerCase() === name.trim().toLowerCase()))
    errors.name = 'An active key with this name already exists for the project.'
  if (!projectId) errors.project = 'Choose an active project.'
  if (scopes.length === 0) errors.scopes = 'Select at least one scope.'
  const limit = Number(rateLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) errors.rateLimit = 'Enter a whole number between 1 and 1,000.'
  if (allow.invalid.length) errors.allowlist = `Not a valid IPv4/IPv6 address or CIDR: ${allow.invalid.slice(0, 3).join(', ')}`
  const shown = submitted ? errors : {}
  const expiresAt = expiry === 'never' ? null : mockNow() + Number(expiry) * DAY

  const submit = async () => {
    setSubmitted(true)
    const first = Object.keys(errors)[0]
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus()
      return
    }
    setSaving(true)
    try {
      const result = await createApiKey({
        name: name.trim(),
        projectId,
        environment,
        scopes,
        expiresInDays: expiry === 'never' ? null : Number(expiry),
        rateLimitPerMin: limit,
        ipAllowlist: allow.valid,
      })
      setCreated(result)
    } catch (error) {
      notify({ tone: 'error', title: 'Could not create API key', description: toMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const requestClose = () => {
    if (created && !acknowledged) setConfirmClose(true)
    else onClose()
  }

  if (created) {
    return (
      <>
        <Dialog
          open
          onClose={requestClose}
          dismissible={false}
          title="API key created"
          description={`“${created.key.name}” can now upload to ${project?.name ?? 'the project'}.`}
          icon={KeyRound}
          size="lg"
          footer={
            <Button
              variant="primary"
              disabled={!acknowledged}
              onClick={() => {
                notify({ title: 'API key ready', description: `${created.key.name} is active.` })
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
          description="This key cannot be displayed again. If you haven’t stored it, you will need to rotate it to get a new secret."
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
      title="Create API key"
      description="Keys authenticate uploads from one project’s website backend."
      icon={KeyRound}
      size="lg"
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={activeProjects.length === 0} loading={saving}>
            Create key
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Key name" htmlFor={`${id}-name`} error={shown.name} helper="Describe where it is used, e.g. “Production web server”.">
          <TextInput
            {...fieldA11y(`${id}-name`, shown.name)}
            value={name}
            placeholder="Production web server"
            autoComplete="off"
            data-autofocus
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Project" htmlFor={`${id}-project`} error={shown.project} helper="Keys can only upload to this project.">
          <Select {...fieldA11y(`${id}-project`, shown.project)} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((item) => (
              <option key={item.id} value={item.id} disabled={item.status !== 'active'}>
                {item.name}
                {item.status !== 'active' ? ` (${item.status})` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="field span-2">
          <legend className="field__label">Environment</legend>
          <div className="choice-inline">
            <Check
              type="radio"
              name={`${id}-env`}
              label="Live"
              description={<span className="mono">ncdn_live_…</span>}
              checked={environment === 'live'}
              onChange={() => setEnvironment('live')}
            />
            <Check
              type="radio"
              name={`${id}-env`}
              label="Test"
              description={<span className="mono">ncdn_test_…</span>}
              checked={environment === 'test'}
              onChange={() => setEnvironment('test')}
            />
          </div>
        </fieldset>

        <fieldset className="field span-2" aria-describedby={shown.scopes ? `${id}-scopes-error` : undefined}>
          <legend className="field__label">Scopes</legend>
          <div className="choice-list" id={`${id}-scopes`} tabIndex={-1}>
            {SCOPES.map((scope) => (
              <Check
                key={scope.value}
                label={<span className="mono">{scope.label}</span>}
                description={scope.description}
                checked={scopes.includes(scope.value)}
                onChange={(event) =>
                  setScopes((prev) => (event.target.checked ? [...prev, scope.value] : prev.filter((value) => value !== scope.value)))
                }
              />
            ))}
          </div>
          {shown.scopes ? (
            <p className="field__error" id={`${id}-scopes-error`} role="alert">
              {shown.scopes}
            </p>
          ) : null}
        </fieldset>

        <Field
          label="Expiration"
          htmlFor={`${id}-expiry`}
          helper={expiresAt ? `Expires ${formatDate(expiresAt)}. You’ll be notified 14 days before.` : 'The key stays valid until revoked.'}
        >
          <Select id={`${id}-expiry`} aria-describedby={`${id}-expiry-helper`} value={expiry} onChange={(event) => setExpiry(event.target.value)}>
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rate limit" htmlFor={`${id}-rateLimit`} error={shown.rateLimit} helper="Requests per minute before 429 responses.">
          <SuffixInput
            {...fieldA11y(`${id}-rateLimit`, shown.rateLimit)}
            suffix="/min"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={rateLimit}
            onChange={(event) => setRateLimit(event.target.value)}
          />
        </Field>
        <Field
          label="IP allowlist"
          htmlFor={`${id}-allowlist`}
          optional
          error={shown.allowlist}
          helper="One IPv4, IPv6, or CIDR per line. Leave empty to allow any IP (not recommended for live keys)."
          className="span-2"
        >
          <Textarea
            {...fieldA11y(`${id}-allowlist`, shown.allowlist)}
            mono
            rows={3}
            value={allowlist}
            placeholder={'203.0.113.24\n198.51.100.0/28'}
            spellCheck={false}
            onChange={(event) => setAllowlist(event.target.value)}
          />
        </Field>
        {expiry === 'never' || (environment === 'live' && allow.valid.length === 0) ? (
          <div className="span-2">
            <Alert tone="warning" title="Consider tightening this key">
              {expiry === 'never' ? 'Keys without an expiry are easy to forget. ' : ''}
              {environment === 'live' && allow.valid.length === 0 ? 'Without an IP allowlist, a leaked key works from anywhere.' : ''}
            </Alert>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
