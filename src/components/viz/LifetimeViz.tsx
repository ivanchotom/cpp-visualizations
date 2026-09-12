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
  const aJunk = id === 'order' && decided
  const throwTrap = id === 'throw' && decided
  const trap = aJunk || throwTrap
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
        ? 'Play construct. Bases first, then members in declaration order, then the constructor body. Stations light in place.'
        : id === 'dtor'
          ? 'Play destroy. Destruction is the exact reverse of construction. That is why RAII works.'
          : id === 'order'
            ? 'Play list order. The mem-initializer list writes values, but order is still declaration order. List order is ignored.'
            : 'Play throw in ctor. If a later member’s constructor throws, already-constructed members and bases are destroyed. The Derived body never runs.'
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
    id === 'ctor' && recap
      ? 'm2() then body · last'
      : id === 'ctor' && decided
        ? 'm1() · declaration order'
        : id === 'ctor' && stepped
          ? 'Base() · members not yet'
          : id === 'dtor' && recap
            ? '~Base last · object dead'
            : id === 'dtor' && decided
              ? '~m2 then ~m1'
              : id === 'dtor' && stepped
                ? '~Derived body · members alive'
                : aJunk && recap
                  ? 'declaration order wins'
                  : aJunk
                    ? 'a(b) · b is junk'
                    : id === 'order' && stepped
                      ? 'a first · list order ignored'
                      : throwTrap && recap
                        ? '~m1, ~Base · body skipped'
                        : throwTrap
                          ? 'm2() threw · unwind'
                          : id === 'throw' && stepped
                            ? 'Base, m1 · m2 next'
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
      {id === 'ctor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>B</code>
            <span className="fx-note">sb</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>bd</code>
            <span className="fx-note">fn</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dtor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>D</code>
            <span className="fx-note">fn</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>B</code>
            <span className="fx-note">sb</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'order' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${aJunk ? ' fx-rank--trap' : ''}`}>
            <code>a</code>
            <span className="fx-note">1</span>
            <span className="fx-note">{aJunk ? 'ub' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">in</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'throw' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${throwTrap ? ' fx-rank--trap' : ''}`}>
            <code>m2</code>
            <span className="fx-note">ct</span>
            <span className="fx-note">{throwTrap ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>un</code>
            <span className="fx-note">un</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
