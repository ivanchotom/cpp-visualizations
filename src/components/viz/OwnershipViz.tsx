import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, hop, waitNextBeat, type Point } from './motion.ts'

type Kind = 'unique' | 'shared' | 'weak'

const UNIQUE_STEPS = [
  {
    owners: 0,
    heap: false,
    label: 'No owner yet. Play make_unique — exclusive ownership is one pointer, zero overhead.',
    code: `// not yet constructed`,
  },
  {
    owners: 1,
    heap: true,
    label: 'unique_ptr p owns the heap T. The leash is exclusive — you cannot copy it.',
    code: `auto p = std::make_unique<T>(42);`,
  },
  {
    owners: 0,
    heap: false,
    label: 'p left scope. Destructor ran delete. No leak, no leftover pointer.',
    code: `} // ~unique_ptr deletes T`,
  },
]

const SHARED_STEPS = [
  {
    owners: 1,
    use: 1,
    heap: true,
    label: 'One shared_ptr. The control block holds use_count = 1.',
    code: `auto p = std::make_shared<T>(42);`,
  },
  {
    owners: 2,
    use: 2,
    heap: true,
    label: 'Copy constructs another shared_ptr. use_count bumps to 2. Both own T.',
    code: `auto q = p;  // use_count == 2`,
  },
  {
    owners: 1,
    use: 1,
    heap: true,
    label: 'q dropped. Count falls to 1. T stays alive — last owner still holds it.',
    code: `q.reset();  // use_count == 1`,
  },
  {
    owners: 0,
    use: 0,
    heap: false,
    label: 'Last shared_ptr died. T is destroyed. That is the shared-ownership contract.',
    code: `p.reset();  // use_count == 0, ~T`,
  },
]

const WEAK_STEPS = [
  {
    owners: 1,
    weak: 1,
    heap: true,
    lockFail: false,
    label: 'shared_ptr keeps T alive. weak_ptr observes without bumping use_count.',
    code: `std::weak_ptr<T> w = p;  // use=1, weak=1`,
  },
  {
    owners: 0,
    weak: 1,
    heap: false,
    lockFail: false,
    label: 'Last shared_ptr dropped. T is gone even though the weak observer remains.',
    code: `p.reset();  // T destroyed, weak still here`,
  },
  {
    owners: 0,
    weak: 1,
    heap: false,
    lockFail: true,
    label: 'w.lock() returns an empty shared_ptr. The control block lives until weaks are gone too.',
    code: `auto locked = w.lock();  // empty`,
  },
]

const STEP_MS = 1400

