import { Download, KeyRound } from 'lucide-react'
import { Tag } from '../../components/ui/Badge'
import { CopyButton } from '../../components/ui/CopyField'
import { Button } from '../../components/ui/Button'
import { Check } from '../../components/ui/Field'
import { Alert } from '../../components/ui/States'
import { downloadText } from '../../lib/download'
import { formatDate } from '../../lib/format'
import { shortKeyLabel } from '../../lib/pipeline'
import { useToast } from '../../state/toast-context'
import type { ApiKey, Project } from '../../types'
import { envFileFor } from './envFile'

interface KeyRevealProps {
  apiKey: ApiKey
  secret: string
  project: Project | undefined
  createdBy: string
  acknowledged: boolean
  onAcknowledgedChange: (value: boolean) => void
}

/** One-time display of a new secret on a dark code surface. */
export function KeyReveal({ apiKey, secret, project, createdBy, acknowledged, onAcknowledgedChange }: KeyRevealProps) {
  const { notify } = useToast()
  return (
    <div className="key-reveal">
      <Alert tone="warning" title="Copy this key now — it will not be shown again" role="alert">
        The server stores only a hash of the key. If it is lost, rotate the key to get a new one.
      </Alert>

      <div className="secret">
        <span className="secret__label">
          <KeyRound aria-hidden="true" />
          Secret key · {project?.name ?? 'Project'}
        </span>
        <code className="secret__value" aria-label="API key secret">
          {secret}
        </code>
        <div className="secret__actions">
          <CopyButton value={secret} label="API key" variant="secondary" showText toast />
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={() => {
              downloadText(envFileFor(apiKey, secret, project, createdBy), `naravich-cdn-${project?.slug ?? 'project'}.env`)
              notify({ title: '.env file downloaded', description: 'Move it to the server and keep it out of version control.' })
            }}
          >
            Download .env
          </Button>
        </div>
      </div>

      <dl className="key-meta">
        <div>
          <dt>Prefix</dt>
          <dd className="mono">{shortKeyLabel(apiKey.environment, apiKey.last4)}</dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>{project?.name}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Never'}</dd>
        </div>
        <div>
          <dt>Scopes</dt>
          <dd className="tag-list">
            {apiKey.scopes.map((scope) => (
              <Tag key={scope}>{scope}</Tag>
            ))}
          </dd>
        </div>
        <div>
          <dt>Rate limit</dt>
          <dd>{apiKey.rateLimitPerMin} requests/min</dd>
        </div>
        <div>
          <dt>IP allowlist</dt>
          <dd>{apiKey.ipAllowlist.length ? apiKey.ipAllowlist.join(', ') : 'Any IP'}</dd>
        </div>
      </dl>

      <Check
        label="I have stored this key in a secure location"
        description="For example in the website server’s environment variables or secrets manager."
        checked={acknowledged}
        onChange={(event) => onAcknowledgedChange(event.target.checked)}
      />
    </div>
  )
}
