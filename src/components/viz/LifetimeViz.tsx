import { useEffect, useState } from 'react'

const STEPS = [
  { t: 'Base()', label: 'construct Base subobject first', kind: 'ctor' as const, target: 'base' },
  { t: 'm1()', label: 'members construct in declaration order — m1 before m2', kind: 'ctor' as const, target: 'm1' },
  { t: 'm2()', label: 'm2 is next. Initializer-list order does not win over declaration order.', kind: 'ctor' as const, target: 'm2' },
  { t: 'Derived() body', label: 'only now does the Derived constructor body run', kind: 'ctor' as const, target: 'body' },
  { t: '~Derived() body', label: 'destruction starts with the Derived body', kind: 'dtor' as const, target: 'body' },
  { t: '~m2()', label: 'members destroy in reverse: m2 before m1', kind: 'dtor' as const, target: 'm2' },
  { t: '~m1()', label: 'm1 is gone. Base is still alive.', kind: 'dtor' as const, target: 'm1' },
  { t: '~Base()', label: 'Base last. The object is fully dead.', kind: 'dtor' as const, target: 'base' },
]

const STEP_MS = 1100

export function LifetimeViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)

  const base = i < 7
  const m1 = i >= 1 && i < 6
  const m2 = i >= 2 && i < 5
  const body = i === 3 || i === 4
  const constructing = i < 4
  const target = STEPS[i].target
  const kind = STEPS[i].kind

  useEffect(() => {
    if (!playing) return
    const t0 = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const step = Math.min(STEPS.length - 1, Math.floor((now - t0) / STEP_MS))
      setI(step)
      if (step >= STEPS.length - 1) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  function play() {
    setI(0)
    setPlaying(true)
  }

  const code =
    kind === 'ctor'
      ? `struct Derived : Base {
  Mem m1, m2;
  Derived() : Base(), m1(), m2() {
    // body runs last
  }
};`
      : `// ~Derived runs first, then members
// in reverse declaration order, then ~Base
~Derived() { /* body */ }`

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play construct → destroy
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
          }}
        >
          reset
        </button>
      </div>

      <div className={`viz-stage lf-stage viz-stage--live${kind === 'dtor' ? ' lf-stage--dtor' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{STEPS.length} · <strong>{STEPS[i].t}</strong>
        </p>
        <div className={`lf-shell${base ? ' lf-on' : ' lf-dead'}${target === 'base' ? ` lf-now lf-now--${kind}` : ''}`}>
          <span className="lf-tag">Base subobject</span>
          <div className="lf-members">
            {m1 ? (
              <div className={`lf-piece lf-on${target === 'm1' ? ` lf-now lf-now--${kind}` : ''}`}>
                <span className="lf-tag">member</span>
                m1
              </div>
            ) : (
              <div className="lf-piece lf-empty">{kind === 'ctor' ? 'm1 not yet' : 'm1 gone'}</div>
            )}
            {m2 ? (
              <div className={`lf-piece lf-on${target === 'm2' ? ` lf-now lf-now--${kind}` : ''}`}>
                <span className="lf-tag">member</span>
                m2
              </div>
            ) : (
              <div className="lf-piece lf-empty">{kind === 'ctor' ? 'm2 not yet' : 'm2 gone'}</div>
            )}
          </div>
          {body ? (
            <div className={`lf-body lf-on${target === 'body' ? ` lf-now lf-now--${kind}` : ''}`}>
              <span className="lf-tag">Derived</span>
              {constructing ? 'constructor body' : 'destructor body'}
            </div>
          ) : (
            <div className="lf-body lf-empty">{constructing ? 'body not yet' : 'body done'}</div>
          )}
        </div>
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{STEPS[i].label}</p>
    </div>
  )
}
