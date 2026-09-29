import { useId } from 'react'
import { Field, Select, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { fieldA11y } from '../../lib/a11y'
import { useToast } from '../../state/toast-context'
import { SettingsForm, SettingsSection } from './SettingsLayout'
import { useSettingsDraft } from './useSettingsDraft'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function GeneralTab() {
  const { draft, set, dirty, changedCount, save, discard } = useSettingsDraft('general')
  const { notify } = useToast()
  const id = useId()

  const errors: Record<string, string> = {}
  if (draft.workspaceName.trim().length < 3) errors.workspaceName = 'Enter at least 3 characters.'
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(draft.publicBaseUrl) || draft.publicBaseUrl.endsWith('/'))
    errors.publicBaseUrl = 'Use an https:// URL without a trailing slash.'
  if (!EMAIL.test(draft.supportEmail)) errors.supportEmail = 'Enter a valid email address.'

  return (
    <SettingsForm
      label="General settings"
      dirty={dirty}
      changedCount={changedCount}
      errorCount={Object.keys(errors).length}
      onDiscard={discard}
      onSave={() => {
        const count = save()
        notify({ title: 'General settings saved', description: `${count} ${count === 1 ? 'change' : 'changes'} recorded in the audit log.` })
      }}
    >
      <SettingsSection title="Workspace" description="How this server identifies itself to staff and in notifications.">
        <Field label="Workspace name" htmlFor={`${id}-workspaceName`} error={errors.workspaceName}>
          <TextInput {...fieldA11y(`${id}-workspaceName`, errors.workspaceName, false)} value={draft.workspaceName} onChange={(event) => set('workspaceName', event.target.value)} />
        </Field>
        <Field label="Support contact" htmlFor={`${id}-supportEmail`} error={errors.supportEmail} helper="Shown in API error responses and alert emails.">
          <TextInput {...fieldA11y(`${id}-supportEmail`, errors.supportEmail)} type="email" value={draft.supportEmail} onChange={(event) => set('supportEmail', event.target.value)} />
        </Field>
        <Field label="Time zone" htmlFor={`${id}-tz`} helper="Used for dates in the console, logs, and backup schedules.">
          <Select id={`${id}-tz`} aria-describedby={`${id}-tz-helper`} value={draft.timeZone} onChange={(event) => set('timeZone', event.target.value)}>
            <option value="Asia/Bangkok">Asia/Bangkok (ICT, UTC+07:00)</option>
            <option value="Asia/Singapore">Asia/Singapore (UTC+08:00)</option>
            <option value="UTC">UTC</option>
          </Select>
        </Field>
      </SettingsSection>
      <SettingsSection
        title="Delivery"
        description="Public URLs are built from this base, the project slug, and the object path."
      >
        <Field
          label="Public base URL"
          htmlFor={`${id}-publicBaseUrl`}
          error={errors.publicBaseUrl}
          helper={`Example: ${draft.publicBaseUrl}/website-a/2026/09/019c1234.webp`}
        >
          <TextInput {...fieldA11y(`${id}-publicBaseUrl`, errors.publicBaseUrl)} mono value={draft.publicBaseUrl} spellCheck={false} onChange={(event) => set('publicBaseUrl', event.target.value.trim())} />
        </Field>
        <Field label="Missing object response" htmlFor={`${id}-404`} helper="What the server returns for a URL that doesn’t exist or was deleted.">
          <Select id={`${id}-404`} aria-describedby={`${id}-404-helper`} value={draft.notFoundResponse} onChange={(event) => set('notFoundResponse', event.target.value as 'empty' | 'branded')}>
            <option value="empty">Empty 404 (recommended for image URLs)</option>
            <option value="branded">Branded 404 page</option>
          </Select>
        </Field>
        {draft.notFoundResponse === 'branded' ? (
          <div className="threshold-preview" aria-label="Branded 404 preview">
            <Logo variant="black" height={30} />
            <p style={{ fontWeight: 500 }}>This image is no longer available</p>
            <p className="muted" style={{ fontSize: 13 }}>
              404 · {draft.publicBaseUrl.replace('https://', '')} · contact {draft.supportEmail}
            </p>
          </div>
        ) : null}
      </SettingsSection>
    </SettingsForm>
  )
}
