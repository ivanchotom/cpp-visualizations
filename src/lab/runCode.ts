import type { Stage, TryCode } from './schema.ts'

export function matchCodeRun(
  spec: TryCode,
  source: string,
): { voice: string; verdict: string; stage: Stage } {
  const hay = source.toLowerCase().replace(/\s+/g, ' ')
  for (const run of spec.runs) {
    const ok = run.when.every((w) => hay.includes(w.toLowerCase()))
    const blocked = (run.unless ?? []).some((w) => hay.includes(w.toLowerCase()))
    if (ok && !blocked) return { voice: run.voice, verdict: run.verdict, stage: run.stage }
  }
  return spec.fallback
}
