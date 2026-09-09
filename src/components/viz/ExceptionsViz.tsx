import { useState } from 'react'

const frames = ['main', 'run', 'openFile', 'parse'] as const

export function ExceptionsViz() {
  const [phase, setPhase] = useState(0)
  // 0: all alive, 1: throw in parse, 2: parse gone, 3: openFile gone, 4: caught in run

  const thrown = phase >= 1
  const gone = new Set<string>()
  if (phase >= 2) gone.add('parse')
  if (phase >= 3) gone.add('openFile')
  if (phase >= 4) gone.add('parse')

  const caught = phase >= 4

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip" onClick={() => setPhase(0)}>
          running
        </button>
        <button className="chip" onClick={() => setPhase(1)}>
          throw
        </button>
        <button className="chip" onClick={() => setPhase(2)}>
          unwind parse
        </button>
        <button className="chip" onClick={() => setPhase(3)}>
          unwind openFile
        </button>
        <button className="chip" onClick={() => setPhase(4)}>
          catch in run
        </button>
      </div>
      <div className="ex-stack">
        {frames.map((f) => {
          const dead = gone.has(f)
          const isThrow = f === 'parse' && thrown && !dead
          const isCatch = f === 'run' && caught
          return (
            <div
              key={f}
              className={`ex-frame${dead ? ' ex-frame--dead' : ''}${isThrow ? ' ex-frame--throw' : ''}${isCatch ? ' ex-frame--catch' : ''}`}
            >
              <span className="ex-fn">{f}()</span>
              <span className="ex-raii">
                {f === 'openFile' && !dead && 'fstream file  (will close)'}
                {f === 'parse' && !dead && (thrown ? 'throw std::runtime_error' : 'locals alive')}
                {f === 'run' && (caught ? 'catch (const std::exception&)' : 'try { … }')}
                {f === 'main' && 'waiting'}
              </span>
            </div>
          )
        })}
      </div>
      <p className="layout-hint">
        {caught
          ? 'run() caught it. parse and openFile already ran their destructors — the file is closed. That is RAII.'
          : thrown
            ? 'The exception is in flight. Each frame’s automatic objects are destroyed on the way out. No catch yet in parse.'
            : 'Normal call stack. Click throw, then step the unwind.'}
      </p>
    </div>
  )
}
