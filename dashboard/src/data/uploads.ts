import { DAY, HOUR, MB, MINUTE, MOCK_NOW } from '../lib/constants'
import { checksumFrom, objectIdFrom, requestIdFrom } from '../lib/ids'
import { buildRejection, runPipeline, shortKeyLabel } from '../lib/pipeline'
import { createRng, type Rng } from '../lib/rng'
import type { Asset, ImageFormat, Project, UploadLog } from '../types'
import { PROJECT_PRIMARY_KEY, PROJECT_SOURCE_IPS, seedApiKeys } from './apiKeys'
import { seedProjects } from './projects'

interface Template {
  name: (rng: Rng, n: number) => string
  format: ImageFormat
  size: readonly [number, number]
  /** Approximate bytes per pixel of the source file. */
  bpp: number
}

const TEMPLATES: Record<string, Template[]> = {
  prj_main: [
    { name: (r) => `hero-home-${r.pick(['rainy-season', 'q4-launch', 'anniversary', 'loy-krathong'])}-2026.jpg`, format: 'jpeg', size: [6000, 4000], bpp: 0.44 },
    { name: (r) => `news-2026-${r.pick(['08', '09'])}-${r.pick(['cover', 'feature', 'inline'])}-${r.int(1, 9)}.jpg`, format: 'jpeg', size: [2400, 1260], bpp: 0.62 },
    { name: (r) => `product-${r.pick(['sure-home', 'sure-drive', 'sure-care', 'sure-travel'])}-${r.pick(['front', 'detail', 'pack'])}.png`, format: 'png', size: [3000, 3000], bpp: 0.95 },
    { name: (r) => `leadership-portrait-${r.pick(['ceo', 'cfo', 'coo', 'cto'])}.jpg`, format: 'jpeg', size: [4000, 5000], bpp: 0.4 },
    { name: (r) => `og-${r.pick(['about', 'contact', 'products', 'newsroom', 'investors'])}.png`, format: 'png', size: [1200, 630], bpp: 1.1 },
  ],
  prj_partner: [
    { name: (r, n) => `dealer-banner-${r.pick(['north', 'northeast', 'central', 'south'])}-${n % 7}.jpg`, format: 'jpeg', size: [2400, 800], bpp: 0.7 },
    { name: (r) => `spec-sheet-${r.pick(['nx200', 'nx300', 'sx10', 'sx12', 'hx7'])}.png`, format: 'png', size: [2480, 3508], bpp: 0.52 },
    { name: (r) => `cobrand-logo-${r.pick(['siam-motors', 'chao-phraya-trading', 'lanna-auto', 'andaman-partners'])}.png`, format: 'png', size: [1024, 1024], bpp: 0.6 },
    { name: (r, n) => `product-${r.pick(['nx200', 'sx10', 'hx7'])}-angle-${(n % 6) + 1}.webp`, format: 'webp', size: [2000, 2000], bpp: 0.22 },
  ],
  prj_cms: [
    { name: (r, n) => `article-${r.pick(['flood-safety-tips', 'ev-charging-guide', 'claims-explained', 'road-trip-checklist', 'health-checkup'])}-${(n % 5) + 1}.jpg`, format: 'jpeg', size: [5472, 3648], bpp: 0.42 },
    { name: (r) => `infographic-${r.pick(['claim-steps', 'coverage-compare', 'premium-calculator'])}.png`, format: 'png', size: [1600, 4200], bpp: 0.48 },
    { name: (r) => `screenshot-${r.pick(['mobile-app-home', 'policy-dashboard', 'claim-tracker'])}.png`, format: 'png', size: [2880, 1800], bpp: 0.78 },
  ],
  prj_campaign: [
    { name: (r) => `${r.pick(['rainy-season', 'year-end', '11-11'])}-hero-desktop.jpg`, format: 'jpeg', size: [3840, 1600], bpp: 0.55 },
    { name: (r) => `${r.pick(['rainy-season', 'year-end', '11-11'])}-hero-mobile.jpg`, format: 'jpeg', size: [1080, 1920], bpp: 0.6 },
    { name: (_r, n) => `promo-banner-${(n % 8) + 1}.jpg`, format: 'jpeg', size: [2560, 1080], bpp: 0.58 },
    { name: (r) => `lp-${r.pick(['family-plan', 'travel-plus', 'drive-safe'])}-background.webp`, format: 'webp', size: [3000, 2000], bpp: 0.2 },
  ],
  prj_careers: [
    { name: (_r, n) => `team-offsite-chiang-mai-${String((n % 24) + 1).padStart(2, '0')}.jpg`, format: 'jpeg', size: [6000, 4000], bpp: 0.46 },
    { name: (_r, n) => `office-bangkok-${String((n % 12) + 1).padStart(2, '0')}.jpg`, format: 'jpeg', size: [4032, 3024], bpp: 0.5 },
    { name: (r) => `job-card-${r.pick(['backend-engineer', 'claims-specialist', 'product-designer', 'data-analyst'])}.png`, format: 'png', size: [1200, 628], bpp: 0.9 },
  ],
  prj_catalog: [
    { name: (r) => `sku-${r.pick(['NS-1042', 'NS-1187', 'NS-2210', 'NS-3305'])}-white.png`, format: 'png', size: [2000, 2000], bpp: 0.7 },
    { name: (r) => `sku-${r.pick(['NS-1042', 'NS-1187', 'NS-2210'])}-lifestyle.jpg`, format: 'jpeg', size: [4000, 3000], bpp: 0.48 },
  ],
}

