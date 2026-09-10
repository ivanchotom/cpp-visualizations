import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { centerOf, hop, waitNextBeat, type Point } from './motion.ts'

type Arg = 'idle' | 'int' | 'double' | 'string'

interface Frame {
  arg: Arg
  trying: boolean
  winner: 'integral' | 'floating' | null
  hard: boolean
  hint: string
  code: string
}

const FRAMES: Frame[] = [
  {
    arg: 'idle',
    trying: false,
    winner: null,
    hard: false,
    hint: 'Two overloads. Substitution happens in the signature. A failure there drops the candidate quietly — that is SFINAE.',
    code: `template <typename T>
std::enable_if_t<std::is_integral<T>::value, const char*>
describe(T) { return "int"; }

template <typename T>
std::enable_if_t<std::is_floating_point<T>::value, const char*>
describe(T) { return "fp"; }`,
  },
  {
    arg: 'int',
    trying: true,
    winner: null,
    hard: false,
    hint: 'describe(42). The compiler substitutes T = int into both signatures.',
    code: `describe(42);  // T = int`,
  },
  {
    arg: 'int',
    trying: false,
    winner: 'integral',
    hard: false,
    hint: 'is_integral<int> is true → ::type exists. is_floating_point<int> fails in the signature and that overload vanishes.',
    code: `describe(42);  // picks the integral overload`,
  },
  {
    arg: 'double',
    trying: true,
    winner: null,
    hard: false,
    hint: 'describe(1.5). Fresh substitution: T = double into both signatures.',
    code: `describe(1.5);  // T = double`,
  },
  {
    arg: 'double',
    trying: false,
    winner: 'floating',
    hard: false,
    hint: 'The floating overload survives. The integral one is gone — its body is never instantiated.',
    code: `describe(1.5);  // picks the floating overload`,
  },
  {
    arg: 'string',
    trying: true,
    winner: null,
    hard: false,
    hint: 'describe(s) with T = string. Both enable_if conditions are false.',
    code: `std::string s{"hi"};
describe(s);  // T = string`,
  },
  {
    arg: 'string',
    trying: false,
    winner: null,
    hard: true,
    hint: 'Both substitutions fail. That is a hard error at the call site — SFINAE only helps when at least one candidate remains.',
    code: `describe(s);  // error: no matching function`,
  },
]

const STEP_MS = 1300
const HOP_MS = 680

export function SfinaeViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 40 })
  const [to, setTo] = useState<Point>({ x: 80, y: 160 })

  const stageRef = useRef<HTMLDivElement>(null)
  const callRef = useRef<HTMLDivElement>(null)
  const intRef = useRef<HTMLDivElement>(null)
  const fpRef = useRef<HTMLDivElement>(null)
  const errRef = useRef<HTMLSpanElement>(null)

  const f = FRAMES[Math.min(i, FRAMES.length - 1)]
  const hops = i === 2 || i === 4 || i === 6

  useLayoutEffect(() => {
    const stage = stageRef.current
    const src = callRef.current
    const dst = f.hard ? errRef.current : f.winner === 'floating' ? fpRef.current : intRef.current
    if (!stage || !src || !dst) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(src, origin))
    setTo(centerOf(dst, origin))
  }, [i, f.hard, f.winner])

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

  const pos = hops && hopT < 1 ? hop(from, to, hopT) : null
  const flyer = i === 2 ? '42' : i === 4 ? '1.5' : i === 6 ? 's' : null
  const callLabel = f.arg === 'int' ? 'describe(42)' : f.arg === 'double' ? 'describe(1.5)' : f.arg === 'string' ? 'describe(s)' : 'describe(?)'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play describe(42) then 1.5 then s
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

      <div ref={stageRef} className={`viz-stage sf-stage viz-stage--live${f.hard ? ' sf-stage--hard' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{FRAMES.length}
          {f.hard ? ' · hard error' : f.winner ? ' · survives' : f.trying ? ' · substituting' : ' · candidates'}
        </p>
        <div className="lf-beats" aria-hidden>
          {FRAMES.map((_, n) => (
            <span
              key={n}
              className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${n === FRAMES.length - 1 ? ' lf-beat--dtor' : ''}`}
            />
          ))}
        </div>
        <div ref={callRef} className={`sf-call${f.arg !== 'idle' ? ' sf-call--on' : ''}${f.hard ? ' sf-call--hard' : ''}`}>
          <span className="tpl-kicker">call</span>
          <code>{callLabel}</code>
        </div>
        <div className="sfinae-list">
          <div
            ref={intRef}
            className={`sfinae-card${f.trying ? ' sfinae-card--try' : ''}${f.winner === 'integral' ? ' sfinae-card--ok' : ''}${!f.trying && f.winner !== 'integral' && f.arg !== 'idle' ? ' sfinae-card--fail' : ''}`}
          >
            <span className="sfinae-tag">
              {f.winner === 'integral' ? 'survives' : f.trying ? 'substituting' : !f.trying && f.arg !== 'idle' ? 'SFINAE out' : 'candidate'}
            </span>
            <code>{`enable_if_t<is_integral<T>::value>`}</code>
            <p>
              {f.arg === 'int' && f.winner === 'integral'
                ? 'is_integral<int> is true → ::type exists. This overload is the winner.'
                : f.arg === 'double' && !f.trying
                  ? 'is_integral<double> is false → substitution fails. Quietly dropped.'
                  : f.arg === 'string' && !f.trying
                    ? 'is_integral<string> is false → dropped.'
                    : 'Waits for T. Failure here is not an error.'}
            </p>
          </div>
          <div
            ref={fpRef}
            className={`sfinae-card${f.trying ? ' sfinae-card--try' : ''}${f.winner === 'floating' ? ' sfinae-card--ok' : ''}${!f.trying && f.winner !== 'floating' && f.arg !== 'idle' ? ' sfinae-card--fail' : ''}`}
          >
            <span className="sfinae-tag">
              {f.winner === 'floating' ? 'survives' : f.trying ? 'substituting' : !f.trying && f.arg !== 'idle' ? 'SFINAE out' : 'candidate'}
            </span>
            <code>{`enable_if_t<is_floating_point<T>::value>`}</code>
            <p>
              {f.arg === 'double' && f.winner === 'floating'
                ? 'is_floating_point<double> is true. This overload is the winner.'
                : f.arg === 'int' && !f.trying
                  ? 'is_floating_point<int> is false → dropped.'
                  : f.arg === 'string' && !f.trying
                    ? 'is_floating_point<string> is false → dropped.'
                    : 'A second recipe. Only one should remain after substitution.'}
            </p>
          </div>
        </div>
        {pos && flyer && (
          <span className={`sf-flyer${f.hard ? ' sf-flyer--hard' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {flyer}
          </span>
        )}
        {f.hard && (
          <span ref={errRef} className="sf-hard">
            hard error
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
