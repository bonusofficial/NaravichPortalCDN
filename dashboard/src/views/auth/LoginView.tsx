import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../../components/ui/Logo'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { toMessage } from '../../lib/api'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../state/auth-context'

export function LoginView() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@naravich.local')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [otp, setOtp] = useState('')
  const [requiresOtp, setRequiresOtp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password, otp || undefined)
    } catch (reason) {
      if (reason instanceof ApiError && (reason.code === 'MFA_REQUIRED' || reason.code === 'MFA_INVALID')) {
        setRequiresOtp(true)
      }
      setError(toMessage(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Logo variant="color" height={64} />
        <div className="login-card__heading">
          <span className="login-card__icon" aria-hidden="true"><LockKeyhole /></span>
          <div>
            <h1 id="login-title">CDN Manager</h1>
            <p>เข้าสู่ระบบเพื่อจัดการโปรเจกต์ รูปภาพ และ API keys</p>
          </div>
        </div>
        {error ? <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ">{error}</Alert> : null}
        <form className="form-stack" onSubmit={submit}>
          <Field label="อีเมล" htmlFor="login-email">
            <TextInput id="login-email" type="email" value={email} autoComplete="username" autoFocus onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="รหัสผ่าน" htmlFor="login-password">
            <TextInput id="login-password" type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {requiresOtp ? (
            <Field label="รหัสยืนยัน 6 หลัก" htmlFor="login-otp">
              <TextInput id="login-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} autoFocus onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </Field>
          ) : null}
          <Button type="submit" variant="primary" loading={submitting} disabled={!email.trim() || !password}>
            เข้าสู่ระบบ
          </Button>
        </form>
        <p className="login-card__endpoint">API: <code>localhost:3000/api/v1</code></p>
      </section>
    </main>
  )
}
