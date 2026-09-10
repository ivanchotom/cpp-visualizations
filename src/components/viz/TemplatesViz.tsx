import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { centerOf, hop, waitNextBeat, type Point } from './motion.ts'

const STEPS = [
  {
    title: 'Recipe',
    stamp: null as 'int' | 'double' | 'both' | null,
    body: 'A function template is not a function. It is a recipe the compiler copies for each set of arguments it actually sees.',
    code: `template <typename T>
T twice(T x) {
  return x + x;
}`,
  },
  {
    title: 'twice(21)',
    stamp: 'int' as const,
    body: 'Deduction: T = int. The compiler stamps out a real function int twice(int). That copy is what the linker sees.',
    code: `twice(21);  // T = int`,
  },
  {
    title: 'twice(2.5)',
    stamp: 'both' as const,
    body: 'A second instantiation: T = double. twice<int> stays in the binary — they are different functions.',
    code: `twice(2.5);  // T = double`,
  },
  {
    title: 'Binary',
    stamp: 'both' as const,
    body: 'Two copies now live in the program. Unused T’s are never generated — that is why templates belong in headers.',
    code: `// twice<int> and twice<double>
// both exist in the binary`,
  },
]

const STEP_MS = 1400
const HOP_MS = 720

export function TemplatesViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 80 })
  const [to, setTo] = useState<Point>({ x: 320, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const recipeRef = useRef<HTMLDivElement>(null)
  const intRef = useRef<HTMLDivElement>(null)
  const dblRef = useRef<HTMLDivElement>(null)

  const step = STEPS[Math.min(i, STEPS.length - 1)]
  const hasInt = step.stamp === 'int' || step.stamp === 'both'
  const hasDouble = step.stamp === 'double' || step.stamp === 'both'
  const stamping = i === 1 || i === 2

  useLayoutEffect(() => {
    const stage = stageRef.current
    const dst = i === 2 ? dblRef.current : intRef.current
    if (!stage || !recipeRef.current || !dst) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(recipeRef.current, origin))
    setTo(centerOf(dst, origin))
  }, [i])

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
      if (i >= STEPS.length - 1) {
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

  const pos = hopT < 1 && stamping ? hop(from, to, hopT) : null

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play twice(21) then twice(2.5)
        </button>
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={playing || i === 0}>
          ◂ prev
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))} disabled={playing || i === STEPS.length - 1}>
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

      <div ref={stageRef} className={`viz-stage tpl-stage viz-stage--live${i === 3 ? ' tpl-stage--binary' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{STEPS.length} · {step.title}
        </p>
        <div className="lf-beats" aria-hidden>
          {STEPS.map((_, n) => (
            <span key={n} className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}`} />
          ))}
        </div>
        <div className="tpl-calls">
          <span className={`tpl-call${i >= 1 ? ' tpl-call--on' : ''}`}>twice(21)</span>
          <span className={`tpl-call${i >= 2 ? ' tpl-call--on tpl-call--dbl' : ''}`}>twice(2.5)</span>
        </div>
        <div className="tpl-board">
          <div ref={recipeRef} className="tpl-card tpl-card--recipe">
            <span className="tpl-kicker">template</span>
            <pre>{`template <typename T>
T twice(T x) {
  return x + x;
}`}</pre>
          </div>
          <span className="pipe-arrow">stamp →</span>
          <div className="tpl-stamps">
            <div ref={intRef} className={`tpl-card${hasInt ? ' tpl-card--on' : ''}${i === 1 ? ' tpl-card--fresh' : ''}`}>
              <span className="tpl-kicker">T = int</span>
              <pre>
                {hasInt
                  ? `int twice(int x) {
  return x + x;
}`
                  : 'not generated yet'}
              </pre>
            </div>
            <div ref={dblRef} className={`tpl-card${hasDouble ? ' tpl-card--on tpl-card--dbl' : ''}${i === 2 ? ' tpl-card--fresh' : ''}`}>
              <span className="tpl-kicker">T = double</span>
              <pre>
                {hasDouble
                  ? `double twice(double x) {
  return x + x;
}`
                  : 'not generated yet'}
              </pre>
            </div>
          </div>
        </div>
        {pos && (
          <span className={`tpl-flyer${i === 2 ? ' tpl-flyer--dbl' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {i === 2 ? 'T=double' : 'T=int'}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{step.code}</code>
      </pre>
      <p className="layout-hint">{step.body}</p>
    </div>
  )
}
