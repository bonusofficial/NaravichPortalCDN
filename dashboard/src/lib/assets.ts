import type { Asset, ImageFormat, OutputFormatSetting, Project } from '../types'
import { CDN_BASE_URL, MB, STORAGE_ROOT } from './constants'

export const FORMAT_LABEL: Record<ImageFormat, string> = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' }

export const FORMAT_MIME: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export const FORMAT_EXT: Record<ImageFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' }

export const OUTPUT_SETTING_LABEL: Record<OutputFormatSetting, string> = {
  webp: 'WebP',
  jpeg: 'JPEG',
  original: 'Keep original format',
}

export function mimeToFormat(mime: string): ImageFormat | null {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpeg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return null
}

export function resolveOutputFormat(setting: OutputFormatSetting, input: ImageFormat): ImageFormat {
  return setting === 'original' ? input : setting
}

export function cdnUrl(projectSlug: string, objectKey: string): string {
  const relative = objectKey.startsWith(`${projectSlug}/`) ? objectKey : `${projectSlug}/${objectKey}`
  return `${CDN_BASE_URL}/${relative}`
}

export function objectPath(projectSlug: string, objectKey: string): string {
  const relative = objectKey.startsWith(`${projectSlug}/`) ? objectKey : `${projectSlug}/${objectKey}`
  return `${STORAGE_ROOT}/${relative}`
}

export function assetUrl(asset: Asset, project: Project | undefined): string {
  return asset.publicUrl ?? cdnUrl(project?.slug ?? 'unknown', asset.objectKey)
}

/** "2026/09/019c8f2a7d41.webp" */
export function buildObjectKey(date: Date, objectId: string, format: ImageFormat): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${objectId}.${FORMAT_EXT[format]}`
}

/**
 * Deterministic compression model used by the mock upload pipeline: quality steps
 * down until the output is ≤ max output, then dimensions shrink by 10%.
 */
export function simulateCompression(input: {
  bytes: number
  width: number
  height: number
  inputFormat: ImageFormat
  outputFormat: ImageFormat
  startingQuality: number
  minQuality: number
  qualityStep: number
  maxDimension: number
  maxOutputBytes: number
}) {
  const baseRatio =
    input.outputFormat === 'webp'
      ? input.inputFormat === 'png'
        ? 0.22
        : 0.42
      : input.outputFormat === 'jpeg'
        ? input.inputFormat === 'png'
          ? 0.36
          : 0.7
        : 0.82
  let width = input.width
  let height = input.height
  const longest = Math.max(width, height)
  if (longest > input.maxDimension) {
    const scale = input.maxDimension / longest
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const sourceArea = Math.max(1, input.width * input.height)
  let quality = input.startingQuality
  const attempts: { attempt: number; quality: number; width: number; height: number; bytes: number; withinLimit: boolean }[] = []
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const qualityFactor = 0.55 + (quality / 100) * 0.55
    const areaRatio = (width * height) / sourceArea
    const bytes = Math.max(18_000, Math.round(input.bytes * baseRatio * areaRatio * qualityFactor))
    const withinLimit = bytes <= input.maxOutputBytes
    attempts.push({ attempt, quality, width, height, bytes, withinLimit })
    if (withinLimit) break
    if (quality - input.qualityStep >= input.minQuality) {
      quality -= input.qualityStep
    } else {
      width = Math.round(width * 0.9)
      height = Math.round(height * 0.9)
    }
  }
  const final = attempts[attempts.length - 1]
  return { attempts, final, ok: final.withinLimit }
}

export const DEFAULT_MAX_OUTPUT = 5 * MB
