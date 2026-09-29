import { KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CopyField } from '../../components/ui/CopyField'
import { Field, TextInput } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { toMessage } from '../../lib/api'
import { useAuth } from '../../state/auth-context'
import { useToast } from '../../state/toast-context'
import { SettingsSection } from './SettingsLayout'

export function AccountSecurityCard() {
  const { user, changePassword, setupMfa, enableMfa, disableMfa } = useAuth()
  const { notify } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const change = async () => {
    if (newPassword !== confirmPassword) {
      notify({ tone: 'error', title: 'Passwords do not match' })
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      notify({ title: 'Password changed' })
    } catch (error) {
      notify({ tone: 'error', title: 'Could not change password', description: toMessage(error) })
    } finally { setBusy(false) }
  }

  const beginMfa = async () => {
    setBusy(true)
    try { setSetup(await setupMfa()) }
    catch (error) { notify({ tone: 'error', title: 'Could not start MFA setup', description: toMessage(error) }) }
    finally { setBusy(false) }
  }

  const submitCode = async () => {
    setBusy(true)
    try {
      if (user.mfaEnabled) await disableMfa(code)
      else await enableMfa(code)
      setCode(''); setSetup(null)
      notify({ title: user.mfaEnabled ? 'MFA disabled' : 'MFA enabled' })
    } catch (error) { notify({ tone: 'error', title: 'MFA update failed', description: toMessage(error) }) }
    finally { setBusy(false) }
  }

  return (
    <Card as="div">
      <SettingsSection title="Your account security" description="Password and authenticator settings for the signed-in account.">
        <div className="form-grid">
          <Field label="Current password" htmlFor="account-current"><TextInput id="account-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
          <Field label="New password" htmlFor="account-new" helper="At least 10 characters"><TextInput id="account-new" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
          <Field label="Confirm new password" htmlFor="account-confirm"><TextInput id="account-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field>
        </div>
        <Button variant="secondary" icon={KeyRound} loading={busy} disabled={!currentPassword || newPassword.length < 10 || confirmPassword.length < 10} onClick={() => void change()}>Change password</Button>

        <div className="settings-divider" />
        {user.mfaEnabled ? <Alert tone="success" icon={ShieldCheck} title="Authenticator MFA is enabled">Enter a current code below to disable it.</Alert> : <Alert tone="neutral" title="Authenticator MFA is not enabled">Use any TOTP-compatible authenticator app.</Alert>}
        {!user.mfaEnabled && !setup ? <Button variant="secondary" icon={ShieldCheck} loading={busy} onClick={() => void beginMfa()}>Set up MFA</Button> : null}
        {setup ? <><CopyField label="Manual setup secret" value={setup.secret} /><CopyField label="Authenticator URI" value={setup.otpauthUrl} truncate /></> : null}
        {(user.mfaEnabled || setup) ? <div className="form-grid"><Field label="6-digit authenticator code" htmlFor="account-otp"><TextInput id="account-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></Field><Button variant={user.mfaEnabled ? 'danger-outline' : 'primary'} loading={busy} disabled={code.length !== 6} onClick={() => void submitCode()}>{user.mfaEnabled ? 'Disable MFA' : 'Verify and enable MFA'}</Button></div> : null}
      </SettingsSection>
    </Card>
  )
}
