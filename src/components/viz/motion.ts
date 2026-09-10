import { useEffect, useState } from 'react'

export type Point = { x: number; y: number }

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

export function centerOf(el: Element, origin: DOMRect): Point {
  const r = el.getBoundingClientRect()
  return {
    x: r.left - origin.left + r.width / 2,
    y: r.top - origin.top + r.height / 2,
  }
}

export function edge(el: Element, origin: DOMRect, side: 'top' | 'bottom' | 'right' | 'left'): Point {
  const r = el.getBoundingClientRect()
  const x = r.left - origin.left
  const y = r.top - origin.top
  if (side === 'top') return { x: x + r.width / 2, y: y }
  if (side === 'bottom') return { x: x + r.width / 2, y: y + r.height }
  if (side === 'left') return { x: x, y: y + r.height / 2 }
  return { x: x + r.width, y: y + r.height / 2 }
}

export function curve(from: Point, to: Point, lift = 56): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const rise = Math.max(28, Math.min(lift, dist * 0.35))
  const c1x = from.x + dx * 0.32
  const c2x = from.x + dx * 0.68
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${c1x.toFixed(1)} ${(from.y - rise).toFixed(1)}, ${c2x.toFixed(1)} ${(to.y - rise).toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
}

export function hop(from: Point, to: Point, t: number): Point {
  const e = easeOutCubic(t)
  return {
    x: lerp(from.x, to.x, e),
    y: lerp(from.y, to.y, e) - Math.sin(Math.PI * t) * 52,
  }
}

/**
 * One pending timeout to the next beat. Never schedule the whole sequence
 * up front — those fire together in a busy tab and React batches a skip.
 */
export function waitNextBeat(stepMs: number, go: () => void): () => void {
  const id = window.setTimeout(go, stepMs)
  return () => window.clearTimeout(id)
}
