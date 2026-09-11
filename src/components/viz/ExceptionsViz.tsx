import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

const FRAMES = [
  { id: 'main', fn: 'main()' },
  { id: 'run', fn: 'run()' },
  { id: 'openFile', fn: 'openFile()' },
  { id: 'parse', fn: 'parse()' },
] as const

type FrameId = (typeof FRAMES)[number]['id']

const STACK: FrameId[] = ['parse', 'openFile', 'run', 'main']

const STEPS = [
  {
    label: 'Normal call stack. Play throw and watch RAII unwind toward the catch. Frames die in place — nothing hops.',
    dead: [] as FrameId[],
    throwAt: null as FrameId | null,
    catchAt: false,
    dtor: null as string | null,
    pc: 'parse' as FrameId,
    code: `void run() {\n  try { openFile(); }\n  catch (const std::exception& e) {\n    log(e.what());\n  }\n}`,
  },
  {
    label: 'parse() throws. The exception object exists. No catch in this frame.',
    dead: [] as FrameId[],
    throwAt: 'parse' as FrameId | null,
    catchAt: false,
    dtor: null as string | null,
    pc: 'parse' as FrameId,
    code: `void parse() {\n  throw std::runtime_error("bad");\n}`,
  },
  {
    label: 'parse() is gone. Automatic locals were destroyed on the way out.',
    dead: ['parse'] as FrameId[],
    throwAt: 'openFile' as FrameId | null,
    catchAt: false,
    dtor: '~parse locals',
    pc: 'openFile' as FrameId,
    code: `void parse() {\n  throw std::runtime_error("bad");\n} // locals destroyed`,
  },
  {
    label: 'openFile() unwinds. ~fstream closes the file — that is why RAII exists.',
    dead: ['parse', 'openFile'] as FrameId[],
    throwAt: 'run' as FrameId | null,
    catchAt: false,
    dtor: '~fstream file',
    pc: 'run' as FrameId,
    code: `void openFile() {\n  std::fstream file("x");\n  parse();\n} // ~file closes`,
  },
  {
    label: 'run() caught it. parse and openFile already ran their destructors. The file is closed.',
    dead: ['parse', 'openFile'] as FrameId[],
    throwAt: null as FrameId | null,
    catchAt: true,
    dtor: null as string | null,
    pc: 'run' as FrameId,
    code: `} catch (const std::exception& e) {\n  log(e.what());\n}`,
  },
]

export function ExceptionsViz() {
  const { i, playing, play, reset, jump } = useBeats(STEPS.length)
  const step = STEPS[i]
  const dead = new Set(step.dead)
  const caught = step.catchAt
  const pcTop = 12 + STACK.indexOf(step.pc) * 56

  function noteFor(id: FrameId): string {
    if (id === 'openFile') return dead.has('openFile') ? '~fstream closed the file' : 'fstream file  (will close)'
    if (id === 'parse') {
      if (dead.has('parse')) return 'frame destroyed'
      if (i >= 1) return 'throw std::runtime_error'
      return 'locals alive'
    }
    if (id === 'run') return caught ? 'catch (const std::exception&)' : 'try { openFile(); }'
    return 'waiting'
  }

  const tone = caught ? 'ok' : step.throwAt ? 'trap' : 'idle'

  return (
    <SceneShell
      playing={playing}
      onPlay={play}
      onReset={reset}
      playLabel="Play throw → unwind"
      step={i}
      stepCount={STEPS.length}
      sig={caught ? 'caught' : step.throwAt ? 'in flight' : 'running'}
      caption={step.label}
      code={step.code}
      tone={tone}
      footer={
        <div className="stepper">
          <button className="chip" onClick={() => jump(i - 1)} disabled={playing || i === 0}>
            ◂ prev
          </button>
          <button className="chip" onClick={() => jump(i + 1)} disabled={playing || i === STEPS.length - 1}>
            next ▸
          </button>
        </div>
      }
    >
      <div className="fx-flow">
        <div className="fx-rail" />
        <div className="fx-pc" style={{ top: pcTop }} />
        {STACK.map((id) => {
          const f = FRAMES.find((x) => x.id === id)!
          const gone = dead.has(id)
          const isThrow = step.throwAt === id
          const isCatch = id === 'run' && caught
          const live = !gone
          return (
            <div
              key={id}
              className={`fx-node${live ? ' fx-node--live' : ' fx-node--skip'}${isThrow ? ' fx-node--on fx-slot--trap' : ''}${
                isCatch ? ' fx-node--done' : ''
              }`}
            >
              <span className="fx-kicker">{f.fn}</span>
              <span className="fx-note">{noteFor(id)}</span>
              {step.dtor && gone && id === (i === 2 ? 'parse' : 'openFile') && (
                <span className="fx-badge fx-badge--lock">{step.dtor}</span>
              )}
              {isCatch && <span className="fx-badge fx-badge--open">caught</span>}
              {isThrow && <span className="fx-badge fx-badge--lock">throw</span>}
            </div>
          )
        })}
      </div>
      <div
        className={`fx-verdict${i >= 1 ? ' fx-verdict--show' : ''} ${
          caught ? 'fx-verdict--ok' : step.throwAt ? 'fx-verdict--trap' : ''
        }`}
      >
        {caught
          ? 'caught in run() · file already closed'
          : i === 3
            ? '~fstream ran · file closed on the way out'
            : i === 2
              ? 'parse gone · locals destroyed'
              : i === 1
                ? 'throw std::runtime_error · no catch here'
                : ''}
      </div>
    </SceneShell>
  )
}
