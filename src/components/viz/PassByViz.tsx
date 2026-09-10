import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'value' | 'cref' | 'ref' | 'ptr' | 'fwd'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'value', title: 'By value', sig: 'void f(T x)' },
  { id: 'cref', title: 'const T&', sig: 'void f(const T& x)' },
  { id: 'ref', title: 'T&', sig: 'void f(T& x)' },
  { id: 'ptr', title: 'T*', sig: 'void f(T* p)' },
  { id: 'fwd', title: 'U&&', sig: 'template<class U> void f(U&& x)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function PassByViz() {
  const [id, setId] = useState<Mode>('value')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [arrow, setArrow] = useState('')
  const [from, setFrom] = useState<Point>({ x: 80, y: 80 })
  const [to, setTo] = useState<Point>({ x: 280, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const callerRef = useRef<HTMLDivElement>(null)
  const calleeRef = useRef<HTMLDivElement>(null)

  const callerVal = id === 'ref' && i >= 2 ? 8 : 7
  const calleeVal =
    id === 'value' ? (i >= 1 ? (i >= 2 ? 8 : 7) : null) : id === 'ptr' && i < 1 ? null : i >= 1 ? callerVal : null
  const copied = id === 'value' && i >= 1
  const welded = (id === 'cref' || id === 'ref' || id === 'fwd') && i >= 1
  const pointed = id === 'ptr' && i >= 1
  const wrote = (id === 'value' || id === 'ref') && i >= 2
  const forwarded = id === 'fwd' && i >= 2

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !callerRef.current || !calleeRef.current) {
      setArrow('')
      return
    }
    const origin = stage.getBoundingClientRect()
    const a = edge(callerRef.current, origin, 'right')
    const b = edge(calleeRef.current, origin, 'left')
    setFrom(a)
    setTo(b)
    if (welded || pointed) setArrow(curve(a, b, 22))
    else setArrow('')
  }, [id, i, welded, pointed])

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
      if (i >= 2) {
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
  }, [playing, i])

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
  const pulseKind = id === 'value' ? 'p' : id === 'ref' || id === 'cref' || id === 'fwd' ? 'r' : 'p'

  const code =
    id === 'value'
      ? i === 0
        ? `void f(T x);          // not yet called`
        : i === 1
          ? `void f(T x);          // x is a distinct copy\nf(obj);`
          : `void f(T x) { ++x; } // caller still 7`
      : id === 'cref'
        ? `void f(const T& x);  // no copy, cannot write\nf(obj);`
        : id === 'ref'
          ? i < 2
            ? `void f(T& x);        // alias, not a copy\nf(obj);`
            : `void f(T& x) { ++x; } // write-through`
          : id === 'ptr'
            ? `void f(T* p);        // nullable, reseatable\nf(&obj);`
            : i < 2
              ? `template<class U>\nvoid f(U&& x);       // deduced, not rvalue-only`
              : `g(std::forward<U>(x)); // preserve category`

  const caption =
    i === 0
      ? 'Play f(obj). The arrow you get is the whole lesson: copy, weld, address, or forward.'
      : id === 'value' && i === 1
        ? 'Cyan copy: x is a new object. The caller’s 7 stays put.'
        : id === 'value'
          ? '++x mutates only the copy. That is why cheap types pass by value, and big types usually do not.'
          : id === 'cref' && i === 1
            ? 'Green weld: same object, read-only. Temporaries can bind here.'
            : id === 'cref'
              ? 'Callee cannot write. The alias is const. No pulse of mutation, ever.'
              : id === 'ref' && i === 1
                ? 'Green weld again, but mutable. The signature says in-out at the call site: f(obj).'
                : id === 'ref'
                  ? 'Write-through: ++x updates the caller. Same object, two names.'
                  : id === 'ptr' && i === 1
                    ? 'Cyan dashed address. p may be null. You can reseat it; a reference cannot.'
                    : id === 'ptr'
                      ? 'Prefer T* when null is meaningful. C++14 has no optional<T&> — pointer is the idiom.'
                      : i === 1
                        ? 'U&& in a deduced template binds to lvalues and rvalues. It is a forwarding reference, not “rvalue only.”'
                        : 'std::forward<U>(x) restores the original category so the next call can move or copy correctly.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]

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
          Play f(obj)
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage pb-stage viz-stage--live${id === 'value' ? ' pb-stage--copy' : ''}${welded ? ' pb-stage--weld' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/3 · <code>{m.sig}</code>
        </p>
        <div className="pb-row">
          <div ref={callerRef} className={`own-card own-card--unique${wrote && id === 'ref' ? ' pb-hot' : ''}`}>
            <span className="lf-tag">caller</span>
            <span className="own-name">obj</span>
            <span className="mem-val">{callerVal}</span>
          </div>
          <div
            ref={calleeRef}
            className={`own-card${copied ? ' own-card--unique' : welded ? ' own-card--weak' : pointed ? ' own-card--shared' : ''}${wrote && id === 'value' ? ' pb-hot' : ''}${forwarded ? ' pb-fwd' : ''}`}
          >
            <span className="lf-tag">callee</span>
            <span className="own-name">{id === 'ptr' ? 'p' : 'x'}</span>
            <span className="mem-val">
              {calleeVal === null ? (id === 'ptr' && i === 0 ? 'unset' : '—') : calleeVal}
            </span>
            {id === 'cref' && i >= 1 && <span className="mem-note">const alias</span>}
            {id === 'fwd' && i >= 1 && <span className="mem-note">{forwarded ? 'forwarded' : 'bound U&&'}</span>}
          </div>
        </div>
        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="pb-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={id === 'value' || id === 'ptr' ? '#3ee0ff' : '#7dce82'} />
              <stop offset="100%" stopColor={id === 'fwd' ? '#c678dd' : '#7dce82'} />
            </linearGradient>
            <marker id="pb-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={id === 'value' || id === 'ptr' ? '#3ee0ff' : '#7dce82'} />
            </marker>
          </defs>
          {arrow && (
            <path
              d={arrow}
              className={`own-arc${pointed ? '' : ' own-arc--weak'}`}
              fill="none"
              markerEnd="url(#pb-head)"
            />
          )}
        </svg>
        {pos && i === 1 && <span className={`ptr-pulse ptr-pulse--${pulseKind}`} style={{ left: pos.x, top: pos.y }} />}
        {pos && i === 2 && (id === 'ref' || id === 'fwd') && (
          <span className={`ptr-pulse ptr-pulse--${pulseKind}`} style={{ left: pos.x, top: pos.y }} />
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
