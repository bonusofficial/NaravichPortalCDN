import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export function SettingsSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="settings-section" aria-label={title}>
      <div>
        <h3 className="settings-section__title">{title}</h3>
        {description ? <p className="settings-section__description">{description}</p> : null}
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  )
}

interface SettingsFormProps {
  label: string
  dirty: boolean
  changedCount: number
  errorCount: number
  onSave: () => void
  onDiscard: () => void
  children: ReactNode
}

/** A card of settings sections with a sticky save/discard footer. */
export function SettingsForm({ label, dirty, changedCount, errorCount, onSave, onDiscard, children }: SettingsFormProps) {
  return (
    <Card as="div">
      <form
        aria-label={label}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (dirty && errorCount === 0) onSave()
        }}
      >
        {children}
        <div className="settings-footer">
          <span className="settings-footer__status" aria-live="polite">
            {errorCount > 0
              ? `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} before saving`
              : dirty
                ? `${changedCount} unsaved ${changedCount === 1 ? 'change' : 'changes'}`
                : 'All changes saved'}
          </span>
          <Button variant="secondary" onClick={onDiscard} disabled={!dirty}>
            Discard
          </Button>
          <Button type="submit" variant="primary" disabled={!dirty || errorCount > 0}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function DangerZone({ children }: { children: ReactNode }) {
  return (
    <section className="card danger-zone" aria-label="Danger zone">
      <h3 className="danger-zone__header">
        <TriangleAlert aria-hidden="true" />
        Danger zone
      </h3>
      {children}
    </section>
  )
}

export function DangerRow({ title, description, action }: { title: string; description: ReactNode; action: ReactNode }) {
  return (
    <div className="danger-row">
      <div>
        <p className="danger-row__title">{title}</p>
        <p className="danger-row__description">{description}</p>
      </div>
      {action}
    </div>
  )
}
