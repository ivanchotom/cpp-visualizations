import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'scalar' | 'array' | 'mismatch' | 'place'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'scalar', title: 'new T', sig: 'new T / delete' },
  { id: 'array', title: 'new T[n]', sig: 'new T[n] / delete[]' },
  { id: 'mismatch', title: 'mismatch', sig: 'new T[n] / delete' },
  { id: 'place', title: 'placement', sig: 'new (buf) T' },
]

const STEP_MS = 1300
const HOP_MS = 700
const CELLS = ['A', 'B', 'C'] as const

export function NewDeleteViz() {
  const [id, setId] = useState<Mode>('scalar')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [arrow, setArrow] = useState('')
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const allocated = i >= 1
  const live = i >= 1 && i < 3
  const cleaned = i >= 3
  const isArray = id === 'array' || id === 'mismatch'
  const mismatched = id === 'mismatch' && cleaned
  const placed = id === 'place'
  const heapOn = allocated && !(cleaned && id === 'scalar') && !(cleaned && id === 'array') && !(cleaned && id === 'place')
  const leftover = mismatched
  const ptrVal = !allocated ? 'unset' : cleaned && id !== 'mismatch' ? 'dangling' : '0xH0'

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) {
      setArrow('')
      return
    }
    const origin = stage.getBoundingClientRect()
    const a = edge(srcRef.current, origin, 'right')
    const b = edge(dstRef.current, origin, 'left')
    setFrom(a)
    setTo(b)
    if (live || leftover) setArrow(curve(a, b, 22))
    else setArrow('')
  }, [id, i, live, leftover])

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
  const pulseKind = mismatched ? 'throw' : id === 'place' ? 'r' : 'p'
  const flyerText = i === 1 ? (isArray ? 'new[]' : placed ? 'ctor' : 'new') : i === 3 ? (mismatched ? 'delete' : id === 'array' ? 'delete[]' : placed ? '~T()' : 'delete') : ''

  const visibleCells = isArray ? CELLS : (['T'] as const)
  const deadCells = mismatched ? ['B', 'C'] : []
  const goneNote =
    id === 'scalar' && cleaned
      ? 'deleted'
      : id === 'array' && cleaned
        ? 'delete[] · dtors reverse'
        : id === 'place' && cleaned
          ? 'storage remains'
          : leftover
            ? 'cookie ignored — UB'
            : ''

  const code =
    id === 'scalar'
      ? i === 0
        ? `T* p;  // not yet allocated`
        : i === 1 || i === 2
          ? `T* p = new T{7};  // allocate + construct`
          : `delete p;  // destroy, then deallocate`
      : id === 'array'
        ? i === 0
          ? `T* p;  // not yet allocated`
          : i === 1 || i === 2
            ? `T* p = new T[3];  // cookie + 3 objects`
            : `delete[] p;  // ~T on [2], [1], [0], then free`
        : id === 'mismatch'
          ? i < 3
            ? `T* p = new T[3];`
            : `delete p;  // not delete[]  ← UB`
          : i === 0
            ? `alignas(T) unsigned char buf[sizeof(T)];`
            : i < 3
              ? `T* p = new (buf) T{7};  // no allocation`
              : `p->~T();  // you destroy. do not delete`

  const caption =
    i === 0
      ? id === 'scalar'
        ? 'Play new. Allocation and construction are two steps. delete is destruction then deallocation. Prefer make_unique in app code.'
        : id === 'array'
          ? 'Play new T[n]. The implementation stores a count (a “cookie”) so delete[] can run every destructor.'
          : id === 'mismatch'
            ? 'Play the trap. new[] paired with scalar delete is undefined behavior — the cookie is not consulted.'
            : 'Play placement new. The buffer already exists. You construct in place, and you must call the destructor yourself.'
      : id === 'scalar' && i === 1
        ? 'Cyan hop: operator new then T’s constructor. p is just an address on the stack. The object lives on the heap.'
        : id === 'scalar' && i === 2
          ? 'Object is live. delete nullptr is safe; this p is not null. One new, one matching delete.'
          : id === 'scalar'
            ? '~T ran, then operator delete. p is a dangling pointer — do not use it. make_unique closes the leak window if an exception fires here.'
            : id === 'array' && i === 1
              ? 'Three objects plus a hidden count. new T[n] is not “new T, n times” in a way delete can see — only delete[] knows N.'
              : id === 'array' && i === 2
                ? 'All three are constructed. Destructors will run in reverse order of construction when you delete[].'
                : id === 'array'
                  ? 'delete[] walks [2], [1], [0], then frees the block. That reverse order matches how members die in a class.'
                  : id === 'mismatch' && i === 1
                    ? 'Same allocation as the array mode: three objects and a cookie. The type of p is still T*. The cookie is not in the type.'
                    : id === 'mismatch' && i === 2
                      ? 'Scalar delete does not read the cookie. It destroys as if there were one T. The other two are leaked or worse.'
                      : id === 'mismatch'
                        ? 'UB: wrong deallocator, skipped destructors. There is no “almost right.” Pair new with delete, new[] with delete[].'
                        : i === 1
                          ? 'Green hop into existing bytes. No heap block. The constructor runs at buf. This is how vector and optional build objects.'
                          : i === 2
                            ? 'The object is live inside the buffer. delete p would free stack memory — also UB. Storage and lifetime are separate.'
                            : 'p->~T() ends the lifetime. The buffer is still there. C++14 has no destroy_at; you call the destructor by name.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = mismatched ? 'nd-stage--ub' : id === 'place' ? 'nd-stage--place' : heapOn ? 'viz-stage--copy' : ''

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
          Play new
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage nd-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="nd-row">
          <div ref={srcRef} className={`own-card${allocated ? ' own-card--unique' : ''}${cleaned && !mismatched ? ' own-ctrl--ghost' : ''}`}>
            <span className="lf-tag">{placed ? 'stack buffer' : 'stack'}</span>
            <span className="own-name">p</span>
            <span className="mem-val">{ptrVal}</span>
            {placed && <span className="mem-note">alignas(T) buf</span>}
            {cleaned && id === 'scalar' && <span className="mem-note">do not use</span>}
          </div>
          <div
            ref={dstRef}
            className={`own-card${heapOn ? (placed ? ' own-card--weak' : ' own-card--shared') : ''}${leftover ? ' nd-card--ub' : ''}${cleaned && id === 'array' ? ' own-ctrl--ghost' : ''}`}
          >
            <span className="lf-tag">{placed ? 'lifetime in buf' : 'heap'}</span>
            {heapOn || leftover ? (
              <>
                <div className="ar-cells">
                  {(leftover ? CELLS : visibleCells).map((c) => (
                    <span key={c} className={`ar-cell${deadCells.includes(c) ? ' nd-cell--dead' : ''}`}>
                      {!isArray ? '7' : c}
                    </span>
                  ))}
                </div>
                <span className="ar-size">
                  {isArray ? (mismatched ? 'cookie unread' : 'N=3') : placed ? 'no operator new' : 'one T'}
                </span>
                {goneNote && <span className="mem-note">{goneNote}</span>}
              </>
            ) : cleaned && (id === 'scalar' || id === 'array' || id === 'place') ? (
              <>
                <span className="own-name">{id === 'place' ? 'buf' : 'freed'}</span>
                <span className="mem-val">{id === 'place' ? 'raw bytes' : '—'}</span>
                <span className="mem-note">{goneNote}</span>
              </>
            ) : (
              <span className="mem-val">no object</span>
            )}
          </div>
        </div>
        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="nd-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={mismatched ? '#f0883e' : placed ? '#7dce82' : '#3ee0ff'} />
              <stop offset="100%" stopColor={mismatched ? '#e06c75' : placed ? '#7dce82' : '#c678dd'} />
            </linearGradient>
            <marker id="nd-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={mismatched ? '#e06c75' : placed ? '#7dce82' : '#3ee0ff'} />
            </marker>
          </defs>
          {arrow && (
            <path
              d={arrow}
              className={`own-arc${mismatched ? ' lm-arc--dead' : placed ? ' own-arc--weak' : ''}`}
              fill="none"
              style={{ stroke: 'url(#nd-grad)' }}
              markerEnd="url(#nd-head)"
            />
          )}
        </svg>
        {pos && flyerText && (
          <span className={`ptr-pulse ptr-pulse--${pulseKind} nd-flyer`} style={{ left: pos.x, top: pos.y }}>
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
