import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'fold' | 'runtime'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'fold', title: 'constexpr call', sig: 'pow2(3) → 8' },
  { id: 'runtime', title: 'runtime x', sig: 'pow2(x)' },
]

const STEP_MS = 1200
const HOP_MS = 700
const DOUBLES = [1, 2, 4, 8] as const

export function ConstexprViz() {
  const [id, setId] = useState<Mode>('fold')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 5
  const looping = i >= 1 && i <= 3
  const r = i === 0 ? null : DOUBLES[Math.min(i - 1, DOUBLES.length - 1)]
  const baked = id === 'fold' && i >= 4
  const ran = id === 'runtime' && i >= 4

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    setFrom({ x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 })
    setTo({ x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 })
  }, [id, i])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stopBeat = waitNextBeat(STEP_MS, () => {
      if (i >= stepCount - 1) {
        setPlaying(false)
        setHopT(1)
        return
      }
      setI(i + 1)
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stopBeat()
    }
  }, [playing, i, stepCount])

  function select(next: Mode) {
    setPlaying(false)
    setId(next)
    setI(0)
    setHopT(1)
  }

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = hopT < 1 && i >= 1 ? hop(from, to, hopT) : null
  const flyerText = i === 0 ? '' : i === 1 ? 'r = 1' : i < 4 ? `×2 → ${DOUBLES[i - 1]}` : '8'

  const code =
    id === 'fold'
      ? i === 0
        ? `constexpr int pow2(int n) {
  int r = 1;
  for (int i = 0; i < n; ++i) r *= 2;
  return r;
}`
        : i < 4
          ? `constexpr int table_size = pow2(3);
// compiler is evaluating the loop
// r = ${r}`
          : `constexpr int table_size = pow2(3);  // 8
int a[table_size];  // bound is a constant`
      : i === 0
        ? `constexpr int pow2(int n) { /* same */ }
int x = /* runtime */;`
        : i < 4
          ? `int k = pow2(x);  // x is not a constant
// the loop actually runs`
          : `int k = pow2(x);  // 8, at run time
// not usable as an array bound`

  const caption =
    i === 0
      ? id === 'fold'
        ? 'Play pow2(3) as a constant. C++14 constexpr may loop and mutate locals. The compiler can finish the work.'
        : 'Play pow2(x) with a runtime x. The same function is then just a normal function. constexpr is not consteval (C++20).'
      : id === 'fold' && looping
        ? `Compile-time loop: r is ${r}. Locals may mutate inside constexpr in C++14. No I/O, no heap, no try.`
        : id === 'fold'
          ? '8 is baked. table_size can be an array bound, a case label, a template argument. The loop never runs on the CPU.'
          : looping
            ? `Runtime loop: r is ${r}. The compiler could not fold it because x is not a constant expression.`
            : 'k holds 8 after the call. You cannot write int a[k] unless k itself is a constant. Marking pow2 constexpr does not force compile time.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const filled = r === null ? 0 : DOUBLES.filter((n) => n <= r).length

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {MODES.map((x) => (
          <button
            key={x.id}
            className={`chip${id === x.id ? ' chip--active' : ''}`}
            onClick={() => select(x.id)}
            disabled={playing}
          >
            {x.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play pow2
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage cx-stage viz-stage--live${id === 'fold' ? ' cx-stage--fold' : ' cx-stage--run'}${baked ? ' cx-stage--baked' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="cx-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? (id === 'fold' ? ' cx-card--gold' : ' own-card--shared') : ''}`}>
            <span className="lf-tag">{id === 'fold' ? 'compiler' : 'CPU'}</span>
            <span className="own-name">pow2(3)</span>
            <span className="mem-val">{r === null ? 'idle' : `r = ${r}`}</span>
            <div className="cx-track">
              {DOUBLES.map((n, idx) => (
                <span key={n} className={`cx-dot${idx < filled ? (id === 'fold' ? ' cx-dot--gold' : ' cx-dot--run') : ''}`}>
                  {n}
                </span>
              ))}
            </div>
            <span className="mem-note">{id === 'fold' ? 'constant expression' : 'x is not const'}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${baked ? ' cx-card--gold' : ran ? ' own-card--unique' : ''}`}
          >
            <span className="lf-tag">{id === 'fold' ? 'constexpr slot' : 'stack'}</span>
            <span className="own-name">{id === 'fold' ? 'table_size' : 'k'}</span>
            <span className="mem-val">{baked || ran ? '8' : '—'}</span>
            <span className="mem-note">
              {baked ? 'array bound OK' : ran ? 'not a constant' : id === 'fold' ? 'needs a constant' : 'waiting'}
            </span>
          </div>
        </div>
        {pos && i >= 1 && (
          <span className={`ptr-pulse cx-flyer${id === 'fold' ? ' cx-flyer--gold' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {flyerText}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
