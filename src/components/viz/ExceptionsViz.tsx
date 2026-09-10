import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

const FRAMES = [
  { id: 'main', fn: 'main()', live: 'waiting' },
  { id: 'run', fn: 'run()', raii: 'try { openFile(); }' },
  { id: 'openFile', fn: 'openFile()', raii: 'fstream file' },
  { id: 'parse', fn: 'parse()', raii: 'locals alive' },
] as const

type FrameId = (typeof FRAMES)[number]['id']

const STEPS = [
  {
    label: 'Normal call stack. Play throw and watch RAII unwind toward the catch.',
    dead: [] as FrameId[],
    throwAt: null as FrameId | null,
    catchAt: false,
    dtor: null as string | null,
    code: `void run() {
  try { openFile(); }
  catch (const std::exception& e) {
    log(e.what());
  }
}`,
  },
  {
    label: 'parse() throws. The exception object is in flight — no catch in this frame.',
    dead: [] as FrameId[],
    throwAt: 'parse' as FrameId | null,
    catchAt: false,
    dtor: null as string | null,
    code: `void parse() {
  throw std::runtime_error("bad");
}`,
  },
  {
    label: 'parse() is gone. Automatic locals were destroyed on the way out.',
    dead: ['parse'] as FrameId[],
    throwAt: 'openFile' as FrameId | null,
    catchAt: false,
    dtor: '~parse locals',
    code: `void parse() {
  throw std::runtime_error("bad");
} // locals destroyed`,
  },
  {
    label: 'openFile() unwinds. ~fstream closes the file — that is why RAII exists.',
    dead: ['parse', 'openFile'] as FrameId[],
    throwAt: 'run' as FrameId | null,
    catchAt: false,
    dtor: '~fstream file',
    code: `void openFile() {
  std::fstream file("x");
  parse();
} // ~file closes`,
  },
  {
    label: 'run() caught it. parse and openFile already ran their destructors. The file is closed.',
    dead: ['parse', 'openFile'] as FrameId[],
    throwAt: null as FrameId | null,
    catchAt: true,
    dtor: null as string | null,
    code: `} catch (const std::exception& e) {
  log(e.what());
}`,
  },
]

const STEP_MS = 1300
const HOP_MS = 620

export function ExceptionsViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [centers, setCenters] = useState<Point[]>([])

  const stageRef = useRef<HTMLDivElement>(null)
  const frameRefs = useRef<(HTMLDivElement | null)[]>([])

  const step = STEPS[Math.min(i, STEPS.length - 1)]
  const dead = new Set(step.dead)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) {
      setCenters([])
      return
    }
    const origin = stage.getBoundingClientRect()
    setCenters(
      FRAMES.map((_, idx) => {
        const el = frameRefs.current[idx]
        if (!el) return { x: 40, y: 40 }
        const r = el.getBoundingClientRect()
        return {
          x: r.left - origin.left + r.width * 0.82,
          y: r.top - origin.top + r.height / 2,
        }
      }),
    )
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
    const stopBeat = waitNextBeat(STEP_MS, () => {
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
      stopBeat()
    }
  }, [playing, i])

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const fromIdx = i <= 1 ? 3 : i === 2 ? 3 : i === 3 ? 2 : 1
  const toIdx = i <= 1 ? 3 : i === 2 ? 2 : i === 3 ? 1 : 1
  const from = centers[fromIdx]
  const to = centers[toIdx]
  const showBall = i >= 1 && i < 4
  const pos = showBall && from && to ? hop(from, to, i === 1 ? 1 : hopT) : null
  const caught = step.catchAt

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play throw → unwind
        </button>
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={playing}>
          ◂ prev
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))} disabled={playing}>
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

      <div ref={stageRef} className={`viz-stage ex-stage viz-stage--live${caught ? ' ex-stage--caught' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{STEPS.length}
          {step.throwAt ? ' · exception in flight' : caught ? ' · caught' : ' · running'}
        </p>
        <div className="lf-beats" aria-hidden>
          {STEPS.map((s, n) => (
            <span key={s.label} className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${n >= 1 && n < 4 ? ' lf-beat--dtor' : ''}`} />
          ))}
        </div>
        <div className="ex-stack">
          {FRAMES.map((f, idx) => {
            const gone = dead.has(f.id)
            const isThrow = step.throwAt === f.id
            const isCatch = f.id === 'run' && caught
            const raii =
              f.id === 'openFile'
                ? gone
                  ? '~fstream closed the file'
                  : 'fstream file  (will close)'
                : f.id === 'parse'
                  ? gone
                    ? 'frame destroyed'
                    : i >= 1
                      ? 'throw std::runtime_error'
                      : f.raii
                  : f.id === 'run'
                    ? caught
                      ? 'catch (const std::exception&)'
                      : f.raii
                    : f.live
            return (
              <div
                key={f.id}
                ref={(el) => {
                  frameRefs.current[idx] = el
                }}
                className={`ex-frame${gone ? ' ex-frame--dead' : ''}${isThrow ? ' ex-frame--throw' : ''}${isCatch ? ' ex-frame--catch' : ''}`}
              >
                <span className="ex-fn">{f.fn}</span>
                <span className="ex-raii">{raii}</span>
                {step.dtor && gone && f.id === (i === 2 ? 'parse' : 'openFile') && (
                  <span className="ex-dtor">{step.dtor}</span>
                )}
              </div>
            )
          })}
        </div>
        {pos && (
          <span className="ptr-pulse ptr-pulse--throw" style={{ left: pos.x, top: pos.y }}>
            <span className="ex-ball-label">ex</span>
          </span>
        )}
        {caught && <span className="ex-caught-flag">caught</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{step.code}</code>
      </pre>
      <p className="layout-hint">{step.label}</p>
    </div>
  )
}