export function OwnershipViz() {
  const [kind, setKind] = useState<Kind>('unique')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [arcs, setArcs] = useState<string[]>([])
  const [ownerPts, setOwnerPts] = useState<Point[]>([])
  const [heapPt, setHeapPt] = useState<Point | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const ownerRefs = useRef<(HTMLDivElement | null)[]>([])
  const heapRef = useRef<HTMLDivElement>(null)
  const ctrlRef = useRef<HTMLDivElement>(null)

  const unique = UNIQUE_STEPS[Math.min(i, UNIQUE_STEPS.length - 1)]
  const shared = SHARED_STEPS[Math.min(i, SHARED_STEPS.length - 1)]
  const weak = WEAK_STEPS[Math.min(i, WEAK_STEPS.length - 1)]

  const owners = kind === 'unique' ? unique.owners : kind === 'shared' ? shared.owners : weak.owners
  const heapOn = kind === 'unique' ? unique.heap : kind === 'shared' ? shared.heap : weak.heap
  const useCount = kind === 'unique' ? owners : kind === 'shared' ? shared.use : weak.owners
  const weakCount = kind === 'weak' ? weak.weak : 0
  const lockFail = kind === 'weak' && Boolean(weak.lockFail)
  const stepCount = kind === 'unique' ? UNIQUE_STEPS.length : kind === 'shared' ? SHARED_STEPS.length : WEAK_STEPS.length
  const caption = kind === 'unique' ? unique.label : kind === 'shared' ? shared.label : weak.label
  const code = kind === 'unique' ? unique.code : kind === 'shared' ? shared.code : weak.code

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) {
      setArcs([])
      setOwnerPts([])
      setHeapPt(null)
      return
    }
    const origin = stage.getBoundingClientRect()
    const next: string[] = []
    const pts: Point[] = []
    const target = kind === 'unique' ? heapRef.current : ctrlRef.current ?? heapRef.current
    for (let n = 0; n < owners; n++) {
      const el = ownerRefs.current[n]
      if (!el || !target) continue
      pts.push(edge(el, origin, 'right'))
      next.push(curve(edge(el, origin, 'right'), edge(target, origin, 'left'), 22))
    }
    if (kind !== 'unique' && ctrlRef.current && heapRef.current && heapOn) {
      next.push(curve(edge(ctrlRef.current, origin, 'right'), edge(heapRef.current, origin, 'left'), 18))
    }
    if (kind === 'weak' && !owners && weakCount && ctrlRef.current) {
      const el = ownerRefs.current[0]
      if (el) next.push(curve(edge(el, origin, 'right'), edge(ctrlRef.current, origin, 'left'), 18))
    }
    setArcs(next)
    setOwnerPts(pts)
    setHeapPt(heapRef.current ? edge(heapRef.current, origin, 'left') : null)
  }, [kind, i, owners, heapOn, weakCount])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / 700))
      if (now - hopBorn < 700) raf = requestAnimationFrame(hopLoop)
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

  function select(next: Kind) {
    setPlaying(false)
    setKind(next)
    setI(0)
    setHopT(1)
  }

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const copyFlyer =
    kind === 'shared' && i === 1 && ownerPts[0] && ownerPts[1] && hopT < 1
      ? hop(ownerPts[0], ownerPts[1], hopT)
      : null

  const deletePulse = !heapOn && i > 0 && hopT < 1 && heapPt ? hop(heapPt, { x: heapPt.x + 8, y: heapPt.y - 40 }, hopT) : null

  const playLabel =
    kind === 'unique' ? 'Play make_unique → delete' : kind === 'shared' ? 'Play copy → last drop' : 'Play drop → lock()'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className={`chip${kind === 'unique' ? ' chip--active' : ''}`} onClick={() => select('unique')} disabled={playing}>
          unique_ptr
        </button>
        <button className={`chip${kind === 'shared' ? ' chip--active' : ''}`} onClick={() => select('shared')} disabled={playing}>
          shared_ptr
        </button>
        <button className={`chip${kind === 'weak' ? ' chip--active' : ''}`} onClick={() => select('weak')} disabled={playing}>
          weak_ptr
        </button>
        <button className="chip chip--play" onClick={play} disabled={playing}>
          {playLabel}
        </button>
        <button className="chip chip--ghost" onClick={() => select(kind)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage own-stage viz-stage--live${kind === 'unique' ? ' own-stage--unique' : ''}${kind === 'shared' ? ' own-stage--shared' : ''}${kind === 'weak' ? ' own-stage--weak' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount}
          {kind !== 'unique' ? ` · use = ${useCount}${kind === 'weak' ? ` · weak = ${weakCount}` : ''}` : ''}
        </p>
        <div className="own-grid">
          <div className="own-col">
            <span className="sh-kicker">owners</span>
            {Array.from({ length: Math.max(owners, kind === 'weak' && weakCount ? 1 : 0) }, (_, n) => {
              const isWeakOnly = kind === 'weak' && owners === 0
              return (
                <div
                  key={`o${n}`}
                  ref={(el) => {
                    ownerRefs.current[n] = el
                  }}
                  className={`own-card${isWeakOnly ? ' own-card--weak' : kind === 'unique' ? ' own-card--unique' : ' own-card--shared'}`}
                >
                  <span className="lf-tag">{isWeakOnly ? 'weak_ptr' : kind === 'unique' ? 'unique_ptr' : 'shared_ptr'}</span>
                  <span className="own-name">{isWeakOnly ? 'w' : n === 0 ? 'p' : 'q'}</span>
                </div>
              )
            })}
            {owners === 0 && !(kind === 'weak' && weakCount) && <p className="mem-empty">no owners</p>}
          </div>

          {kind !== 'unique' && (
            <div className="own-col">
              <span className="sh-kicker">control block</span>
              <div ref={ctrlRef} className={`own-ctrl${heapOn ? ' own-ctrl--live' : ' own-ctrl--ghost'}`}>
                <span className="lf-tag">control</span>
                <span className="own-count">use = {useCount}</span>
                <span className="own-count own-count--weak">weak = {weakCount}</span>
              </div>
            </div>
          )}

          <div className="own-col">
            <span className="sh-kicker">heap</span>
            {heapOn ? (
              <div ref={heapRef} className={`own-heap${kind === 'unique' ? ' own-heap--unique' : ' own-heap--shared'}`}>
                <span className="lf-tag">T</span>
                <span className="sh-heap-val">42</span>
                <span className="mem-note">{kind === 'unique' ? 'exclusive' : 'shared object'}</span>
              </div>
            ) : (
              <div ref={heapRef} className="own-heap own-heap--gone">
                <span className="lf-tag">T</span>
                <span className="mem-val">{i === 0 ? 'not allocated' : 'destroyed'}</span>
              </div>
            )}
          </div>
        </div>

        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="own-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={kind === 'unique' ? '#3ee0ff' : '#c678dd'} />
              <stop offset="100%" stopColor={kind === 'weak' ? '#7dce82' : '#c678dd'} />
            </linearGradient>
            <marker id="own-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={kind === 'unique' ? '#3ee0ff' : '#c678dd'} />
            </marker>
          </defs>
          {arcs.map((d, n) => (
            <path
              key={n}
              d={d}
              className={`own-arc${kind === 'unique' ? ' own-arc--unique' : ''}${kind === 'weak' && !owners ? ' own-arc--weak' : ''}`}
              fill="none"
              markerEnd="url(#own-head)"
            />
          ))}
        </svg>
        {copyFlyer && <span className="ptr-pulse ptr-pulse--p" style={{ left: copyFlyer.x, top: copyFlyer.y }} />}
        {deletePulse && <span className="ptr-pulse ptr-pulse--throw" style={{ left: deletePulse.x, top: deletePulse.y }} />}
        {lockFail && <span className="own-lock-fail">lock() → empty</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
