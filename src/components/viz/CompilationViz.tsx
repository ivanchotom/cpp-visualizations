import { useState } from 'react'

const stages = [
  {
    id: 'pp',
    title: 'Preprocess',
    in: 'foo.cpp + headers',
    out: 'translation unit',
    body: 'Paste #includes, expand macros, drop #if’d-out code. The compiler has not started yet — this is still text.',
  },
  {
    id: 'cc',
    title: 'Compile',
    in: 'translation unit',
    out: 'assembly / IR',
    body: 'Parse, type-check, instantiate templates, optimize. Errors here are “doesn’t compile.” Each .cpp is a separate translation unit.',
  },
  {
    id: 'as',
    title: 'Assemble',
    in: 'assembly',
    out: 'foo.o object file',
    body: 'Machine code plus symbols: defined functions, undefined references the linker must fill in.',
  },
  {
    id: 'ld',
    title: 'Link',
    in: '*.o + libraries',
    out: 'executable / .so',
    body: 'Resolve symbols, merge sections, apply relocations. Duplicate or missing definitions show up here, not during compile.',
  },
] as const

export function CompilationViz() {
  const [id, setId] = useState<(typeof stages)[number]['id']>('pp')
  const stage = stages.find((s) => s.id === id) ?? stages[0]

  return (
    <div className="viz">
      <div className="pipeline">
        {stages.map((s, i) => (
          <div key={s.id} className="pipeline-step">
            <button
              className={`pipe-card${s.id === id ? ' pipe-card--active' : ''}`}
              onClick={() => setId(s.id)}
            >
              <span className="pipe-idx">{i + 1}</span>
              <span className="pipe-title">{s.title}</span>
              <span className="pipe-io">
                {s.in} → {s.out}
              </span>
            </button>
            {i < stages.length - 1 && <span className="pipe-arrow">→</span>}
          </div>
        ))}
      </div>
      <aside className="viz-detail">
        <h3>{stage.title}</h3>
        <p>{stage.body}</p>
      </aside>
    </div>
  )
}