const USER_AGENTS: Record<string, string> = {
  prj_main: 'naravich-web/4.12.0 (node 22.9.0)',
  prj_partner: 'partner-portal/2.3.1 (php 8.3.11; curl 8.9)',
  prj_cms: 'internal-cms/7.0.4 (python-httpx 0.27)',
  prj_campaign: 'campaign-builder/1.8.0 (node 20.17.0)',
  prj_careers: 'careers-cms-plugin/0.9.3 (php 8.2.23)',
  prj_catalog: 'catalog-importer/1.1.0 (go 1.23)',
}

const FAILED_REASONS = [
  'Decoder error: PNG chunk IDAT failed CRC check.',
  'Image processor worker timed out after 30 s.',
  'Unsupported colour profile: CMYK JPEG could not be converted to sRGB.',
]

function projectById(id: string): Project {
  const project = seedProjects.find((p) => p.id === id)
  if (!project) throw new Error(`Unknown project ${id}`)
  return project
}

function keyLabelFor(projectId: string) {
  const key = seedApiKeys.find((k) => k.id === PROJECT_PRIMARY_KEY[projectId])
  return {
    label: key ? shortKeyLabel(key.environment, key.last4) : 'ncdn_live_…0000',
    rateLimit: key?.rateLimitPerMin ?? 120,
  }
}

function jitterSize(rng: Rng, [w, h]: readonly [number, number]): [number, number] {
  if (rng.chance(0.7)) return [w, h]
  const scale = rng.pick([0.8, 0.75, 0.6, 1])
  return [Math.round(w * scale), Math.round(h * scale)]
}

