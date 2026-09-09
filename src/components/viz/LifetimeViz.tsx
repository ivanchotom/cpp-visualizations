import { useState } from 'react'

const steps = [
  { t: 'Base()', label: 'construct Base subobject' },
  { t: 'm1()', label: 'construct member m1 (declaration order)' },
  { t: 'm2()', label: 'construct member m2' },
  { t: 'Derived() body', label: 'run Derived constructor body' },
  { t: '~Derived() body', label: 'run Derived destructor body' },
  { t: '~m2()', label: 'destroy m2 (reverse of construction)' },
  { t: '~m1()', label: 'destroy m1' },
  { t: '~Base()', label: 'destroy Base' },
] as const

export function LifetimeViz() {
  const [i, setI] = useState(0)
  const base = i < 7
  const m1 = i >= 1 && i < 6
  const m2 = i >= 2 && i < 5
  const body = i === 3 || i === 4
  const constructing = i < 4

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))}>
          ◂ prev
        </button>
        <button className="chip chip--active">
          step {i + 1} / {steps.length}
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(steps.length - 1, n + 1))}>
          next ▸
        </button>
        <button className="chip chip--ghost" onClick={() => setI(0)}>
          reset
        </button>
      </div>
      <div className="life-layout">
        <div className={`life-block life-base${base ? ' life-block--on' : ''}`}>Base</div>
        <div className="life-members">
          <div className={`life-block${m1 ? ' life-block--on' : ''}`}>m1</div>
          <div className={`life-block${m2 ? ' life-block--on' : ''}`}>m2</div>
        </div>
        <div className={`life-block life-body${body ? ' life-block--on' : ''}`}>
          Derived body {constructing ? '(ctor)' : '(dtor)'}
        </div>
      </div>
      <p className="layout-hint">
        <strong>{steps[i].t}</strong> — {steps[i].label}. Members construct in declaration
        order, not initializer-list order. Destruction is the reverse.
      </p>
    </div>
  )
}
