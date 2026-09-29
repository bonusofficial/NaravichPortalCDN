import { Ban } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, Select, SuffixInput, Switch, Textarea } from '../../components/ui/Field'
import { fieldA11y } from '../../lib/a11y'
import { useStore } from '../../state/store-context'
import { useToast } from '../../state/toast-context'
import { parseAllowlist } from '../api-keys/keyValidation'
import { DangerRow, DangerZone, SettingsForm, SettingsSection } from './SettingsLayout'
import { useSettingsDraft } from './useSettingsDraft'

export function SecurityTab() {
  const { draft, set, dirty, changedCount, save, discard } = useSettingsDraft('security')
  const { apiKeys, users, revokeApiKey } = useStore()
  const { notify } = useToast()
  const id = useId()
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const allowlist = parseAllowlist(draft.dashboardAllowlist)
  const errors: Record<string, string> = {}
  if (!Number.isInteger(draft.defaultRateLimit) || draft.defaultRateLimit < 1 || draft.defaultRateLimit > 1000)
    errors.defaultRateLimit = 'Whole number between 1 and 1,000.'
  if (allowlist.invalid.length) errors.dashboardAllowlist = `Invalid entries: ${allowlist.invalid.slice(0, 3).join(', ')}`

  const activeKeys = apiKeys.filter((key) => key.status === 'active')
  const withoutMfa = users.filter((user) => user.status === 'active' && !user.mfaEnabled).length

  return (
    <>
      <SettingsForm
        label="Security settings"
        dirty={dirty}
        changedCount={changedCount}
        errorCount={Object.keys(errors).length}
        onDiscard={discard}
        onSave={() => {
          const count = save()
          notify({ title: 'Security settings saved', description: `${count} ${count === 1 ? 'change' : 'changes'} recorded in the audit log.` })
        }}
      >
        <SettingsSection title="Staff sign-in" description="Applies to everyone who signs in to the CDN Manager.">
          <Switch
            id={`${id}-mfa`}
            label="Require multi-factor authentication"
            description={
              withoutMfa
                ? `${withoutMfa} active ${withoutMfa === 1 ? 'user has' : 'users have'} not enabled MFA yet and will be prompted at next sign-in.`
                : 'All active users have MFA enabled.'
            }
            checked={draft.requireMfa}
            onChange={(value) => set('requireMfa', value)}
          />
          <Field label="Session timeout" htmlFor={`${id}-timeout`} helper="Idle sessions are signed out after this period.">
            <Select
              id={`${id}-timeout`}
              aria-describedby={`${id}-timeout-helper`}
              value={draft.sessionTimeoutMinutes}
              onChange={(event) => set('sessionTimeoutMinutes', Number(event.target.value))}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
            </Select>
          </Field>
          <Field
            label="Console IP allowlist"
            htmlFor={`${id}-dashboardAllowlist`}
            optional
            error={errors.dashboardAllowlist}
            helper="Only these networks can open the console. One IPv4/IPv6 or CIDR per line; empty allows any."
          >
            <Textarea
              {...fieldA11y(`${id}-dashboardAllowlist`, errors.dashboardAllowlist)}
              mono
              rows={3}
              value={draft.dashboardAllowlist}
              spellCheck={false}
              onChange={(event) => set('dashboardAllowlist', event.target.value)}
            />
          </Field>
        </SettingsSection>

        <SettingsSection title="API key defaults" description="Pre-filled when staff create a key. Existing keys are unchanged.">
          <Field label="Default expiry" htmlFor={`${id}-expiry`}>
            <Select id={`${id}-expiry`} value={draft.defaultKeyExpiryDays} onChange={(event) => set('defaultKeyExpiryDays', Number(event.target.value))}>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </Select>
          </Field>
          <Field label="Default rate limit" htmlFor={`${id}-defaultRateLimit`} error={errors.defaultRateLimit} helper="Requests per minute per key.">
            <SuffixInput
              {...fieldA11y(`${id}-defaultRateLimit`, errors.defaultRateLimit)}
              suffix="/min"
              type="number"
              inputMode="numeric"
              value={Number.isNaN(draft.defaultRateLimit) ? '' : draft.defaultRateLimit}
              onChange={(event) => set('defaultRateLimit', event.target.value === '' ? Number.NaN : Number(event.target.value))}
            />
          </Field>
        </SettingsSection>
      </SettingsForm>

      <DangerZone>
        <DangerRow
          title="Revoke all API keys"
          description={`Immediately invalidates ${activeKeys.length} active ${activeKeys.length === 1 ? 'key' : 'keys'} across all projects. Use only if keys may be compromised — every website will fail uploads with 401 until it gets a new key.`}
          action={
            <Button variant="danger-outline" icon={Ban} disabled={activeKeys.length === 0} onClick={() => setConfirmRevoke(true)}>
              Revoke all keys…
            </Button>
          }
        />
      </DangerZone>

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title={`Revoke ${activeKeys.length} API keys?`}
        description="All website backends will immediately lose upload access. Each revocation is recorded in the audit log. This cannot be undone."
        confirmLabel="Revoke all keys"
        icon={Ban}
        confirmText="revoke all keys"
        onConfirm={() => {
          activeKeys.forEach((key) => revokeApiKey(key.id))
          setConfirmRevoke(false)
          notify({ tone: 'warning', title: 'All API keys revoked', description: `${activeKeys.length} keys can no longer upload.` })
        }}
      />
    </>
  )
}
