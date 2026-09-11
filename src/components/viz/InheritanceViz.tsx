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
  const trap = kind === 'diamond' && recap
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
        ? 'Play D is-a Base. Public inheritance is is-a. Slices stack in place — Base, then Derived. The address of D and Base is the same here.'
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
            ? 'Base* b = &obj welds to the Base slice. Same address — no offset. That is the single-inheritance is-a.'
            : kind === 'multi' && i === 1
              ? 'BaseA occupies the first slice. A D* and a BaseA* share that address. Offset 0.'
              : kind === 'multi' && i === 2
                ? 'BaseB is a second subobject. Derived members follow. Two polymorphic bases → two vptrs. BaseB sits at a non-zero offset.'
                : kind === 'multi'
                  ? 'BaseB* b = &obj. The weld sits on BaseB, not BaseA. The pointer was adjusted by a compile-time offset. No runtime hop.'
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
                            : 'Most-derived constructs the one Base. Heavier layout, correct is-a. One weld, not two.'

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
        : kind === 'diamond' && recap
          ? 'ambiguous · two Base subobjects'
          : kind === 'virtual' && recap
            ? 'one Base · most-derived constructed it'
            : kind === 'single' && decided
              ? 'D members after Base · still @0'
              : kind === 'multi' && decided
                ? 'BaseB at a non-zero offset'
                : kind === 'diamond' && decided
                  ? 'second Base · different address'
                  : kind === 'virtual' && decided
                    ? 'vbptrs in A and B · Base next'
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
      <div className="fx-inh">
        {kind === 'single' && (
          <>
            <Slice
              kicker="Base"
              note={stepped ? 'vptr + members' : 'not yet'}
              addr={stepped ? '@0' : '—'}
              on={stepped}
              hot={recap}
              tag="base"
            />
            <Slice
              kicker="Derived"
              note={decided ? 'D members' : 'not yet'}
              addr={decided ? '@0' : '—'}
              on={decided}
              tag="derived"
            />
          </>
        )}
        {kind === 'multi' && (
          <>
            <Slice kicker="BaseA" note={stepped ? 'vptr + A' : 'not yet'} addr={stepped ? '@0' : '—'} on={stepped} tag="base" />
            <Slice
              kicker="BaseB"
              note={decided ? 'vptr + B · offset' : 'not yet'}
              addr={decided ? '@8' : '—'}
              on={decided}
              hot={recap}
              tag="mid"
            />
            <Slice kicker="Derived" note={decided ? 'D members' : 'not yet'} addr={decided ? '@0' : '—'} on={decided} tag="derived" />
          </>
        )}
        {kind === 'diamond' && (
          <>
            <Slice
              kicker="Base via A"
              note={stepped ? 'first Base' : 'not yet'}
              addr={stepped ? '@0' : '—'}
              on={stepped}
              dup={recap}
              tag="dup"
            />
            <Slice kicker="A extra" note={stepped ? 'A members' : 'not yet'} addr={stepped ? '@4' : '—'} on={stepped} tag="mid" />
            <Slice
              kicker="Base via B"
              note={decided ? 'second Base' : 'not yet'}
              addr={decided ? '@8' : '—'}
              on={decided}
              dup={recap}
              hot={recap}
              tag="dup"
            />
            <Slice kicker="B extra" note={decided ? 'B members' : 'not yet'} addr={decided ? '@12' : '—'} on={decided} tag="mid" />
            <Slice kicker="Derived" note={decided ? 'D members' : 'not yet'} addr={decided ? '@0' : '—'} on={decided} tag="derived" />
          </>
        )}
        {kind === 'virtual' && (
          <>
            <Slice kicker="A" note={stepped ? 'vbptr' : 'not yet'} addr={stepped ? '@0' : '—'} on={stepped} tag="mid" />
            <Slice kicker="B" note={stepped ? 'vbptr' : 'not yet'} addr={stepped ? '@8' : '—'} on={stepped} tag="mid" />
            <Slice
              kicker="Derived extra"
              note={decided ? 'D members' : 'not yet'}
              addr={decided ? '@10' : '—'}
              on={decided}
              tag="derived"
            />
            <Slice
              kicker="shared Base"
              note={recap ? 'constructed by D' : decided ? 'most-derived will' : 'not yet'}
              addr={recap ? '@18' : '—'}
              on={recap}
              hot={recap}
              tag="shared"
            />
          </>
        )}
      </div>
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

function Slice({
  kicker,
  note,
  addr,
  on,
  hot,
  dup,
  tag,
}: {
  kicker: string
  note: string
  addr: string
  on: boolean
  hot?: boolean
  dup?: boolean
  tag: 'base' | 'mid' | 'derived' | 'dup' | 'shared'
}) {
  return (
    <div
      className={`fx-slice fx-slice--${tag}${on ? ' fx-slice--on' : ' fx-slice--off'}${hot ? ' fx-slice--hot' : ''}${
        dup ? ' fx-slice--dup' : ''
      }`}
    >
      <span className="fx-kicker">{kicker}</span>
      <span className="fx-note">{note}</span>
      <span className="fx-value">
        <code>{addr}</code>
      </span>
      {hot && <span className="fx-badge fx-badge--open">bound</span>}
      {dup && <span className="fx-badge fx-badge--lock">copy</span>}
    </div>
  )
}
