import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

const STEPS = [
  { t: 'Base()', label: 'Construct Base subobject first. Members and the Derived body do not exist yet.', kind: 'ctor' as const, target: 'base' },
  { t: 'm1()', label: 'Members construct in declaration order — m1 before m2.', kind: 'ctor' as const, target: 'm1' },
  { t: 'm2()', label: 'm2 is next. Initializer-list order does not win over declaration order.', kind: 'ctor' as const, target: 'm2' },
  { t: 'Derived() body', label: 'Only now does the Derived constructor body run.', kind: 'ctor' as const, target: 'body' },
  { t: '~Derived() body', label: 'Destruction starts with the Derived body.', kind: 'dtor' as const, target: 'body' },
  { t: '~m2()', label: 'Members destroy in reverse: m2 before m1.', kind: 'dtor' as const, target: 'm2' },
  { t: '~m1()', label: 'm1 is gone. Base is still alive.', kind: 'dtor' as const, target: 'm1' },
  { t: '~Base()', label: 'Base last. The object is fully dead.', kind: 'dtor' as const, target: 'base' },
]

export function LifetimeViz() {
  const { i, playing, play, reset, jump } = useBeats(STEPS.length, 1200)
  const step = STEPS[i]
  const base = i < 7
  const m1 = i >= 1 && i < 6
  const m2 = i >= 2 && i < 5
  const body = i === 3 || i === 4
  const constructing = i < 4
  const { target, kind } = step

  const code =
    kind === 'ctor'
      ? `struct Derived : Base {\n  Mem m1, m2;\n  Derived() : Base(), m1(), m2() {\n    // body runs last\n  }\n};`
      : `// ~Derived runs first, then members\n// in reverse declaration order, then ~Base\n~Derived() { /* body */ }`

  const tone = kind === 'dtor' ? (i >= 7 ? 'ok' : 'warn') : 'idle'

  return (
    <SceneShell
      playing={playing}
      onPlay={play}
      onReset={reset}
      playLabel="Play construct → destroy"
      step={i}
      stepCount={STEPS.length}
      sig={step.t}
      caption={step.label}
      code={code}
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
      <div className="fx-frames">
        <div className={`fx-frame${base ? '' : ' fx-frame--dead'}${target === 'base' ? ' fx-frame--inner' : ''}`}>
          <span className="fx-kicker">Base subobject {base ? 'alive' : 'destroyed'}</span>
          <div className="fx-members">
            <div
              className={`fx-slot${m1 ? '' : ' fx-slot--dim'}${target === 'm1' ? ' fx-slot--focus' : ''}${
                !m1 && i >= 6 ? ' fx-pane--gone' : ''
              }`}
            >
              <span className="fx-kicker">member</span>
              <span className="fx-value">m1</span>
              <span className="fx-note">{m1 ? 'alive' : constructing ? 'not yet' : 'gone'}</span>
            </div>
            <div
              className={`fx-slot${m2 ? '' : ' fx-slot--dim'}${target === 'm2' ? ' fx-slot--focus' : ''}${
                !m2 && i >= 5 ? ' fx-pane--gone' : ''
              }`}
            >
              <span className="fx-kicker">member</span>
              <span className="fx-value">m2</span>
              <span className="fx-note">{m2 ? 'alive' : constructing ? 'not yet' : 'gone'}</span>
            </div>
          </div>
          <div
            className={`fx-slot fx-lifetime-body${body ? ' fx-slot--weld' : ' fx-slot--dim'}${target === 'body' ? ' fx-slot--focus' : ''}`}
          >
            <span className="fx-kicker">Derived</span>
            <span className="fx-note">
              {body ? (constructing ? 'constructor body' : 'destructor body') : constructing ? 'body not yet' : 'body done'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict fx-verdict--show ${kind === 'dtor' ? (i >= 7 ? 'fx-verdict--ok' : 'fx-verdict--warn') : 'fx-verdict--ok'}`}
      >
        {kind === 'ctor' ? `construct · ${step.t}` : `destroy · ${step.t}`}
      </div>
    </SceneShell>
  )
}