function generate() {
  const rng = createRng(20260929)
  const assets: Asset[] = []
  const logs: UploadLog[] = []

  // Weighted by 30-day request volume; paused/archived projects only have older uploads.
  const activeWeights: [string, number][] = [
    ['prj_main', 2_386],
    ['prj_partner', 1_392],
    ['prj_cms', 1_574],
    ['prj_campaign', 736],
    ['prj_careers', 218],
  ]

  const ASSET_COUNT = 168
  const LOG_WINDOW = 2 * DAY
  const counters: Record<string, number> = {}
  const usedNames = new Set<string>()
  const uniqueName = (name: string) => {
    let candidate = name
    for (let n = 2; usedNames.has(candidate); n += 1) candidate = name.replace(/(\.[a-z]+)$/, `-v${n}$1`)
    usedNames.add(candidate)
    return candidate
  }

  for (let i = 0; i < ASSET_COUNT; i += 1) {
    // Recency-weighted timestamps over 30 days; first few are the newest.
    const age = i < 3 ? (i + 1) * 50_000 : Math.pow(rng.next(), 1.8) * 30 * DAY + i * 20_000
    const timestamp = Math.round(MOCK_NOW - age)
    const projectId = i >= 150 && i < 160 ? 'prj_catalog' : rng.weighted(activeWeights)
    const effectiveTimestamp = projectId === 'prj_catalog' ? MOCK_NOW - 6 * DAY - rng.int(3, 20) * HOUR : timestamp
    const project = projectById(projectId)
    const template = rng.pick(TEMPLATES[projectId])
    counters[projectId] = (counters[projectId] ?? 0) + 1
    const [width, height] = jitterSize(rng, template.size)
    const bytes = Math.round(width * height * template.bpp * rng.float(0.85, 1.2))
    const { label, rateLimit } = keyLabelFor(projectId)
    const requestId = requestIdFrom(rng)
    const objectId = objectIdFrom(rng)
    const isProcessing = i < 3
    const isFailed = !isProcessing && (i === 9 || i === 41 || i === 97)
    const { asset, log } = runPipeline(
      {
        requestId,
        timestamp: effectiveTimestamp,
        project,
        keyLabel: label,
        rateLimitPerMin: rateLimit,
        requestsThisMinute: rng.int(1, Math.max(2, Math.round(rateLimit * 0.2))),
        sourceIp: rng.pick(PROJECT_SOURCE_IPS[projectId]),
        userAgent: USER_AGENTS[projectId],
        fileName: uniqueName(template.name(rng, counters[projectId])),
        format: template.format,
        bytes,
        width,
        height,
        objectId,
        checksum: checksumFrom(rng),
        preview: { kind: 'generated', seed: rng.int(1, 2 ** 31) },
      },
      isProcessing
        ? { async: { outcome: 'processing' } }
        : isFailed
          ? { async: { outcome: 'failed', error: FAILED_REASONS[[9, 41, 97].indexOf(i)] } }
          : bytes > 12 * MB && rng.chance(0.5)
            ? { async: { outcome: 'ready' } }
            : {},
    )
    assets.push(asset)
    if (MOCK_NOW - effectiveTimestamp <= LOG_WINDOW) logs.push(log)
  }

  // Additional successful requests in the log window whose objects are outside the loaded asset page.
  for (let i = 0; i < 150; i += 1) {
    const projectId = rng.weighted(activeWeights)
    const project = projectById(projectId)
    const template = rng.pick(TEMPLATES[projectId])
    const [width, height] = jitterSize(rng, template.size)
    const bytes = Math.round(width * height * template.bpp * rng.float(0.85, 1.2))
    const { label, rateLimit } = keyLabelFor(projectId)
    const { log } = runPipeline({
      requestId: requestIdFrom(rng),
      timestamp: Math.round(MOCK_NOW - rng.float(0.05, 1) * LOG_WINDOW),
      project,
      keyLabel: label,
      rateLimitPerMin: rateLimit,
      requestsThisMinute: rng.int(1, Math.max(2, Math.round(rateLimit * 0.2))),
      sourceIp: rng.pick(PROJECT_SOURCE_IPS[projectId]),
      userAgent: USER_AGENTS[projectId],
      fileName: template.name(rng, i + 40),
      format: template.format,
      bytes,
      width,
      height,
      objectId: objectIdFrom(rng),
      checksum: checksumFrom(rng),
      preview: { kind: 'generated', seed: 1 },
    })
    logs.push({ ...log, assetId: null })
  }

  // Rejected requests (never create an asset).
  const reject = (
    status: 401 | 413 | 422 | 429 | 507,
    projectId: string,
    minutesAgo: number,
    overrides: { keyLabel?: string; fileName?: string; mime?: string; bytes?: number; ip?: string },
    detail: { message: string; hint: string; retryAfter?: number },
  ) => {
    const project = projectById(projectId)
    const { label, rateLimit } = keyLabelFor(projectId)
    logs.push(
      buildRejection(
        status,
        {
          requestId: requestIdFrom(rng),
          timestamp: MOCK_NOW - minutesAgo * MINUTE,
          project,
          keyLabel: overrides.keyLabel ?? label,
          rateLimitPerMin: rateLimit,
          sourceIp: overrides.ip ?? rng.pick(PROJECT_SOURCE_IPS[projectId]),
          userAgent: USER_AGENTS[projectId] ?? 'curl/8.9.1',
          fileName: overrides.fileName ?? 'upload.jpg',
          mimeType: overrides.mime ?? 'image/jpeg',
          bytes: overrides.bytes ?? 2 * MB,
        },
        detail,
      ),
    )
  }

  const unauthorized = {
    message: 'API key is revoked, expired, or does not exist.',
    hint: 'Check the key in the calling server’s environment. Revoked keys cannot be restored — create or rotate a key.',
  }
  reject(401, 'prj_catalog', 22, { keyLabel: shortKeyLabel('live', 'D1WS'), fileName: 'sku-NS-3305-white.png', mime: 'image/png', bytes: 3.1 * MB, ip: '203.0.113.140' }, unauthorized)
  reject(401, 'prj_catalog', 23, { keyLabel: shortKeyLabel('live', 'D1WS'), fileName: 'sku-NS-3305-lifestyle.jpg', bytes: 5.8 * MB, ip: '203.0.113.140' }, unauthorized)
  reject(401, 'prj_cms', 7 * 60 + 12, { keyLabel: shortKeyLabel('live', 'M8ZB'), fileName: 'archive-2019-017.jpg', bytes: 1.4 * MB, ip: '10.20.0.30' }, unauthorized)
  reject(401, 'prj_main', 26 * 60, { keyLabel: 'none', fileName: 'test.png', mime: 'image/png', bytes: 0.2 * MB, ip: '192.0.2.201' }, {
    message: 'Missing Authorization header.',
    hint: 'Send the key as “Authorization: Bearer <key>” from your backend.',
  })

  const tooLarge = (size: number, limit: string) => ({
    message: `File is ${(size / MB).toFixed(1)} MB; the input limit for this project is ${limit}.`,
    hint: 'Resize or export the source at a lower resolution before uploading, or raise the project’s input limit.',
  })
  reject(413, 'prj_campaign', 41, { fileName: 'year-end-hero-desktop-master.jpg', bytes: 38.2 * MB }, tooLarge(38.2 * MB, '25 MB'))
  reject(413, 'prj_campaign', 44, { fileName: 'year-end-hero-desktop-master-v2.jpg', bytes: 31.6 * MB }, tooLarge(31.6 * MB, '25 MB'))
  reject(413, 'prj_main', 3 * 60 + 5, { fileName: 'hero-home-anniversary-2026-raw.png', mime: 'image/png', bytes: 64.9 * MB }, tooLarge(64.9 * MB, '25 MB'))
  reject(413, 'prj_partner', 9 * 60 + 40, { fileName: 'spec-sheet-hx7-print.png', mime: 'image/png', bytes: 27.3 * MB }, tooLarge(27.3 * MB, '20 MB'))
  reject(413, 'prj_careers', 30 * 60, { fileName: 'team-offsite-chiang-mai-panorama.jpg', bytes: 19.8 * MB }, tooLarge(19.8 * MB, '15 MB'))

  reject(422, 'prj_cms', 58, { fileName: 'article-ev-charging-guide-3.jpg', bytes: 0.9 * MB }, {
    message: 'Could not decode image: unexpected end of JPEG data (truncated at 912,344 bytes).',
    hint: 'The upload was likely interrupted. Retry with the complete file.',
  })
  reject(422, 'prj_partner', 5 * 60 + 18, { fileName: 'cobrand-logo-lanna-auto.png', mime: 'image/png', bytes: 0.04 * MB }, {
    message: 'Content is image/svg+xml; only JPEG, PNG, and WebP are accepted.',
    hint: 'Rasterise vector artwork to PNG before uploading.',
  })
  reject(422, 'prj_main', 20 * 60, { fileName: 'news-2026-09-feature-2.heic', mime: 'image/heic', bytes: 2.6 * MB }, {
    message: 'Unsupported format image/heic.',
    hint: 'Convert HEIC photos to JPEG on the website backend before uploading.',
  })

  const rateLimited = {
    message: 'Rate limit of 120 requests/min exceeded for this key.',
    hint: 'Queue uploads on the backend and honour the Retry-After header.',
    retryAfter: 18,
  }
  for (let i = 0; i < 4; i += 1) {
    reject(429, 'prj_campaign', 16 * 60 + 2 + i * 0.2, { fileName: `promo-banner-${i + 3}.jpg`, bytes: 1.8 * MB }, rateLimited)
  }

  reject(507, 'prj_main', 11 * 60 + 20, { fileName: 'hero-home-q4-launch-2026.jpg', bytes: 9.4 * MB }, {
    message: 'Temporary volume /srv/naravich-cdn/temp is full (98%) while the nightly backup is running.',
    hint: 'Transient. The request can be retried; operators should review temp-volume sizing.',
  })

  assets.sort((a, b) => b.uploadedAt - a.uploadedAt)
  logs.sort((a, b) => b.timestamp - a.timestamp)
  return { assets, logs }
}

const generated = generate()

export const seedAssets: Asset[] = generated.assets
export const seedLogs: UploadLog[] = generated.logs
