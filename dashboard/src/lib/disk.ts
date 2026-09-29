import { SERVER } from './constants'

export function diskUsage() {
  const percent = (SERVER.diskUsedBytes / SERVER.diskTotalBytes) * 100
  return { percent, used: SERVER.diskUsedBytes, total: SERVER.diskTotalBytes }
}
