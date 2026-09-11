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
        ? 'Play the layout. Public inheritance is is-a. Slices stack in place — Base, then Derived. No flying D*.'
        : kind === 'multi'
          ? 'Play multiple inheritance. Two base subobjects, two vptrs if both are polymorphic. D* → BaseB* adjusts the address.'
          : kind === 'diamond'
            ? 'Play the non-virtual diamond. Two Base subobjects. Naming a Base member is ambiguous. Almost never what you wanted.'
            : 'Play virtual inheritance. One Base, constructed by the most-derived class. vbptrs locate it.'
      : kind === 'single' && i === 1
        ? 'Base subobject exists first — members and vptr. Derived has not been laid out yet.'
        : kind === 'single' && i === 2
          ? 'Derived members sit after Base. One object, two names. The address of D and Base is the same here.'
          : kind === 'single'
            ? 'Base* b = &obj welds to the Base slice. Same address — no offset. That is the single-inheritance is-a.'
            : kind === 'multi' && i === 1
              ? 'BaseA occupies the first slice. A D* and a BaseA* share that address.'
              : kind === 'multi' && i === 2
                ? 'BaseB is a second subobject. Derived members follow. Two polymorphic bases → two vptrs.'
                : kind === 'multi'
                  ? 'BaseB* b = &obj. The weld sits on BaseB, not BaseA. The pointer was adjusted by a compile-time offset.'
                  : kind === 'diamond' && i === 1
                    ? 'A brings a Base. That is one complete Base subobject.'
                    : kind === 'diamond' && i === 2
                      ? 'B brings a second Base. Two copies, two vptrs. D is both, twice.'
                      : kind === 'diamond'
                        ? 'Ambiguous. Which Base? Cast or qualify, or stop using this shape. Prefer virtual Base or composition.'
                        : i === 1
                          ? 'A and B carry vbptrs, not a Base of their own. The shared Base is not here yet.'
                          : i === 2
                            ? 'Most-derived D adds its extra members. Still one shared Base to construct.'
                            : 'Most-derived constructs the one Base. Heavier layout, correct is-a. One weld, not two.'

  const tone = kind === 'diamond' && i >= 3 ? 'trap' : kind === 'virtual' && i >= 3 ? 'ok' : kind === 'single' && i >= 3 ? 'ok' : 'idle'

  const showBase = i >= 1
  const showDerived = i >= 2
  const bound = i >= 3

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
      playLabel="Play layout"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === kind)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-inh">
        {kind === 'single' && (
          <>
            <Slice
              kicker="Base"
              note={showBase ? 'vptr + members' : 'not yet'}
              on={showBase}
              hot={bound}
              tag="base"
            />
            <Slice
              kicker="Derived"
              note={showDerived ? 'D members' : 'not yet'}
              on={showDerived}
              dim={!showDerived}
              tag="derived"
            />
          </>
        )}
        {kind === 'multi' && (
          <>
            <Slice kicker="BaseA" note={showBase ? 'vptr + A' : 'not yet'} on={showBase} tag="base" />
            <Slice
              kicker="BaseB"
              note={showDerived ? 'vptr + B · offset from D*' : 'not yet'}
              on={showDerived}
              hot={bound}
              tag="mid"
            />
            <Slice kicker="Derived" note={showDerived ? 'D members' : 'not yet'} on={showDerived} tag="derived" />
          </>
        )}
        {kind === 'diamond' && (
          <>
            <Slice kicker="Base via A" note={showBase ? 'first Base' : 'not yet'} on={showBase} dup={bound} tag="dup" />
            <Slice kicker="A extra" note={showBase ? 'A members' : 'not yet'} on={showBase} tag="mid" />
            <Slice
              kicker="Base via B"
              note={showDerived ? 'second Base' : 'not yet'}
              on={showDerived}
              dup={bound}
              hot={bound}
              tag="dup"
            />
            <Slice kicker="B extra" note={showDerived ? 'B members' : 'not yet'} on={showDerived} tag="mid" />
            <Slice kicker="Derived" note={showDerived ? 'D members' : 'not yet'} on={showDerived} tag="derived" />
          </>
        )}
        {kind === 'virtual' && (
          <>
            <Slice kicker="A" note={showBase ? 'vbptr' : 'not yet'} on={showBase} tag="mid" />
            <Slice kicker="B" note={showBase ? 'vbptr' : 'not yet'} on={showBase} tag="mid" />
            <Slice kicker="Derived extra" note={showDerived ? 'D members' : 'not yet'} on={showDerived} tag="derived" />
            <Slice
              kicker="shared Base"
              note={bound ? 'constructed by D' : showDerived ? 'not yet — most-derived will' : 'not yet'}
              on={bound}
              hot={bound}
              tag="shared"
            />
          </>
        )}
      </div>
      <div
        className={`fx-verdict${i >= 3 ? ' fx-verdict--show' : ''} ${
          kind === 'diamond' && i >= 3 ? 'fx-verdict--trap' : i >= 3 ? 'fx-verdict--ok' : ''
        }`}
      >
        {i < 3
          ? ''
          : kind === 'single'
            ? 'Base* = D* · same address'
            : kind === 'multi'
              ? 'BaseB* = D* + offset'
              : kind === 'diamond'
                ? 'ambiguous · two Base subobjects'
                : 'one Base · most-derived constructed it'}
      </div>
    </SceneShell>
  )
}

function Slice({
  kicker,
  note,
  on,
  hot,
  dim,
  dup,
  tag,
}: {
  kicker: string
  note: string
  on: boolean
  hot?: boolean
  dim?: boolean
  dup?: boolean
  tag: 'base' | 'mid' | 'derived' | 'dup' | 'shared'
}) {
  return (
    <div
      className={`fx-slice fx-slice--${tag}${on ? ' fx-slice--on' : ' fx-slice--off'}${hot ? ' fx-slice--hot' : ''}${
        dim ? ' fx-slice--dim' : ''
      }${dup ? ' fx-slice--dup' : ''}`}
    >
      <span className="fx-kicker">{kicker}</span>
      <span className="fx-note">{note}</span>
      {hot && <span className="fx-badge fx-badge--open">bound</span>}
      {dup && <span className="fx-badge fx-badge--lock">copy</span>}
    </div>
  )
}
