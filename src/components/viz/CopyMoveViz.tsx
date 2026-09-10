import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { centerOf, clamp01, hop, usePrefersReducedMotion } from './motion.ts'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type Mode = 'copy' | 'move'
type Phase = 'idle' | 'running' | 'done'

interface Flyer {
  i: number
  letter: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  born: number
  duration: number
  t: number
}

export function CopyMoveViz() {
  const reduced = usePrefersReducedMotion()
  const [mode, setMode] = useState<Mode>('copy')
  const [phase, setPhase] = useState<Phase>('idle')
  const [filled, setFilled] = useState(0)
  const [drained, setDrained] = useState(0)
  const [ownerRight, setOwnerRight] = useState(false)
  const [flyers, setFlyers] = useState<Flyer[]>([])

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRefs = useRef<(HTMLSpanElement | null)[]>([])
  const dstRefs = useRef<(HTMLSpanElement | null)[]>([])
  const flyersRef = useRef<Flyer[]>([])
  const rafRef = useRef(0)

  function reset(next: Mode = mode) {
    cancelAnimationFrame(rafRef.current)
    flyersRef.current = []
    setFlyers([])
    setFilled(0)
    setDrained(0)
    setOwnerRight(false)
    setPhase('idle')
    setMode(next)
  }

  function play() {
    cancelAnimationFrame(rafRef.current)
    setFilled(0)
    setDrained(0)
    setOwnerRight(false)
    setPhase('running')

    if (reduced) {
      setFilled(4)
      setDrained(mode === 'move' ? 4 : 0)
      setOwnerRight(mode === 'move')
      setPhase('done')
      return
    }

    const stage = stageRef.current
    if (!stage) return
    const origin = stage.getBoundingClientRect()
    const now = performance.now()
    const next: Flyer[] = LETTERS.map((letter, i) => {
      const fromEl = srcRefs.current[i]
      const toEl = dstRefs.current[i]
      const from = fromEl ? centerOf(fromEl, origin) : { x: 80 + i * 44, y: 160 }
      const to = toEl ? centerOf(toEl, origin) : { x: 420 + i * 44, y: 160 }
      return {
        i,
        letter,
        from,
        to,
        born: now + i * 140,
        duration: mode === 'copy' ? 620 : 700,
        t: 0,
      }
    })
    flyersRef.current = next
    setFlyers(next.map((f) => ({ ...f })))

    const tick = (t: number) => {
      let allDone = true
      let arrived = 0
      let left = 0
      const updated = flyersRef.current.map((f) => {
        const local = clamp01((t - f.born) / f.duration)
        if (local < 1) allDone = false
        if (local >= 1) arrived += 1
        if (mode === 'move' && local >= 0.28) left += 1
        return { ...f, t: local }
      })
      flyersRef.current = updated
      setFlyers(updated)
      setFilled(arrived)
      setDrained(mode === 'move' ? left : 0)
      if (mode === 'move' && left >= 1) setOwnerRight(true)
      if (allDone && t > next[0].born) {
        setPhase('done')
        setFlyers([])
        flyersRef.current = []
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const srcShown = LETTERS.map((ch, i) => (drained > i ? '' : ch))
  const dstShown = LETTERS.map((ch, i) => (filled > i ? ch : ''))
  const copyDone = phase === 'done' && mode === 'copy'
  const moveDone = phase === 'done' && mode === 'move'

  const caption =
    phase === 'idle'
      ? mode === 'copy'
        ? 'Copy constructs a second object with its own buffer. The source keeps every element.'
        : 'Move steals the buffer. The source stays a valid object, but it no longer owns the data.'
      : phase === 'running'
        ? mode === 'copy'
          ? 'Cloning each element into a fresh allocation — a is untouched.'
          : 'The buffer is sliding to b. a’s pointer is being emptied, not deep-copied.'
        : mode === 'copy'
          ? 'Two independent buffers. Mutating b later cannot change a.'
          : 'Same allocation, new owner. a is empty; nothing was element-wise copied.'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button
          className={`chip${mode === 'copy' ? ' chip--active' : ''}`}
          onClick={() => reset('copy')}
        >
          copy
        </button>
        <button
          className={`chip${mode === 'move' ? ' chip--active' : ''}`}
          onClick={() => reset('move')}
        >
          move
        </button>
        <button className="chip chip--play" onClick={play} disabled={phase === 'running'}>
          {mode === 'copy' ? 'Play  T b = a' : 'Play  T b = std::move(a)'}
        </button>
        <button className="chip chip--ghost" onClick={() => reset(mode)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage cm-stage viz-stage--${mode}${phase === 'running' ? ' viz-stage--live' : ''}`}
      >
        <div className="cm-objects">
          <OwnerCard
            name="a"
            role="source"
            ptr={moveDone || drained > 0 ? 'nullptr' : 'buf'}
            hot={phase !== 'done'}
          />
          <div className={`cm-verb cm-verb--${mode}`}>
            <span>{mode === 'copy' ? 'duplicate' : 'steal'}</span>
            <small>{mode === 'copy' ? 'T b = a;' : 'T b = std::move(a);'}</small>
          </div>
          <OwnerCard
            name="b"
            role="destination"
            ptr={filled > 0 || ownerRight ? 'buf' : '∅'}
            hot={filled > 0 || ownerRight}
          />
        </div>

        <div className="cm-heap">
          <BufferStrip
            label={mode === 'copy' ? 'a.buf  (kept)' : ownerRight ? 'moved-from' : 'a.buf'}
            letters={srcShown}
            cellRefs={srcRefs}
            tone={mode === 'move' && drained > 0 ? 'empty' : 'source'}
            faded={moveDone}
          />
          <BufferStrip
            label={mode === 'copy' ? 'b.buf  (new allocation)' : 'b.buf  (stolen)'}
            letters={mode === 'copy' || ownerRight || filled > 0 ? dstShown : ['', '', '', '']}
            cellRefs={dstRefs}
            tone={mode === 'copy' ? 'copy' : 'move'}
            ghost={phase === 'idle' && mode === 'copy'}
            appearing={mode === 'copy' && (phase === 'running' || copyDone)}
          />
        </div>

        {flyers.map((f) => {
          if (f.t <= 0 || f.t >= 1) return null
          const p = hop(f.from, f.to, f.t)
          return (
            <span
              key={f.i}
              className={`cm-flyer cm-flyer--${mode}`}
              style={{ left: p.x, top: p.y }}
            >
              {f.letter}
            </span>
          )
        })}
      </div>

      <p className="layout-hint">
        {caption} In C++14 this is how <code>std::vector</code> / <code>std::string</code> copy
        vs move: new buffer + clone, or pointer steal.
      </p>
    </div>
  )
}

function OwnerCard({
  name,
  role,
  ptr,
  hot,
}: {
  name: string
  role: string
  ptr: string
  hot: boolean
}) {
  return (
    <div className={`cm-owner${hot ? ' cm-owner--hot' : ''}`}>
      <span className="ptr-kind">{role}</span>
      <span className="cm-owner-name">
        <code>T {name}</code>
      </span>
      <span className="cm-owner-ptr">
          ptr → <em>{ptr}</em>
      </span>
    </div>
  )
}

function BufferStrip({
  label,
  letters,
  cellRefs,
  tone,
  faded,
  ghost,
  appearing,
}: {
  label: string
  letters: readonly string[]
  cellRefs: MutableRefObject<(HTMLSpanElement | null)[]>
  tone: 'source' | 'copy' | 'move' | 'empty'
  faded?: boolean
  ghost?: boolean
  appearing?: boolean
}) {
  return (
    <div
      className={`cm-buf cm-buf--${tone}${faded ? ' cm-buf--faded' : ''}${ghost ? ' cm-buf--ghost' : ''}${appearing ? ' cm-buf--in' : ''}`}
    >
      <span className="buf-label">{label}</span>
      <div className="buf-cells">
        {letters.map((c, i) => (
          <span
            key={i}
            ref={(el) => {
              cellRefs.current[i] = el
            }}
            className={`buf-cell${c ? '' : ' buf-cell--empty'}${c ? ` buf-cell--${tone}` : ''}`}
          >
            {c || '∅'}
          </span>
        ))}
      </div>
    </div>
  )
}
