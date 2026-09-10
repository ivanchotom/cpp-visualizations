import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'copy' | 'ref' | 'dangle' | 'init'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'copy', title: '[=] copy', sig: '[=]() mutable' },
  { id: 'ref', title: '[&] weld', sig: '[&]()' },
  { id: 'dangle', title: 'dangling [&]', sig: 'return [&]' },
  { id: 'init', title: 'init-capture', sig: '[p = std::move(p)]' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function LambdasViz() {
  const [id, setId] = useState<Mode>('copy')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [arrow, setArrow] = useState('')
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 320, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = id === 'dangle' ? 4 : 3
  const captured = i >= 1
  const ran = i >= 2
  const frameGone = id === 'dangle' && i >= 2
  const dangled = id === 'dangle' && i >= 3
  const stole = id === 'init' && i >= 1
  const welded = (id === 'ref' || id === 'dangle') && captured && !dangled
  const copied = id === 'copy' && captured
  const outerVal = id === 'ref' && ran ? 8 : id === 'init' ? (stole ? 'empty' : '7') : frameGone ? '☠' : 7
  const closureVal =
    id === 'init'
      ? stole
        ? 7
        : '—'
      : id === 'dangle'
        ? dangled
          ? 'UB'
          : captured
            ? 7
            : '—'
        : id === 'copy'
          ? captured
            ? ran
              ? 8
              : 7
            : '—'
          : captured
            ? ran
              ? 8
              : 7
            : '—'

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
    if (welded || (id === 'init' && stole) || copied) setArrow(curve(a, b, 22))
    else setArrow('')
  }, [id, i, welded, stole, copied])

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
  const pulseKind = id === 'copy' || id === 'init' ? 'p' : id === 'dangle' && dangled ? 'throw' : 'r'
  const flyerGlyph = id === 'init' ? '7' : id === 'copy' ? '7' : 'n'

  const code =
    id === 'copy'
      ? i === 0
        ? `int n = 7;\nauto f = [=]() mutable { ++n; };`
        : i === 1
          ? `auto f = [=]() mutable { ++n; };\n// f holds its own int n = 7`
          : `f();  // closure n is 8, outer n is still 7`
      : id === 'ref'
        ? i < 2
          ? `int n = 7;\nauto f = [&] { ++n; };`
          : `f();  // write-through: outer n is 8`
        : id === 'dangle'
          ? i === 0
            ? `auto make() {\n  int n = 7;\n  return [&] { return n; };\n}`
            : i === 1
              ? `return [&] { return n; };  // weld to stack n`
              : i === 2
                ? `}  // n is destroyed. The alias is leftover.`
                : `auto f = make();\nf();  // dangling reference — UB`
          : i === 0
            ? `auto p = std::make_unique<int>(7);\nauto f = [p = std::move(p)] {\n  return *p;\n};`
            : i === 1
              ? `auto f = [p = std::move(p)] { return *p; };\n// init-capture steals (C++14)`
              : `f();  // *p is 7. Original p is empty.`

  const caption =
    i === 0
      ? id === 'copy'
        ? 'Play the lambda. [=] copies what it names. Generic [](auto x) is a template operator() — also C++14.'
        : id === 'ref'
          ? 'Play [&]. The closure welds to the local. Same object, two names — until the local dies.'
          : id === 'dangle'
            ? 'Play make(). Returning [&] from a function is the classic dangling-capture trap.'
            : 'Play init-capture. [p = std::move(p)] is C++14: the member is initialized, not copy-captured.'
      : id === 'copy' && i === 1
        ? 'Cyan clone: the closure has its own n. Outer 7 stays put. Huge [=] copies whole containers — name what you need.'
        : id === 'copy'
          ? 'mutable lets operator() mutate the copy. Outer n is still 7. [](auto x) would stamp a new operator() per argument type.'
          : id === 'ref' && i === 1
            ? 'Green weld: no copy. The lambda is an alias for n. Cheap, and dangerous if you outlive n.'
            : id === 'ref'
              ? 'Write-through: ++n updates the local. Same object, two names — just like T&.'
              : id === 'dangle' && i === 1
                ? 'Green weld to stack n. Returning the lambda takes that alias out of the function.'
                : id === 'dangle' && i === 2
                  ? 'make() returned. The frame is gone. n is destroyed. The capture still points at that slot.'
                  : id === 'dangle'
                    ? 'f() reads a dead local. That is UB — not a stale copy, a hole in the stack. Capture by value, or a named [&n] you can audit.'
                    : i === 1
                      ? 'Magenta steal into the closure member. Original unique_ptr is empty. You cannot copy unique_ptr; you move it in.'
                      : 'f() reads *p. The unique_ptr lives as long as the closure. That is how you ship ownership into a callback in C++14.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind =
    id === 'copy'
      ? 'viz-stage--copy'
      : id === 'init'
        ? 'viz-stage--move'
        : dangled
          ? 'lm-stage--dead'
          : ''

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
          Play capture
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage lm-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="lm-row">
          <div
            ref={srcRef}
            className={`own-card${id === 'init' ? (stole ? ' own-ctrl--ghost' : ' own-card--unique') : welded ? ' pb-hot' : ''}${frameGone ? ' lm-frame--gone' : ''}`}
          >
            <span className="lf-tag">{id === 'dangle' ? 'make() frame' : id === 'init' ? 'unique_ptr' : 'local'}</span>
            <span className="own-name">{id === 'init' ? 'p' : 'n'}</span>
            <span className="mem-val">{outerVal}</span>
            {frameGone && <span className="mem-note">destroyed</span>}
            {id === 'init' && stole && <span className="mem-note">moved-from</span>}
          </div>
          <div
            ref={dstRef}
            className={`own-card lm-closure${copied ? ' own-card--unique' : welded ? ' own-card--weak' : stole ? ' own-card--unique' : ''}${dangled ? ' lm-closure--ub' : ''}${ran && id === 'copy' ? ' pb-hot' : ''}`}
          >
            <span className="lf-tag">closure f</span>
            <span className="own-name">{id === 'init' ? 'p' : id === 'copy' ? 'n' : '&n'}</span>
            <span className="mem-val">{closureVal}</span>
            {copied && <span className="mem-note">copied member</span>}
            {welded && <span className="mem-note">alias</span>}
            {stole && <span className="mem-note">init-capture</span>}
            {dangled && <span className="mem-note">dangling</span>}
          </div>
        </div>
        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="lm-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={id === 'copy' || id === 'init' ? '#3ee0ff' : dangled ? '#f0883e' : '#7dce82'} />
              <stop offset="100%" stopColor={id === 'init' ? '#ff7ab6' : dangled ? '#e06c75' : '#7dce82'} />
            </linearGradient>
            <marker id="lm-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path
                d="M0,0 L10,5 L0,10 z"
                fill={id === 'copy' ? '#3ee0ff' : id === 'init' ? '#ff7ab6' : dangled ? '#e06c75' : '#7dce82'}
              />
            </marker>
          </defs>
          {arrow && (
            <path
              d={arrow}
              className={`own-arc${copied || id === 'init' ? '' : dangled ? ' lm-arc--dead' : ' own-arc--weak'}`}
              fill="none"
              markerEnd="url(#lm-head)"
            />
          )}
        </svg>
        {pos && i === 1 && (
          <span
            className={`ptr-pulse ptr-pulse--${pulseKind} lm-flyer${id === 'init' ? ' lm-flyer--steal' : ''}`}
            style={{ left: pos.x, top: pos.y }}
          >
            {flyerGlyph}
          </span>
        )}
        {pos && ((id === 'ref' && i === 2) || (id === 'copy' && i === 2) || dangled) && (
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
