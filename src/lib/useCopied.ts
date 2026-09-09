import { useEffect, useState } from 'react'

export function useCopied(ms = 1500) {
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return undefined
    const id = window.setTimeout(() => setCopied(null), ms)
    return () => window.clearTimeout(id)
  }, [copied, ms])

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
    } catch {
      setCopied(null)
    }
  }

  return { copied, copy }
}
