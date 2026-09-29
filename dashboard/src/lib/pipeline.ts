import type {
  Asset,
  AssetPreview,
  ImageFormat,
  JsonValue,
  LogStep,
  Project,
  UploadHttpStatus,
  UploadLog,
  UploadOutcome,
} from '../types'
import { buildObjectKey, cdnUrl, FORMAT_LABEL, FORMAT_MIME, objectPath, resolveOutputFormat, simulateCompression } from './assets'
import { API_UPLOAD_URL } from './constants'
import { formatIsoBangkok, formatBytes } from './format'

/*
 * Model of the server's upload pipeline, shared by the seeded data and the
 * interactive upload dialog so both produce identical asset and log records.
 */

export const QUALITY_STEP = 6

export interface PipelineRequest {
  requestId: string
  timestamp: number
  project: Project
  keyLabel: string
  rateLimitPerMin: number
  requestsThisMinute: number
  sourceIp: string
  userAgent: string
  fileName: string
  format: ImageFormat
  bytes: number
  width: number
  height: number
  objectId: string
  checksum: string
  preview: AssetPreview
}

export interface PipelineOptions {
  /** Force the async 202 path and the eventual outcome. */
  async?: { outcome: 'processing' | 'ready' | 'failed'; error?: string }
}

function round(ms: number) {
  return Math.max(1, Math.round(ms))
}

export function runPipeline(request: PipelineRequest, options: PipelineOptions = {}): { asset: Asset; log: UploadLog } {
  const { project } = request
  const settings = project.settings
  const outputFormat = resolveOutputFormat(settings.outputFormat, request.format)
  const compression = simulateCompression({
    bytes: request.bytes,
    width: request.width,
    height: request.height,
    inputFormat: request.format,
    outputFormat,
    startingQuality: settings.startingQuality,
    minQuality: settings.minQuality,
    qualityStep: QUALITY_STEP,
    maxDimension: settings.maxDimension,
    maxOutputBytes: settings.maxOutputBytes,
  })
  const objectKey = buildObjectKey(new Date(request.timestamp), request.objectId, outputFormat)
  const path = objectPath(project.slug, objectKey)
  const url = cdnUrl(project.slug, objectKey)
  const { final } = compression
  const resized = final.width !== request.width || final.height !== request.height
  const decodeMs = round(request.bytes / 90_000)
  const compressMs = compression.attempts.reduce((sum, a) => sum + round((a.width * a.height) / 42_000), 0)
  const asyncOutcome = options.async?.outcome
  const failed = asyncOutcome === 'failed' || !compression.ok
  const processing = asyncOutcome === 'processing'
  const httpStatus: UploadHttpStatus = options.async ? 202 : 201
  const outcome: UploadOutcome = failed ? 'failed' : processing ? 'processing' : 'ready'
  const errorText =
    options.async?.error ??
    (compression.ok ? undefined : `Could not reach the ${formatBytes(settings.maxOutputBytes)} output target after ${compression.attempts.length} attempts.`)

  const steps: LogStep[] = [
    {
      label: 'Authenticate',
      detail: `Key ${request.keyLabel} · scope assets:write`,
      state: 'passed',
      durationMs: 2,
    },
    {
      label: 'Rate limit',
      detail: `${request.requestsThisMinute} of ${request.rateLimitPerMin} requests this minute`,
      state: 'passed',
      durationMs: 1,
    },
    {
      label: 'Validate type',
      detail: `Magic bytes match ${FORMAT_MIME[request.format]}`,
      state: 'passed',
      durationMs: 1,
    },
    {
      label: 'Validate size',
      detail: `${formatBytes(request.bytes)} ≤ ${formatBytes(settings.maxInputBytes)} input limit`,
      state: 'passed',
      durationMs: 1,
    },
    {
      label: 'Decode',
      detail: `${request.width} × ${request.height} px, sRGB`,
      state: 'passed',
      durationMs: decodeMs,
    },
    {
      label: 'Resize',
      detail: resized
        ? `Longest edge ${Math.max(request.width, request.height)} → ${Math.max(final.width, final.height)} px`
        : `Within ${settings.maxDimension} px — not resized`,
      state: processing ? 'running' : resized ? 'passed' : 'skipped',
    },
    {
      label: 'Compress',
      detail: processing
        ? `Encoding ${FORMAT_LABEL[outputFormat]} at q${settings.startingQuality}…`
        : failed
          ? (errorText ?? 'Processing failed')
          : `${FORMAT_LABEL[outputFormat]} q${final.quality} · ${compression.attempts.length} ${compression.attempts.length === 1 ? 'attempt' : 'attempts'}`,
      state: processing ? 'running' : failed ? 'failed' : 'passed',
      durationMs: processing ? undefined : compressMs,
    },
    {
      label: 'Store',
      detail: failed || processing ? 'Not written' : `Wrote ${path}`,
      state: failed || processing ? 'skipped' : 'passed',
      durationMs: failed || processing ? undefined : 4,
    },
  ]

  const durationMs = options.async ? round(18 + decodeMs * 0.2) : steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) + 6

  const response: JsonValue = options.async
    ? {
        id: request.objectId,
        status: 'processing',
        status_url: `${API_UPLOAD_URL}/${request.objectId}`,
        request_id: request.requestId,
      }
    : {
        id: request.objectId,
        url,
        project: project.slug,
        format: outputFormat,
        width: final.width,
        height: final.height,
        bytes: final.bytes,
        original_bytes: request.bytes,
        checksum: `sha256:${request.checksum}`,
        created_at: formatIsoBangkok(request.timestamp),
        request_id: request.requestId,
      }

  const asset: Asset = {
    id: request.objectId,
    projectId: project.id,
    fileName: request.fileName,
    objectKey,
    originalFormat: request.format,
    outputFormat,
    originalWidth: request.width,
    originalHeight: request.height,
    width: final.width,
    height: final.height,
    originalBytes: request.bytes,
    optimizedBytes: failed || processing ? null : final.bytes,
    quality: failed || processing ? null : final.quality,
    attempts: processing ? 0 : compression.attempts.length,
    status: outcome === 'ready' ? 'ready' : outcome === 'processing' ? 'processing' : 'failed',
    error: failed ? errorText : undefined,
    uploadedAt: request.timestamp,
    requestId: request.requestId,
    keyLabel: request.keyLabel,
    checksum: request.checksum,
    retainedOriginal: true,
    preview: request.preview,
  }

  const log: UploadLog = {
    id: `log_${request.requestId.slice(4)}`,
    requestId: request.requestId,
    timestamp: request.timestamp,
    projectId: project.id,
    keyLabel: request.keyLabel,
    sourceIp: request.sourceIp,
    userAgent: request.userAgent,
    fileName: request.fileName,
    mimeType: FORMAT_MIME[request.format],
    originalBytes: request.bytes,
    optimizedBytes: asset.optimizedBytes,
    durationMs,
    httpStatus,
    outcome,
    assetId: asset.id,
    steps,
    attempts: processing ? [] : compression.attempts,
    objectPath: failed || processing ? null : path,
    response,
    error: failed
      ? {
          code: compression.ok ? 'processing_failed' : 'output_limit_unreachable',
          message: errorText ?? 'Processing failed.',
          hint: 'Retry processing from the asset drawer, or upload a smaller source image.',
        }
      : undefined,
  }

  return { asset, log }
}

