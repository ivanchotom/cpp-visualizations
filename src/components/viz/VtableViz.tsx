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

const SLOTS = {
  dog: [
    { name: '[0] dtor', fn: 'Dog::~Dog' },
    { name: '[1] speak', fn: 'Dog::speak' },
    { name: '[2] id', fn: 'Animal::id' },
  ],
  animal: [
    { name: '[0] dtor', fn: 'Animal::~Animal' },
    { name: '[1] speak', fn: 'Animal::speak' },
    { name: '[2] id', fn: 'Animal::id' },
  ],
} as const

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
  const sliced = id === 'slice'
  const ctorTrap = id === 'ctor'
  const delTrap = id === 'del' && recap
  const trap = (sliced && recap) || (ctorTrap && recap) || delTrap
  const ok = id === 'derived' && recap
  const slots = id === 'derived' || (id === 'del' && !recap) ? SLOTS.dog : SLOTS.animal
  const hot = decided ? 1 : -1
  const dtorHot = id === 'del' && recap

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
        ? 'Play p->speak(). The object holds a vptr. The table lives with the object — not in the call site.'
        : id === 'slice'
          ? 'Play slice. Pass Dog by value into an Animal parameter and the Dog vptr is gone. Virtual calls cannot recover the extra members.'
          : id === 'ctor'
            ? 'Play speak() in Animal’s constructor. The object is not a Dog yet. Virtual calls use the currently constructed type.'
            : 'Play delete. If you delete through Animal*, ~Animal must be virtual or ~Dog never runs.'
      : i === 1
        ? 'Load the vptr. It is an address stored in the object. The cyan bar is that load — nothing hops across the canvas.'
        : i === 2
          ? id === 'del'
            ? 'delete p looks up vtable[0], the destructor slot. Static type of p may be Animal*; the table is the dynamic type.'
            : `Index slot [1] speak → ${slots[1].fn}. Static type of p may be Animal*; the table is the dynamic type.`
          : id === 'derived'
            ? 'Dog::speak ran. woof. Virtual dtor belongs in the same table if you delete through Animal*.'
            : id === 'slice'
              ? 'Animal::speak. Extra Dog members were sliced off. The vptr now names Animal’s table.'
              : id === 'ctor'
                ? 'While Animal’s constructor runs, virtual calls use Animal’s vtable. Same story in reverse during ~Dog then ~Animal.'
                : 'Without virtual ~Animal, delete p runs ~Animal only. Dog’s resources leak. =default the virtual dtor on a polymorphic base.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'derived' ? 'Play p->speak()' : id === 'slice' ? 'Play take(dog)' : id === 'ctor' ? 'Play speak() in ctor' : 'Play delete p'

  const objectName = id === 'derived' ? 'Dog' : id === 'slice' ? 'Animal (sliced)' : id === 'ctor' ? 'Dog storage' : 'Animal*'
  const vptrVal = stepped ? (id === 'derived' || (id === 'del' && !recap) ? 'vptr → Dog' : 'vptr → Animal') : '—'
  const word = recap ? (id === 'derived' ? 'woof' : id === 'slice' ? '…' : id === 'ctor' ? 'Animal::speak' : delTrap ? '~Animal only' : '~Dog') : '—'

  const verdict =
    i === 1
      ? vptrVal
      : i === 2
        ? id === 'del'
          ? 'vptr[0] → destructor'
          : `vptr[1] → ${slots[1].fn}`
        : recap && id === 'derived'
          ? 'Dog::speak · woof'
          : recap && sliced
            ? 'Animal::speak · sliced'
            : recap && ctorTrap
              ? 'not a Dog yet'
              : recap && id === 'del'
                ? 'need virtual ~Animal'
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
      <div className="fx-sh">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">{objectName}</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}${ok ? ' fx-slot--weld' : ''}`}>
            <span className="fx-kicker">vptr</span>
            <span className="fx-value">
              <code>{vptrVal}</code>
            </span>
            <span className="fx-note">{stepped ? 'loaded from the object' : 'not read yet'}</span>
          </div>
          <div className={`fx-slot${sliced && recap ? ' fx-slot--dim' : ''}`}>
            <span className="fx-kicker">members</span>
            <span className="fx-note">
              {id === 'derived' ? 'age = 5' : id === 'slice' ? 'Dog members gone' : id === 'ctor' ? 'Dog not alive yet' : 'heap Dog'}
            </span>
            {recap && <span className="fx-badge fx-badge--open">{word}</span>}
          </div>
        </div>
        <div className={`fx-link${trap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}${ok ? ' fx-link--weld' : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">{id === 'derived' || (id === 'del' && !recap) ? 'Dog vtable' : 'Animal vtable'}</span>
          {slots.map((slot, n) => {
            const isHot = (n === 1 && hot === 1 && id !== 'del') || (n === 0 && dtorHot)
            return (
              <div key={slot.name} className={`fx-vt-slot${isHot ? ' fx-vt-slot--hot' : stepped ? ' fx-vt-slot--on' : ''}`}>
                <code>{slot.name}</code>
                <span className="fx-vt-fn">{slot.fn}</span>
              </div>
            )
          })}
        </div>
      </div>
      {id === 'derived' && recap ? (
        <div className="fx-buf-row" style={{ justifyContent: 'center' }}>
          {['w', 'o', 'o', 'f'].map((ch, n) => (
            <span key={n} className="fx-letter fx-letter--on">
              {ch}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''}`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
