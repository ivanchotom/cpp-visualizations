import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Kind = 'single' | 'multi' | 'diamond' | 'virtual'

const MODES: { id: Kind; title: string }[] = [
  { id: 'single', title: 'Single' },
  { id: 'multi', title: 'Multiple' },
  { id: 'diamond', title: 'Diamond' },
  { id: 'virtual', title: 'Virtual diamond' },
]

export function InheritanceViz() {
  const [kind, setKind] = useState<Kind>('single')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setKind(next as Kind)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const diamondTrap = kind === 'diamond' && decided
  const trap = diamondTrap
  const ok = recap && kind !== 'diamond'

  const code =
    kind === 'single'
      ? `struct Base { virtual ~Base() = default; };
struct D : Base {};
D obj;
Base* b = &obj;  // same address`
      : kind === 'multi'
        ? `struct D : BaseA, BaseB {};
D obj;
BaseB* b = &obj;  // pointer offset`
        : kind === 'diamond'
          ? `struct A : Base {};
struct B : Base {};
struct D : A, B {};  // two Bases`
          : `struct A : virtual Base {};
struct B : virtual Base {};
struct D : A, B {};  // one Base`

  const caption =
    i === 0
      ? kind === 'single'
        ? 'Play D is-a Base. Public inheritance is is-a. The address of D and Base is the same here. Stations light in place.'
        : kind === 'multi'
          ? 'Play BaseB*. Two base subobjects, two vptrs if both are polymorphic. D* → BaseB* adjusts the address by a compile-time offset.'
          : kind === 'diamond'
            ? 'Play two Bases. Non-virtual diamond: two Base subobjects. Naming a Base member is ambiguous. Almost never what you wanted.'
            : 'Play one Base. Virtual inheritance: one Base, constructed by the most-derived class. vbptrs locate it.'
      : kind === 'single' && i === 1
        ? 'Base subobject exists first — members and vptr. Derived has not been laid out yet. Address 0 is the start of the object.'
        : kind === 'single' && i === 2
          ? 'Derived members sit after Base. One object, two names. D* and Base* still name the same address.'
          : kind === 'single'
            ? 'Base* b = &obj. Same address — no offset. That is the single-inheritance is-a.'
            : kind === 'multi' && i === 1
              ? 'BaseA occupies the first slice. A D* and a BaseA* share that address. Offset 0.'
              : kind === 'multi' && i === 2
                ? 'BaseB is a second subobject. Two polymorphic bases → two vptrs. BaseB sits at a non-zero offset.'
                : kind === 'multi'
                  ? 'BaseB* b = &obj. The pointer was adjusted by a compile-time offset. No runtime hop.'
                  : kind === 'diamond' && i === 1
                    ? 'A brings a Base. That is one complete Base subobject at offset 0.'
                    : kind === 'diamond' && i === 2
                      ? 'B brings a second Base. Two copies, two vptrs. D is both, twice. The addresses differ.'
                      : kind === 'diamond'
                        ? 'Ambiguous. Which Base? Cast or qualify, or stop using this shape. Prefer virtual Base or composition.'
                        : i === 1
                          ? 'A and B carry vbptrs, not a Base of their own. The shared Base is not constructed yet.'
                          : i === 2
                            ? 'Most-derived D adds its extra members. Still one shared Base to construct — the most-derived class does that.'
                            : 'Most-derived constructs the one Base. Heavier layout, correct is-a. One Base, not two.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    kind === 'single'
      ? 'Play D is-a Base'
      : kind === 'multi'
        ? 'Play BaseB*'
        : kind === 'diamond'
          ? 'Play two Bases'
          : 'Play one Base'

  const verdict =
    kind === 'single' && recap
      ? 'Base* = D* · same address'
      : kind === 'multi' && recap
        ? 'BaseB* = D* + offset'
        : diamondTrap && recap
          ? 'ambiguous · two Base subobjects'
          : kind === 'virtual' && recap
            ? 'one Base · most-derived constructed it'
            : kind === 'single' && decided
              ? 'D members after Base · still @0'
              : kind === 'multi' && decided
                ? 'BaseB at a non-zero offset'
                : diamondTrap
                  ? 'second Base · different address'
                  : kind === 'virtual' && decided
                    ? 'vbptrs in A and B · Base next'
                    : kind === 'single' && stepped
                      ? 'Base first · @0'
                      : kind === 'multi' && stepped
                        ? 'BaseA · @0'
                        : kind === 'diamond' && stepped
                          ? 'first Base via A'
                          : kind === 'virtual' && stepped
                            ? 'vbptrs · no Base yet'
                            : ''

  return (
    <SceneShell
      modes={MODES}
      mode={kind}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setKind(kind)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === kind)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {kind === 'single' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>D</code>
            <span className="fx-note">is</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>B</code>
            <span className="fx-note">ad</span>
            <span className="fx-note">{decided ? '0' : '—'}</span>
          </div>
        </div>
      )}
      {kind === 'multi' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>A</code>
            <span className="fx-note">ad</span>
            <span className="fx-note">{stepped ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>B</code>
            <span className="fx-note">off</span>
            <span className="fx-note">{decided ? '8' : '—'}</span>
          </div>
        </div>
      )}
      {kind === 'diamond' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${diamondTrap ? ' fx-rank--trap' : ''}`}>
            <code>n</code>
            <span className="fx-note">dup</span>
            <span className="fx-note">{diamondTrap ? '2' : stepped ? '1' : '—'}</span>
          </div>
          <div className={`fx-rank${diamondTrap ? ' fx-rank--trap' : ''}`}>
            <code>nm</code>
            <span className="fx-note">id</span>
            <span className="fx-note">{diamondTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {kind === 'virtual' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">dup</span>
            <span className="fx-note">{recap ? '1' : stepped ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>D</code>
            <span className="fx-note">ct</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
