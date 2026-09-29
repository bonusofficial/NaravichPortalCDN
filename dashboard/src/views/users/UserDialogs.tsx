import { UserCog, UserPlus } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Check, Field, TextInput } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { fieldA11y } from '../../lib/a11y'
import { toMessage } from '../../lib/api'
import { ROLE_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import type { StaffRole, StaffUser } from '../../types'

const ROLES: StaffRole[] = ['admin', 'operator', 'viewer']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function RoleChoices({ name, value, onChange }: { name: string; value: StaffRole; onChange: (role: StaffRole) => void }) {
  return (
    <div className="choice-list">
      {ROLES.map((role) => (
        <Check
          key={role}
          type="radio"
          name={name}
          label={ROLE_META[role].label}
          description={ROLE_META[role].description}
          checked={value === role}
          onChange={() => onChange(role)}
        />
      ))}
    </div>
  )
}

export function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <InviteForm onClose={onClose} />
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const { users, settings, inviteUser } = useStore()
  const { notify } = useToast()
  const id = useId()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<StaffRole>('viewer')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const trimmed = email.trim().toLowerCase()
  let error: string | null = null
  if (!EMAIL.test(trimmed)) error = 'Enter a valid work email address.'
  else if (users.some((user) => user.email.toLowerCase() === trimmed)) error = 'This person already has access or a pending invite.'
  const passwordError = password.length < 10 ? 'Use at least 10 characters.' : null
  const shown = submitted ? error : null

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create staff user"
      description="Create a dashboard account and share the temporary password securely."
      icon={UserPlus}
      onSubmit={async () => {
        setSubmitted(true)
        if (error || passwordError) {
          document.getElementById(`${id}-${error ? 'email' : 'password'}`)?.focus()
          return
        }
        setSaving(true)
        try {
          const user = await inviteUser({ email: trimmed, name: name.trim() || trimmed.split('@')[0], role, password })
          notify({ title: 'User created', description: `${user.email} can now sign in as ${ROLE_META[role].label}.` })
          onClose()
        } catch (reason) {
          notify({ tone: 'error', title: 'Could not create user', description: toMessage(reason) })
        } finally {
          setSaving(false)
        }
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={UserPlus} loading={saving}>
            Create user
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Work email" htmlFor={`${id}-email`} error={shown} helper="Use the person’s company address.">
          <TextInput
            {...fieldA11y(`${id}-email`, shown)}
            type="email"
            value={email}
            autoComplete="off"
            placeholder="name@example.com"
            data-autofocus
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Full name" htmlFor={`${id}-name`} optional>
          <TextInput id={`${id}-name`} value={name} placeholder="e.g. Kanya Suksawat" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Temporary password" htmlFor={`${id}-password`} error={submitted ? passwordError : null} helper="Share this over a secure channel and ask the user to change it.">
          <TextInput
            {...fieldA11y(`${id}-password`, submitted ? passwordError : null)}
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <fieldset className="field">
          <legend className="field__label">Role</legend>
          <RoleChoices name={`${id}-role`} value={role} onChange={setRole} />
        </fieldset>
        {settings.security.requireMfa ? (
          <Alert tone="info" title="MFA required">
            Workspace policy requires multi-factor authentication. The user will set it up on first sign-in.
          </Alert>
        ) : null}
      </div>
    </Dialog>
  )
}

export function EditRoleDialog({ user, onClose, lastAdmin }: { user: StaffUser | null; onClose: () => void; lastAdmin: boolean }) {
  if (!user) return null
  return <EditRoleForm user={user} onClose={onClose} lastAdmin={lastAdmin} />
}

function EditRoleForm({ user, onClose, lastAdmin }: { user: StaffUser; onClose: () => void; lastAdmin: boolean }) {
  const { updateUserRole } = useStore()
  const { notify } = useToast()
  const id = useId()
  const [role, setRole] = useState<StaffRole>(user.role)
  const blocked = lastAdmin && user.role === 'admin' && role !== 'admin'
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Change role for ${user.name}`}
      description={user.email}
      icon={UserCog}
      onSubmit={async () => {
        if (blocked || role === user.role) return
        try {
          await updateUserRole(user.id, role)
          notify({ title: 'Role updated', description: `${user.name} is now ${ROLE_META[role].label}.` })
          onClose()
        } catch (reason) {
          notify({ tone: 'error', title: 'Could not update role', description: toMessage(reason) })
        }
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={blocked || role === user.role}>
            Save role
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <fieldset className="field">
          <legend className="field__label">Role</legend>
          <RoleChoices name={`${id}-role`} value={role} onChange={setRole} />
        </fieldset>
        {blocked ? (
          <Alert tone="warning" title="At least one admin is required">
            Promote another user to Admin before changing this role.
          </Alert>
        ) : null}
      </div>
    </Dialog>
  )
}
