import { useState } from 'react'

const happy = [
  { t: 'Base()', label: 'construct Base subobject' },
  { t: 'm1()', label: 'construct member m1 (declaration order)' },
  { t: 'm2()', label: 'construct member m2' },
  { t: 'Derived() body', label: 'run Derived constructor body' },
  { t: '~Derived() body', label: 'run Derived destructor body' },
  { t: '~m2()', label: 'destroy m2 (reverse of construction)' },
  { t: '~m1()', label: 'destroy m1' },
  { t: '~Base()', label: 'destroy Base' },
] as const

const boom = [
  { t: 'Base()', label: 'construct Base' },
  { t: 'm1()', label: 'construct m1' },
  { t: 'm2() throws', label: 'm2 constructor throws — m2 never existed' },
  { t: '~m1()', label: 'unwind destroys m1' },
  { t: '~Base()', label: 'unwind destroys Base. Derived never lived.' },
] as const

export function LifetimeViz() {
  const [mode, setMode] = useState<'happy' | 'throw'>('happy')
  const [i, setI] = useState(0)
  const steps = mode === 'happy' ? happy : boom
  const n = Math.min(i, steps.length - 1)

  const base = mode === 'happy' ? n < 7 : n < 4
  const m1 = mode === 'happy' ? n >= 1 && n < 6 : n >= 1 && n < 3
  const m2 = mode === 'happy' ? n >= 2 && n < 5 : false
  const body = mode === 'happy' && (n === 3 || n === 4)
  const constructing = mode === 'happy' ? n < 4 : n < 2

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button
          className={`chip${mode === 'happy' ? ' chip--active' : ''}`}
          onClick={() => {
            setMode('happy')
            setI(0)
          }}
        >
          Happy path
        </button>
        <button
          className={`chip${mode === 'throw' ? ' chip--active' : ''}`}
          onClick={() => {
            setMode('throw')
            setI(0)
          }}
        >
          m2 throws
        </button>
        <button className="chip" onClick={() => setI((x) => Math.max(0, x - 1))}>
          ◂ prev
        </button>
        <button className="chip chip--active">
          step {n + 1} / {steps.length}
        </button>
        <button className="chip" onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))}>
          next ▸
        </button>
      </div>
      <div className="life-layout">
        <div className={`life-block life-base${base ? ' life-block--on' : ''}`}>Base</div>
        <div className="life-members">
          <div className={`life-block${m1 ? ' life-block--on' : ''}`}>m1</div>
          <div className={`life-block${m2 ? ' life-block--on' : ''}${mode === 'throw' && n >= 2 ? ' life-block--boom' : ''}`}>
            m2{mode === 'throw' && n >= 2 ? ' ✕' : ''}
          </div>
        </div>
        <div className={`life-block life-body${body ? ' life-block--on' : ''}`}>
          Derived body {constructing ? '(ctor)' : mode === 'happy' ? '(dtor)' : '(never)'}
        </div>
      </div>
      <p className="layout-hint">
        <strong>{steps[n].t}</strong> — {steps[n].label}
      </p>
    </div>
  )
}
