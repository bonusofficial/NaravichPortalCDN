import { API_UPLOAD_URL } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'
import type { ApiKey, Project } from '../../types'

/** Contents of the downloadable .env file shown once after key creation or rotation. */
export function envFileFor(apiKey: ApiKey, secret: string, project: Project | undefined, createdBy: string) {
  const slug = project?.slug ?? 'project'
  return [
    `# Naravich Sure CDN — ${project?.name ?? 'Project'} (${slug})`,
    `# Key "${apiKey.name}" created ${formatDateTime(apiKey.createdAt)} ICT by ${createdBy}.`,
    '# Server-side use only. Keep this file out of version control.',
    `NARAVICH_CDN_API_KEY=${secret}`,
    `NARAVICH_CDN_UPLOAD_URL=${API_UPLOAD_URL}`,
    `NARAVICH_CDN_PROJECT=${slug}`,
    '',
  ].join('\n')
}
