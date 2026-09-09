import { useState } from 'react'

type Kind = 'single' | 'multi' | 'diamond' | 'virtual'

const kinds: { id: Kind; title: string; layout: string[]; note: string }[] = [
  {
    id: 'single',
    title: 'Single',
    layout: ['vptr + Base members', 'Derived members'],
    note: 'One vptr if Base is polymorphic. Derived* converts to Base*. Typical “is-a.”',
  },
  {
    id: 'multi',
    title: 'Multiple',
    layout: ['vptr + BaseA', 'vptr + BaseB', 'Derived members'],
    note: 'Two base subobjects, two vptrs if both are polymorphic. Pointer conversion adjusts the address.',
  },
  {
    id: 'diamond',
    title: 'Diamond (non-virtual)',
    layout: ['Base (via A)', 'A extra', 'Base (via B)', 'B extra', 'Derived'],
    note: 'Two Base subobjects. Ambiguous if you name a Base member. Almost never what you wanted.',
  },
  {
    id: 'virtual',
    title: 'Virtual diamond',
    layout: ['A (vbptr)', 'B (vbptr)', 'Derived extra', 'shared Base'],
    note: 'One Base, constructed by the most-derived class. vbptrs locate it. Heavier layout, correct “is-a.”',
  },
]

export function InheritanceViz() {
  const [id, setId] = useState<Kind>('single')
  const k = kinds.find((x) => x.id === id) ?? kinds[0]

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {kinds.map((x) => (
            <button
              key={x.id}
              className={`chip${id === x.id ? ' chip--active' : ''}`}
              onClick={() => setId(x.id)}
            >
              {x.title}
            </button>
          ))}
        </div>
        <div className="inh-stack">
          {k.layout.map((row) => (
            <div key={row} className="inh-row">
              {row}
            </div>
          ))}
        </div>
      </div>
      <aside className="viz-detail">
        <h3>{k.title}</h3>
        <p>{k.note}</p>
        <p className="detail-note">
          Prefer composition unless you need runtime polymorphism. If you inherit publicly,
          give Base a virtual destructor.
        </p>
      </aside>
    </div>
  )
}
