import { Lock } from 'lucide-react'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DescriptionList } from '../../components/ui/DescriptionList'
import { Drawer, DrawerSection } from '../../components/ui/Drawer'
import { Person } from '../../components/ui/Avatar'
import { AUDIT_ACTION_LABEL } from '../../lib/audit'
import { formatDateTime, formatIsoBangkok } from '../../lib/format'
import type { AuditEntry } from '../../types'

export function AuditDrawer({ entry, onClose }: { entry: AuditEntry | undefined; onClose: () => void }) {
  if (!entry) return null
  const detailEntries = Object.entries(entry.details)
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={`Audit event · ${entry.id}`}
      title={AUDIT_ACTION_LABEL[entry.action]}
      subtitle={
        <>
          <span className="action-code">{entry.action}</span>
          <span>· {formatDateTime(entry.timestamp)} ICT</span>
        </>
      }
    >
      <p className="immutable-note">
        <Lock aria-hidden="true" />
        Read-only. Audit entries are append-only and cannot be edited or deleted.
      </p>

      <DrawerSection title="Summary">
        <DescriptionList
          label="Event summary"
          items={[
            { label: 'Actor', value: <Person name={entry.actor.name} meta={entry.actor.email} system={entry.actor.kind === 'system'} /> },
            { label: 'Resource', value: `${entry.resource.label} (${entry.resource.type.replace('_', ' ')})` },
            { label: 'Resource ID', value: <span className="mono">{entry.resource.id}</span> },
            { label: 'Source IP', value: <span className="mono">{entry.ip}</span> },
            { label: 'User agent', value: <span className="mono">{entry.userAgent}</span> },
            { label: 'Timestamp', value: <span className="mono">{formatIsoBangkok(entry.timestamp)}</span> },
          ]}
        />
      </DrawerSection>

      {entry.changes.length ? (
        <DrawerSection title="Changes">
          <div className="diff" role="table" aria-label="Changed fields">
            {entry.changes.map((change) => (
              <div className="diff__row" role="row" key={change.field}>
                <div className="diff__field" role="rowheader">
                  {change.field}
                </div>
                <div className="diff__values" role="cell">
                  <span className="diff__line diff__line--before">
                    <span className="sr-only">Before: </span>− {change.before ?? 'null'}
                  </span>
                  <span className="diff__line diff__line--after">
                    <span className="sr-only">After: </span>+ {change.after ?? 'null'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      ) : null}

      {detailEntries.length ? (
        <DrawerSection title="Details">
          <CodeBlock
            label="Event details"
            title="details.json"
            samples={[{ id: 'details', label: 'details.json', language: 'json', code: JSON.stringify(entry.details, null, 2) }]}
          />
        </DrawerSection>
      ) : null}

    </Drawer>
  )
}
