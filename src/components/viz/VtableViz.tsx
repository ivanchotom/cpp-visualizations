import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'derived' | 'slice' | 'ctor' | 'del'

const MODES: { id: Mode; title: string }[] = [
  { id: 'derived', title: 'Dog*' },
  { id: 'slice', title: 'slice' },
  { id: 'ctor', title: 'in ctor' },
  { id: 'del', title: 'delete' },
]

export function VtableViz() {
  const [id, setId] = useState<Mode>('derived')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const sliceTrap = id === 'slice' && decided
  const ctorTrap = id === 'ctor' && decided
  const delTrap = id === 'del' && decided
  const trap = sliceTrap || ctorTrap || delTrap
  const ok = id === 'derived' && recap

  const code =
    id === 'derived'
      ? `Animal* p = &dog;
p->speak();  // Dog::speak`
      : id === 'slice'
        ? `void take(Animal a);
take(dog);  // slice`
        : id === 'ctor'
          ? `Animal::Animal() {
  speak();  // Animal::speak
}`
          : recap
            ? `Animal* p = new Dog;
delete p;  // without virtual ~Animal
// ~Dog is skipped — UB / leak`
            : `struct Animal { virtual ~Animal() = default; };
Animal* p = new Dog;
delete p;  // ~Dog then ~Animal`

  const caption =
    i === 0
      ? id === 'derived'
        ? 'Play p->speak(). The object holds a vptr. The table lives with the object — not in the call site. Stations light in place.'
        : id === 'slice'
          ? 'Play take(dog). Pass Dog by value into an Animal parameter and the Dog vptr is gone. Virtual calls cannot recover the extra members.'
          : id === 'ctor'
            ? 'Play speak() in ctor. The object is not a Dog yet. Virtual calls use the currently constructed type.'
            : 'Play delete p. If you delete through Animal*, ~Animal must be virtual or ~Dog never runs.'
      : i === 1
        ? id === 'derived'
          ? 'Load the vptr. It is an address stored in the object. Static type of p may be Animal*; the table is the dynamic type.'
          : id === 'slice'
            ? 'take(dog) copies into an Animal. The Dog vptr is not part of that copy. Extra members are gone.'
            : id === 'ctor'
              ? 'Animal’s constructor is running. Dog members are not alive. The vptr still names Animal’s table.'
              : 'delete p looks up the destructor slot. Static type of p may be Animal*; the table is the dynamic type — if the dtor is virtual.'
        : i === 2
          ? id === 'derived'
            ? 'Index slot speak → Dog::speak. Static type of p may be Animal*; the table is the dynamic type.'
            : id === 'slice'
              ? 'speak() now hits Animal::speak. The Dog table is not there. That is slicing, not a failed virtual lookup.'
              : id === 'ctor'
                ? 'speak() in Animal::Animal uses Animal::speak. Same story in reverse during ~Dog then ~Animal.'
                : 'Without virtual ~Animal, delete p is a static call to ~Animal. ~Dog never runs.'
          : id === 'derived'
            ? 'Dog::speak ran. Virtual dtor belongs in the same table if you delete through Animal*.'
            : id === 'slice'
              ? 'Animal::speak. Extra Dog members were sliced off. Pass by reference or pointer to keep the dynamic type.'
              : id === 'ctor'
                ? 'While Animal’s constructor runs, virtual calls use Animal’s vtable. Do not call virtuals to “reach” Derived.'
                : '=default the virtual dtor on a polymorphic base. Otherwise Dog’s resources leak — UB if you rely on ~Dog.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'derived' ? 'Play p->speak()' : id === 'slice' ? 'Play take(dog)' : id === 'ctor' ? 'Play speak() in ctor' : 'Play delete p'

  const verdict =
    recap && id === 'derived'
      ? 'Dog::speak · dynamic type'
      : recap && sliceTrap
        ? 'Animal::speak · sliced'
        : recap && ctorTrap
          ? 'not a Dog yet'
          : recap && delTrap
            ? 'need virtual ~Animal'
            : id === 'derived' && decided
              ? 'vptr[1] → Dog::speak'
              : sliceTrap
                ? 'vptr now Animal'
                : ctorTrap
                  ? 'vptr still Animal'
                  : delTrap
                    ? '~Animal only · ~Dog skipped'
                    : stepped
                      ? 'load vptr from the object'
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
      {id === 'derived' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>vp</code>
            <span className="fx-note">vt</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>fn</code>
            <span className="fx-note">spk</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'slice' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${sliceTrap ? ' fx-rank--trap' : ''}`}>
            <code>vp</code>
            <span className="fx-note">vt</span>
            <span className="fx-note">{sliceTrap ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${sliceTrap ? ' fx-rank--trap' : ''}`}>
            <code>fn</code>
            <span className="fx-note">spk</span>
            <span className="fx-note">{sliceTrap ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ctor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${ctorTrap ? ' fx-rank--trap' : ''}`}>
            <code>vp</code>
            <span className="fx-note">ty</span>
            <span className="fx-note">{ctorTrap ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${ctorTrap ? ' fx-rank--trap' : ''}`}>
            <code>fn</code>
            <span className="fx-note">spk</span>
            <span className="fx-note">{ctorTrap ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'del' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>~A</code>
            <span className="fx-note">dt</span>
            <span className="fx-note">{delTrap ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${delTrap ? ' fx-rank--trap' : ''}`}>
            <code>~D</code>
            <span className="fx-note">Dog</span>
            <span className="fx-note">{delTrap ? 'ill' : '—'}</span>
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
