import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { centerOf, hop, waitNextBeat, type Point } from './motion.ts'

interface Frame {
  call: 'x' | 'lit' | 'move' | null
  t: string
  collapsed: string
  forward: string
  steal: boolean
  hopTo: 'param' | 'sink' | null
  hint: string
  code: string
}

const FRAMES: Frame[] = [
  {
    call: null,
    t: '?',
    collapsed: 'T&&',
    forward: 'std::forward<T>(t)',
    steal: false,
    hopTo: null,
    hint: 'A deduced T&& is a forwarding reference. It is not “rvalue only.” Play wrap to see collapsing, then forward.',
    code: `template <typename T>
void wrap(T&& t) {
  sink(std::forward<T>(t));
}`,
  },
  {
    call: 'x',
    t: 'int&',
    collapsed: 'int&',
    forward: 'static_cast<int&>(t)',
    steal: false,
    hopTo: 'param',
    hint: 'wrap(x) with x an lvalue. T is deduced as int&. T&& collapses: int& && → int&.',
    code: `wrap(x);  // T = int&`,
  },
  {
    call: 'x',
    t: 'int&',
    collapsed: 'int&',
    forward: 'static_cast<int&>(t)',
    steal: false,
    hopTo: 'sink',
    hint: 't is a named parameter, so it is an lvalue. std::forward<int&>(t) is an lvalue cast — sink does not steal.',
    code: `sink(std::forward<T>(t));  // lvalue`,
  },
  {
    call: 'lit',
    t: 'int',
    collapsed: 'int&&',
    forward: 'static_cast<int&&>(t)',
    steal: true,
    hopTo: 'param',
    hint: 'wrap(42). T is int. T&& is int&&. The parameter still has a name — without forward it would copy.',
    code: `wrap(42);  // T = int`,
  },
  {
    call: 'lit',
    t: 'int',
    collapsed: 'int&&',
    forward: 'static_cast<int&&>(t)',
    steal: true,
    hopTo: 'sink',
    hint: 'std::forward<int>(t) is static_cast<int&&>(t). sink may steal. That is why wrappers must forward, not move.',
    code: `sink(std::forward<T>(t));  // rvalue`,
  },
  {
    call: 'move',
    t: 'int',
    collapsed: 'int&&',
    forward: 'static_cast<int&&>(t)',
    steal: true,
    hopTo: 'param',
    hint: 'wrap(std::move(x)) is an xvalue. Deduction matches the prvalue case: T = int, parameter int&&.',
    code: `wrap(std::move(x));  // T = int`,
  },
  {
    call: 'move',
    t: 'int',
    collapsed: 'int&&',
    forward: 'static_cast<int&&>(t)',
    steal: true,
    hopTo: 'sink',
    hint: 'Forward again so the callee can steal. std::move(t) would also steal — even if the caller had passed an lvalue.',
    code: `sink(std::forward<T>(t));  // xvalue, steal`,
  },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ForwardingViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 80 })
  const [to, setTo] = useState<Point>({ x: 280, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const argRef = useRef<HTMLDivElement>(null)
  const paramRef = useRef<HTMLDivElement>(null)
  const sinkRef = useRef<HTMLDivElement>(null)

  const f = FRAMES[Math.min(i, FRAMES.length - 1)]
  const flying = f.hopTo !== null && hopT < 1

  useLayoutEffect(() => {
    const stage = stageRef.current
    const src = f.hopTo === 'sink' ? paramRef.current : argRef.current
    const dst = f.hopTo === 'sink' ? sinkRef.current : paramRef.current
    if (!stage || !src || !dst) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(src, origin))
    setTo(centerOf(dst, origin))
  }, [i, f.hopTo])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stop = waitNextBeat(STEP_MS, () => {
      if (i >= FRAMES.length - 1) {
        setPlaying(false)
        setHopT(1)
        return
      }
      setI(i + 1)
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stop()
    }
  }, [playing, i])

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = flying ? hop(from, to, hopT) : null
  const argLabel = f.call === 'x' ? 'x' : f.call === 'lit' ? '42' : f.call === 'move' ? 'std::move(x)' : 'arg'
  const title =
    f.call === 'x' ? 'wrap(x)' : f.call === 'lit' ? 'wrap(42)' : f.call === 'move' ? 'wrap(std::move(x))' : 'Recipe'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play wrap(x) then 42 then move
        </button>
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={playing || i === 0}>
          ◂ prev
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(FRAMES.length - 1, n + 1))} disabled={playing || i === FRAMES.length - 1}>
          next ▸
        </button>
        <button
          className="chip chip--ghost"
          onClick={() => {
            setPlaying(false)
            setI(0)
            setHopT(1)
          }}
        >
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage fwd-stage viz-stage--live${f.steal ? ' fwd-stage--steal' : ''}${f.call === 'x' ? ' fwd-stage--lval' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{FRAMES.length} · {title}
        </p>
        <div className="lf-beats" aria-hidden>
          {FRAMES.map((_, n) => (
            <span key={n} className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}`} />
          ))}
        </div>
        <div className="fwd-row">
          <div ref={argRef} className={`own-card${f.call ? ' own-card--unique' : ''}${f.steal ? ' pb-fwd' : ''}`}>
            <span className="lf-tag">call</span>
            <span className="own-name">{argLabel}</span>
            <span className="mem-note">{f.call === 'x' ? 'lvalue' : f.call === 'lit' ? 'prvalue' : f.call === 'move' ? 'xvalue' : 'not yet'}</span>
          </div>
          <div ref={paramRef} className={`own-card${f.call ? ' own-card--weak' : ''}${f.steal && f.hopTo === 'sink' ? ' pb-fwd' : ''}`}>
            <span className="lf-tag">T&& t</span>
            <span className="fwd-collapse">
              <code>T = {f.t}</code>
              <span className="pipe-arrow">collapses</span>
              <code>{f.collapsed}</code>
            </span>
            <span className="mem-note">named → still an lvalue</span>
          </div>
          <div ref={sinkRef} className={`own-card${f.hopTo === 'sink' ? ' own-card--shared' : ''}`}>
            <span className="lf-tag">sink</span>
            <span className="own-name">sink(…)</span>
            <span className="mem-note">{f.hopTo === 'sink' ? f.forward : 'waiting'}</span>
          </div>
        </div>
        {pos && (
          <span className={`fwd-flyer${f.steal ? ' fwd-flyer--steal' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {f.steal ? '&&' : '&'}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{f.code}</code>
      </pre>
      <p className="layout-hint">{f.hint}</p>
    </div>
  )
}
