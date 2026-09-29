import { useEffect, useRef, useState } from 'react'

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return legacyCopy(text)
  }
}

/** Copy helper that remembers which value was copied for ~1.6 s (for "Copied" feedback). */
export function useClipboard(resetAfter = 1600) {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async (text: string, id: string = text): Promise<boolean> => {
    const ok = await copyText(text)
    if (ok) {
      setCopied(id)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), resetAfter)
    }
    return ok
  }

  return { copy, copied, isCopied: (id: string) => copied === id }
}
