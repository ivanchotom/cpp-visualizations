import { useEffect, useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Scene = 'derived' | 'slice' | 'ctor'

const SCENES: {
  id: Scene
  title: string
  vtable: string
  slots: { name: string; fn: string }[]
  object: string
  age: string
  vptr: string
  word: string
  code: string
  play: string
}[] = [
  {
    id: 'derived',
    title: 'Dog via Animal*',
    vtable: 'Dog vtable',
    slots: [
      { name: '[0] dtor', fn: 'Dog::~Dog' },
      { name: '[1] speak', fn: 'Dog::speak' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    object: 'Dog',
    age: 'age = 5',
    vptr: 'vptr → Dog',
    word: 'woof',
    code: `Animal* p = &dog;\np->speak();  // Dog::speak`,
    play: 'Play p->speak()',
  },
  {
    id: 'slice',
    title: 'Sliced Animal value',
    vtable: 'Animal vtable',
    slots: [
      { name: '[0] dtor', fn: 'Animal::~Animal' },
      { name: '[1] speak', fn: 'Animal::speak' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    object: 'Animal',
    age: 'Dog members gone',
    vptr: 'vptr → Animal',
    word: '…',
    code: `void take(Animal a);\ntake(dog);  // slice`,
    play: 'Play take(dog)',
  },
  {
    id: 'ctor',
    title: 'Inside Animal’s ctor',
    vtable: 'Animal vtable (temporary)',
    slots: [
      { name: '[0] dtor', fn: 'Animal::~Animal' },
      { name: '[1] speak', fn: 'Animal::speak' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    object: 'Dog storage',
    age: 'Dog not alive yet',
    vptr: 'vptr → Animal',
    word: '…',
    code: `Animal::Animal() {\n  speak();  // Animal::speak\n}`,
    play: 'Play speak() in ctor',
  },
]

export function VtableViz() {
  const [id, setId] = useState<Scene>('derived')
  const { i, playing, play, reset } = useBeats(4)
  const [flash, setFlash] = useState(false)
  const s = SCENES.find((x) => x.id === id) ?? SCENES[0]

  function select(next: string) {
    reset()
    setFlash(false)
    setId(next as Scene)
  }

  const weld = i >= 1
  const slotHot = i >= 2
  const said = i >= 3
  const sliced = id === 'slice'
  const ctorTrap = id === 'ctor'

  useEffect(() => {
    if (!said) {
      setFlash(false)
      return
    }
    setFlash(true)
    const t = window.setTimeout(() => setFlash(false), 520)
    return () => window.clearTimeout(t)
  }, [said, id])

  const caption =
    i === 0
      ? id === 'derived'
        ? 'Play p->speak(). The object holds a vptr. The table lives with the object — not in the call site.'
        : id === 'slice'
          ? 'Play the sliced call. Pass Dog by value into an Animal parameter and the Dog vptr is gone.'
          : 'Play speak() from Animal’s constructor. The object is not a Dog yet. Virtual calls use Animal’s table.'
      : i === 1
        ? 'Load the vptr. The cyan bar is an address stored in the object. Nothing hops across the canvas.'
        : i === 2
          ? `Index slot [1] speak → ${s.slots[1].fn}. Static type of p may be Animal*; the table is the dynamic type.`
          : id === 'derived'
            ? 'Dog::speak ran. woof. Virtual dtor belongs in the same table if you delete through Animal*.'
            : id === 'slice'
              ? 'Animal::speak. Extra Dog members were sliced off. Virtual calls cannot recover them.'
              : 'While Animal’s constructor runs, virtual calls use Animal’s vtable. Same story in reverse during ~Dog then ~Animal.'

  const tone = sliced && said ? 'warn' : ctorTrap && said ? 'warn' : said ? 'ok' : 'idle'
  const linkKind = sliced && weld ? 'dead' : weld ? 'on' : ''

  return (
    <SceneShell
      modes={SCENES.map((x) => ({ id: x.id, title: x.title }))}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setFlash(false)
        setId(id)
      }}
      playLabel={s.play}
      step={i}
      stepCount={4}
      sig={s.title}
      caption={caption}
      code={s.code}
      tone={tone}
    >
      <div className="fx-sh">
        <div className={`fx-pane${weld ? ' fx-pane--focus' : ''}${sliced && said ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">{s.object}</span>
          <div className={`fx-slot${weld ? ' fx-slot--focus' : ' fx-slot--dim'}${flash && said ? ' fx-slot--flash' : ''}`}>
            <span className="fx-kicker">vptr</span>
            <span className="fx-value">
              <code>{weld ? s.vptr : '—'}</code>
            </span>
            <span className="fx-note">{weld ? 'loaded from the object' : 'not read yet'}</span>
          </div>
          <div className={`fx-slot${sliced && said ? ' fx-slot--dim fx-pane--gone' : ''}`}>
            <span className="fx-kicker">members</span>
            <span className="fx-note">{s.age}</span>
            {said && <span className="fx-badge fx-badge--open">{s.word}</span>}
          </div>
        </div>
        <div className={`fx-link${linkKind ? ` fx-link--${linkKind}` : ''}`} />
        <div className={`fx-pane${slotHot ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">{s.vtable}</span>
          {s.slots.map((slot, n) => {
            const hot = n === 1 && slotHot
            const seen = n === 0 && slotHot
            return (
              <div
                key={slot.name}
                className={`fx-vt-slot${hot ? ' fx-vt-slot--hot' : seen ? ' fx-vt-slot--on' : weld ? ' fx-vt-slot--on' : ''}${
                  hot && flash ? ' fx-slot--flash-ref' : ''
                }`}
              >
                <code>{slot.name}</code>
                <span className="fx-vt-fn">{slot.fn}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          sliced && said ? 'fx-verdict--warn' : ctorTrap && said ? 'fx-verdict--warn' : said ? 'fx-verdict--ok' : ''
        }`}
      >
        {said
          ? `${s.slots[1].fn} · ${s.word}`
          : slotHot
            ? `vptr[1] → ${s.slots[1].fn}`
            : weld
              ? s.vptr
              : ''}
      </div>
    </SceneShell>
  )
}
