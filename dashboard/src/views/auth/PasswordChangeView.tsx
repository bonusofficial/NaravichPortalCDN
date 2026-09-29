import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { Alert } from '../../components/ui/States'
import { toMessage } from '../../lib/api'
import { useAuth } from '../../state/auth-context'

export function PasswordChangeView() {
  const { changePassword, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword !== confirm) return setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน')
    setSubmitting(true)
    setError(null)
    try {
      await changePassword(currentPassword, newPassword)
    } catch (reason) {
      setError(toMessage(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="password-title">
        <Logo variant="color" height={64} />
        <div className="login-card__heading">
          <span className="login-card__icon" aria-hidden="true"><LockKeyhole /></span>
          <div><h1 id="password-title">ตั้งรหัสผ่านใหม่</h1><p>บัญชีนี้ต้องเปลี่ยนรหัสผ่านชั่วคราวก่อนใช้งาน Dashboard</p></div>
        </div>
        {error ? <Alert tone="danger" title="เปลี่ยนรหัสผ่านไม่สำเร็จ">{error}</Alert> : null}
        <form className="form-stack" onSubmit={submit}>
          <Field label="รหัสผ่านปัจจุบัน" htmlFor="current-password"><TextInput id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
          <Field label="รหัสผ่านใหม่" htmlFor="new-password" helper="อย่างน้อย 10 ตัวอักษร"><TextInput id="new-password" type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
          <Field label="ยืนยันรหัสผ่านใหม่" htmlFor="confirm-password"><TextInput id="confirm-password" type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field>
          <Button type="submit" variant="primary" loading={submitting} disabled={!currentPassword || newPassword.length < 10 || confirm.length < 10}>บันทึกรหัสผ่านใหม่</Button>
          <Button type="button" variant="link" onClick={logout}>ออกจากระบบ</Button>
        </form>
      </section>
    </main>
  )
}
