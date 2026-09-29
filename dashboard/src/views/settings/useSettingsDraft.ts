import { useState } from 'react'
import { useStore } from '../../state/store-context'
import type { AppSettings, AuditChange, SettingsSection } from '../../types'

function snake(key: string) {
  return key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
}

function display(value: unknown): string {
  if (typeof value === 'string') return value.includes('\n') ? value.split('\n').filter(Boolean).join(', ') : value
  return String(value)
}

/** Local editable copy of one settings section with dirty tracking and audited save. */
export function useSettingsDraft<S extends SettingsSection>(section: S) {
  const { settings, updateSettings } = useStore()
  const saved = settings[section]
  const [draft, setDraft] = useState<AppSettings[S]>(saved)

  const savedRecord = saved as unknown as Record<string, unknown>
  const draftRecord = draft as unknown as Record<string, unknown>
  const changedKeys = Object.keys(draftRecord).filter((key) => draftRecord[key] !== savedRecord[key])

  const set = <K extends keyof AppSettings[S]>(key: K, value: AppSettings[S][K]) => setDraft((prev) => ({ ...prev, [key]: value }))

  const save = () => {
    const changes: AuditChange[] = changedKeys.map((key) => ({
      field: snake(key),
      before: display(savedRecord[key]),
      after: display(draftRecord[key]),
    }))
    updateSettings(section, draft, changes)
    return changes.length
  }

  return {
    draft,
    set,
    dirty: changedKeys.length > 0,
    changedCount: changedKeys.length,
    save,
    discard: () => setDraft(saved),
  }
}
