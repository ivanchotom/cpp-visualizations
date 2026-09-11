import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'ctor' | 'dtor' | 'order' | 'throw'

const MODES: { id: Mode; title: string }[] = [
  { id: 'ctor', title: 'construct' },
  { id: 'dtor', title: 'destroy' },
  { id: 'order', title: 'list order' },
  { id: 'throw', title: 'throw' },
]

export function LifetimeViz() {
  const [id, setId] = useState<Mode>('ctor')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const baseOn = id === 'ctor' ? stepped : id === 'dtor' ? i < 3 : id === 'throw' ? i >= 1 && i < 3 : false
  const m1On = id === 'ctor' ? decided : id === 'dtor' ? i < 2 : id === 'throw' ? i >= 1 && i < 3 : false
  const m2On = id === 'ctor' ? recap : id === 'dtor' ? i < 2 : false
  const bodyOn = id === 'ctor' && recap
  const m2Trap = id === 'throw' && decided
  const aJunk = id === 'order' && decided
  const trap = m2Trap || aJunk
  const ok = (id === 'ctor' && recap) || (id === 'dtor' && recap)

  const code =
    id === 'ctor'
      ? `struct Derived : Base {
  Mem m1, m2;
  Derived() : Base(), m1(), m2() {
    // body runs last
  }
};`
      : id === 'dtor'
        ? `// ~Derived runs first, then members
// in reverse declaration order, then ~Base
~Derived() { /* body */ }`
        : id === 'order'
          ? recap
            ? `S(int x) : b(x), a(b) {}
// a is initialized FIRST — b is still junk
// list order is ignored`
            : `struct S {
  int a;
  int b;
  S(int x) : b(x), a(b) {}
};`
          : recap
            ? `// m2() threw
// ~m1 ran, then ~Base
// Derived body never ran`
            : `Derived() : Base(), m1(), m2() {
  // m2() throws
}`

  const caption =
    i === 0
      ? id === 'ctor'
        ? 'Play construct. Bases first, then members in declaration order, then the constructor body. Cells light in place — nothing hops.'
        : id === 'dtor'
          ? 'Play destroy. Destruction is the exact reverse of construction. That is why RAII works.'
          : id === 'order'
            ? 'Play list order. The mem-initializer list writes values, but order is still declaration order. List order is ignored.'
            : 'Play throw. If a later member’s constructor throws, already-constructed members and bases are destroyed. The Derived body never runs.'
      : id === 'ctor' && i === 1
        ? 'Base subobject exists first — members and the Derived body do not exist yet.'
        : id === 'ctor' && i === 2
          ? 'm1 constructs. Declaration order wins. The initializer-list order does not rearrange this.'
          : id === 'ctor'
            ? 'm2, then the Derived body. Only now does user code in the braces run.'
            : id === 'dtor' && i === 1
              ? '~Derived body first. Members are still alive. You can use them here — not after.'
              : id === 'dtor' && i === 2
                ? '~m2 then ~m1. Reverse declaration order. Base is still alive.'
                : id === 'dtor'
                  ? '~Base last. The object is fully dead. RAII: members clean up even if a later ctor threw on the way in.'
                  : id === 'order' && i === 1
                    ? 'a is declared first, so a() runs first. The list said b(x), a(b) — that does not change the order.'
                    : id === 'order' && i === 2
                      ? 'a(b) runs while b is still junk. Using a later member to init an earlier one is a classic trap.'
                      : id === 'order'
                        ? 'b finally gets x. a already holds garbage. Write the list in declaration order so it matches reality.'
                        : i === 1
                          ? 'Base and m1 constructed. m2 is next. If it throws, the body will not run.'
                          : i === 2
                            ? 'm2() throws. Already-constructed m1 and Base will unwind. Derived’s body is skipped.'
                            : '~m1, then ~Base. That is why RAII still works when a constructor fails halfway.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'ctor' ? 'Play construct' : id === 'dtor' ? 'Play destroy' : id === 'order' ? 'Play list order' : 'Play throw in ctor'

  const verdict =
    id === 'ctor' && i === 1
      ? 'Base() · members not yet'
      : id === 'ctor' && i === 2
        ? 'm1() · declaration order'
        : id === 'ctor' && recap
          ? 'm2() then body · last'
          : id === 'dtor' && i === 1
            ? '~Derived body · members alive'
            : id === 'dtor' && i === 2
              ? '~m2 then ~m1'
              : id === 'dtor' && recap
                ? '~Base last · object dead'
                : id === 'order' && i === 1
                  ? 'a first · list order ignored'
                  : aJunk && !recap
                    ? 'a(b) · b is junk'
                    : id === 'order' && recap
                      ? 'declaration order wins'
                      : id === 'throw' && i === 1
                        ? 'Base, m1 · m2 next'
                        : m2Trap && !recap
                          ? 'm2() threw · unwind'
                          : recap && id === 'throw'
                            ? '~m1, ~Base · body skipped'
                            : ''

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setId(id)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {id === 'order' ? (
        <>
          <div className="fx-ladder">
            <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${aJunk ? ' fx-rank--trap' : ''}`}>
              <code>a</code>
              <span className="fx-note">declared 1st</span>
              <span className="fx-note">{aJunk ? '?' : stepped ? 'ok' : '—'}</span>
            </div>
            <div className={`fx-rank${recap ? ' fx-rank--on' : ''}`}>
              <code>b</code>
              <span className="fx-note">listed 1st</span>
              <span className="fx-note">{recap ? 'x' : '—'}</span>
            </div>
          </div>
          <div className="fx-buf-row" style={{ justifyContent: 'center' }}>
            <span className={`fx-letter${aJunk ? ' fx-letter--junk' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>
              {aJunk ? '?' : stepped ? 'a' : '·'}
            </span>
            <span className={`fx-letter${recap ? ' fx-letter--on' : ' fx-letter--empty'}`}>{recap ? 'b' : '·'}</span>
          </div>
        </>
      ) : (
        <div className="fx-inh">
          <div className={`fx-slice${baseOn ? ' fx-slice--on' : ' fx-slice--off'}${id === 'ctor' && i === 1 ? ' fx-slice--hot' : ''}`}>
            <span className="fx-kicker">Base</span>
            <span className="fx-note">{baseOn ? 'alive' : id === 'dtor' || (id === 'throw' && recap) ? 'destroyed' : 'not yet'}</span>
          </div>
          <div
            className={`fx-slice${m1On ? ' fx-slice--on' : ' fx-slice--off'}${id === 'ctor' && i === 2 ? ' fx-slice--hot' : ''}`}
          >
            <span className="fx-kicker">m1</span>
            <span className="fx-note">{m1On ? 'alive' : id === 'dtor' || (id === 'throw' && recap) ? 'destroyed' : 'not yet'}</span>
          </div>
          <div className={`fx-slice${m2On ? ' fx-slice--on' : ' fx-slice--off'}${m2Trap ? ' fx-slice--dup' : ''}`}>
            <span className="fx-kicker">m2</span>
            <span className="fx-note">{m2Trap ? 'threw' : m2On ? 'alive' : id === 'dtor' ? 'destroyed' : 'not yet'}</span>
          </div>
          <div className={`fx-slice fx-slice--derived${bodyOn ? ' fx-slice--on fx-slice--hot' : ' fx-slice--off'}`}>
            <span className="fx-kicker">Derived body</span>
            <span className="fx-note">
              {bodyOn ? 'runs last' : id === 'throw' ? 'never' : id === 'dtor' ? (i === 0 ? 'first to go' : 'done') : 'not yet'}
            </span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''}`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
