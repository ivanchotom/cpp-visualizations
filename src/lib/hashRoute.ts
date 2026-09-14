export type Route =
  | { page: 'home' }
  | { page: 'ahead' }
  | { page: 'voice' }
  | { page: 'topic'; id: string }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '').replace(/^\/+/, '')
  if (!raw) return { page: 'home' }
  const parts = raw.split('/')
  if (parts[0] === 'ahead') return { page: 'ahead' }
  if (parts[0] === 'voice') return { page: 'voice' }
  if (parts[0] === 't' && parts[1]) {
    return { page: 'topic', id: decodeURIComponent(parts[1]) }
  }
  if (parts.length === 1 && parts[0]) {
    return { page: 'topic', id: decodeURIComponent(parts[0]) }
  }
  return { page: 'home' }
}

export function homeHash(): string {
  return '#/'
}

export function aheadHash(): string {
  return '#/ahead'
}

export function voiceHash(): string {
  return '#/voice'
}

export function topicHash(id: string): string {
  return `#/t/${encodeURIComponent(id)}`
}

export function readRoute(): Route {
  return parseHash(window.location.hash)
}

export function navigate(hash: string): void {
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = hash
}
