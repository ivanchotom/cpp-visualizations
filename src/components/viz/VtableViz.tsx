import { useState } from 'react'

type Scene = 'derived' | 'base' | 'ctor'

const scenes: {
  id: Scene
  title: string
  vtable: string
  slots: { name: string; fn: string }[]
  highlight: number
  object: string[]
  note: string
}[] = [
  {
    id: 'derived',
    title: 'Dog via Animal*',
    vtable: 'Dog vtable',
    slots: [
      { name: '[0] dtor', fn: 'Dog::~Dog' },
      { name: '[1] speak', fn: 'Dog::speak  → "woof"' },
      { name: '[2] id', fn: 'Animal::id   (not overridden)' },
    ],
    highlight: 1,
    object: ['vptr  →  Dog vtable', 'Animal subobject', 'age = 5'],
    note: 'p->speak() loads the vptr, indexes slot 1, and calls Dog::speak. The static type of p is Animal* — the dynamic type is Dog.',
  },
  {
    id: 'base',
    title: 'Animal value',
    vtable: 'Animal vtable',
    slots: [
      { name: '[0] dtor', fn: 'Animal::~Animal' },
      { name: '[1] speak', fn: 'Animal::speak → "..."' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    highlight: 1,
    object: ['vptr  →  Animal vtable', 'Animal members only'],
    note: 'A by-value Animal has Animal’s vtable. Passing Dog by value into a Animal parameter slices — you lose the Dog vptr and the extra members.',
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
    highlight: 1,
    object: ['vptr  →  Animal (during Animal ctor)', 'Dog members not alive yet'],
    note: 'While Animal’s constructor runs, the object is not a Dog yet. Virtual calls use Animal’s vtable. Same story in reverse during ~Dog then ~Animal.',
  },
]

export function VtableViz() {
  const [id, setId] = useState<Scene>('derived')
  const s = scenes.find((x) => x.id === id) ?? scenes[0]

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {scenes.map((x) => (
            <button
              key={x.id}
              className={`chip${id === x.id ? ' chip--active' : ''}`}
              onClick={() => setId(x.id)}
            >
              {x.title}
            </button>
          ))}
        </div>
        <div className="vt-board">
          <div className="vt-object">
            <span className="tpl-kicker">object</span>
            {s.object.map((row) => (
              <div key={row} className="inh-row">
                {row}
              </div>
            ))}
          </div>
          <span className="pipe-arrow">vptr</span>
          <div className="vt-table">
            <span className="tpl-kicker">{s.vtable}</span>
            {s.slots.map((slot, i) => (
              <div
                key={slot.name}
                className={`vt-slot${i === s.highlight ? ' vt-slot--on' : ''}`}
              >
                <code>{slot.name}</code>
                <span>{slot.fn}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <aside className="viz-detail">
        <h3>{s.title}</h3>
        <p>{s.note}</p>
        <p className="detail-note">
          One vtable per polymorphic class. One vptr per object (two if two polymorphic bases).
          Give Animal a virtual destructor if you delete through Animal*.
        </p>
      </aside>
    </div>
  )
}
