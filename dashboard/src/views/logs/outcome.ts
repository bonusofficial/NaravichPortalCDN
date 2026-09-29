import { ASSET_STATUS_META, HTTP_STATUS_META, type StatusMeta } from '../../lib/status'
import type { UploadLog } from '../../types'

/** Final result of a request: stored outcomes use asset states, rejections use the HTTP meaning. */
export function outcomeMeta(log: UploadLog): StatusMeta {
  if (log.outcome === 'rejected') return HTTP_STATUS_META[log.httpStatus]
  return ASSET_STATUS_META[log.outcome]
}