export interface RejectionRequest {
  requestId: string
  timestamp: number
  project: Project
  keyLabel: string
  rateLimitPerMin: number
  sourceIp: string
  userAgent: string
  fileName: string
  mimeType: string
  bytes: number
}

const REJECTION_COPY: Record<Exclude<UploadHttpStatus, 201 | 202>, { code: string; failAt: number }> = {
  401: { code: 'invalid_api_key', failAt: 0 },
  429: { code: 'rate_limited', failAt: 1 },
  413: { code: 'payload_too_large', failAt: 3 },
  422: { code: 'invalid_image', failAt: 4 },
  507: { code: 'insufficient_storage', failAt: 7 },
}

export function buildRejection(
  status: Exclude<UploadHttpStatus, 201 | 202>,
  request: RejectionRequest,
  detail: { message: string; hint: string; retryAfter?: number },
): UploadLog {
  const { failAt, code } = REJECTION_COPY[status]
  const labels = ['Authenticate', 'Rate limit', 'Validate type', 'Validate size', 'Decode', 'Resize', 'Compress', 'Store']
  const passedDetail: Record<string, string> = {
    Authenticate: `Key ${request.keyLabel} · scope assets:write`,
    'Rate limit': `Within ${request.rateLimitPerMin} requests/min`,
    'Validate type': `Declared ${request.mimeType}`,
    'Validate size': `${formatBytes(request.bytes)} ≤ ${formatBytes(request.project.settings.maxInputBytes)} input limit`,
    Decode: 'Decoded',
    Resize: 'Resized',
    Compress: 'Compressed',
    Store: 'Stored',
  }
  const steps: LogStep[] = labels.map((label, index) => ({
    label,
    detail: index < failAt ? passedDetail[label] : index === failAt ? detail.message : 'Not run',
    state: index < failAt ? 'passed' : index === failAt ? 'failed' : 'skipped',
    durationMs: index <= failAt ? (index === failAt ? 3 : 1) : undefined,
  }))
  const error: { [key: string]: JsonValue } = {
    code,
    message: detail.message,
    request_id: request.requestId,
  }
  if (detail.retryAfter != null) error.retry_after = detail.retryAfter
  return {
    id: `log_${request.requestId.slice(4)}`,
    requestId: request.requestId,
    timestamp: request.timestamp,
    projectId: request.project.id,
    keyLabel: request.keyLabel,
    sourceIp: request.sourceIp,
    userAgent: request.userAgent,
    fileName: request.fileName,
    mimeType: request.mimeType,
    originalBytes: request.bytes,
    optimizedBytes: null,
    durationMs: status === 422 ? 140 : status === 507 ? 9 : 4,
    httpStatus: status,
    outcome: 'rejected',
    assetId: null,
    steps,
    attempts: [],
    objectPath: null,
    response: { error },
    error: { code, message: detail.message, hint: detail.hint },
  }
}

export function shortKeyLabel(environment: 'live' | 'test', last4: string): string {
  return `ncdn_${environment}_…${last4}`
}
