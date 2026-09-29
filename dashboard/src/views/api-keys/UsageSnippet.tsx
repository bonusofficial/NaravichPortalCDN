import { CircleCheck, CircleX } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { API_UPLOAD_URL, CDN_BASE_URL } from '../../lib/constants'

export function UsageSnippet({ projectSlug }: { projectSlug: string }) {
  const samples = [
    {
      id: 'curl',
      label: 'cURL',
      language: 'bash' as const,
      code: `# Run on the website server, never in a browser
curl -X POST ${API_UPLOAD_URL} \\
  -H "Authorization: Bearer $NARAVICH_CDN_API_KEY" \\
  -F "file=@hero-banner.jpg"`,
    },
    {
      id: 'node',
      label: 'Node.js',
      language: 'js' as const,
      code: `// Server-side only (Node.js 20+)
import { openAsBlob } from 'node:fs'

const form = new FormData()
form.append('file', await openAsBlob('./hero-banner.jpg'), 'hero-banner.jpg')

const res = await fetch(process.env.NARAVICH_CDN_UPLOAD_URL, {
  method: 'POST',
  headers: { Authorization: \`Bearer \${process.env.NARAVICH_CDN_API_KEY}\` },
  body: form,
})
if (!res.ok) throw new Error(\`Upload failed: \${res.status}\`)
const { url } = await res.json()`,
    },
    {
      id: 'php',
      label: 'PHP',
      language: 'php' as const,
      code: `// Server-side only — read the key from the environment
$ch = curl_init(getenv('NARAVICH_CDN_UPLOAD_URL'));
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('NARAVICH_CDN_API_KEY')],
    CURLOPT_POSTFIELDS => ['file' => new CURLFile('hero-banner.jpg', 'image/jpeg')],
    CURLOPT_RETURNTRANSFER => true,
]);
$url = json_decode(curl_exec($ch), true)['url'];`,
    },
    {
      id: 'response',
      label: 'Response',
      language: 'json' as const,
      code: `{
  "id": "019c1234",
  "url": "${CDN_BASE_URL}/${projectSlug}/2026/09/019c1234.webp",
  "format": "webp",
  "width": 2400,
  "height": 1350,
  "bytes": 486912,
  "original_bytes": 3145728,
  "request_id": "req_9f3k2m7q1x8c4v0b"
}`,
    },
  ]

  return (
    <div className="key-guidance">
      <Card>
        <CardHeader title="Handling keys safely" subtitle="Keys grant upload access to one project." divided />
        <CardBody>
          <ul className="do-list">
            <li className="is-do">
              <CircleCheck aria-label="Do" />
              Store keys in the website server’s environment variables or secrets manager.
            </li>
            <li className="is-do">
              <CircleCheck aria-label="Do" />
              Restrict live keys to the web server’s IP addresses and the scopes it needs.
            </li>
            <li className="is-do">
              <CircleCheck aria-label="Do" />
              Rotate keys when staff leave or a server is rebuilt; set an expiry.
            </li>
            <li className="is-dont">
              <CircleX aria-label="Don’t" />
              Never embed a key in browser JavaScript, HTML, or a mobile app.
            </li>
            <li className="is-dont">
              <CircleX aria-label="Don’t" />
              Never commit keys or .env files to Git — revoke immediately if one leaks.
            </li>
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Upload from your backend" subtitle={`POST ${API_UPLOAD_URL} · multipart/form-data`} divided />
        <CardBody>
          <CodeBlock label="Upload code example" samples={samples} />
        </CardBody>
      </Card>
    </div>
  )
}
