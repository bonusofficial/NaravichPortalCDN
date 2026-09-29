const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const IPV6 = /^[0-9a-f:]+$/i

function validEntry(entry: string): boolean {
  const [address, prefix, extra] = entry.split('/')
  if (extra !== undefined) return false
  if (IPV4.test(address)) return prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= 32)
  if (address.includes(':') && IPV6.test(address) && address.split(':').length <= 8)
    return prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= 128)
  return false
}

/** Parse a newline/comma separated allowlist into valid and invalid entries. */
export function parseAllowlist(text: string): { valid: string[]; invalid: string[] } {
  const entries = text
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  const valid: string[] = []
  const invalid: string[] = []
  for (const entry of entries) (validEntry(entry) ? valid : invalid).push(entry)
  return { valid: Array.from(new Set(valid)), invalid }
}
