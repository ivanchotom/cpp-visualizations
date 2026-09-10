import { useState } from 'react'

type Kind = 'single' | 'multi' | 'diamond' | 'virtual'

interface Layout {
  id: Kind
  title: string
  blocks: { label: string; addr: string }[]
  note: string
}

const kinds: Layout[] = [
  {
    id: 'single',
    title: 'Single',
    blocks: [
      { label: 'vptr + Base', addr: '0x1000' },
      { label: 'Derived members', addr: '0x1008' },
    ],
    note: 'Derived* and Base* are usually the same address. One vptr if Base is polymorphic.',
  },
  {
    id: 'multi',
    title: 'Multiple',
    blocks: [
      { label: 'vptrA + BaseA', addr: '0x1000' },
      { label: 'vptrB + BaseB', addr: '0x1010' },
      { label: 'Derived extra', addr: '0x1020' },
    ],
    note: 'static_cast<BaseB*>(d) adds 0x10. That is this-adjustment — the bits in the pointer change.',
  },
  {
    id: 'diamond',
    title: 'Diamond',
    blocks: [
      { label: 'Base via A', addr: '0x1000' },
      { label: 'A extra', addr: '0x1008' },
      { label: 'Base via B', addr: '0x1010' },
      { label: 'B extra', addr: '0x1018' },
    ],
    note: 'Two Base subobjects. Two addresses for “the Base”. Ambiguous. Almost never what you wanted.',
  },
  {
    id: 'virtual',
    title: 'Virtual diamond',
    blocks: [
      { label: 'A (vbptr)', addr: '0x1000' },
      { label: 'B (vbptr)', addr: '0x1010' },
      { label: 'Derived extra', addr: '0x1020' },
      { label: 'shared Base', addr: '0x1030' },
    ],
    note: 'One Base, constructed by the most-derived class. vbptrs locate it. Heavier, correct is-a.',
  },
]

export function InheritanceViz() {
  const [id, setId] = useState<Kind>('multi')
  const [cast, setCast] = useState<'D' | 'A' | 'B'>('D')
  const k = kinds.find((x) => x.id === id) ?? kinds[0]
  const thisAddr =
    cast === 'B' && (id === 'multi' || id === 'diamond')
      ? k.blocks[id === 'multi' ? 1 : 2]?.addr
      : k.blocks[0]?.addr

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {kinds.map((x) => (
            <button
              key={x.id}
              className={`chip${id === x.id ? ' chip--active' : ''}`}
              onClick={() => {
                setId(x.id)
                setCast('D')
              }}
            >
              {x.title}
            </button>
          ))}
        </div>
        <div className="inh-stack">
          {k.blocks.map((row) => (
            <div
              key={row.label}
              className={`inh-row${row.addr === thisAddr ? ' inh-row--this' : ''}`}
            >
              <code>{row.addr}</code>
              {row.label}
            </div>
          ))}
        </div>
        <div className="stepper" style={{ marginTop: 12 }}>
          <button className={`chip${cast === 'D' ? ' chip--active' : ''}`} onClick={() => setCast('D')}>
            Derived* this
          </button>
          <button className={`chip${cast === 'A' ? ' chip--active' : ''}`} onClick={() => setCast('A')}>
            static_cast&lt;BaseA*&gt;
          </button>
          <button className={`chip${cast === 'B' ? ' chip--active' : ''}`} onClick={() => setCast('B')}>
            static_cast&lt;BaseB*&gt;
          </button>
        </div>
      </div>
      <aside className="viz-detail">
        <h3>{k.title}</h3>
        <p>
          <code>this</code> is {thisAddr}. {k.note}
        </p>
        <p className="detail-note">
          Typical Itanium-style sketch, not a Clang dump. Prefer composition unless you
          need runtime polymorphism. Public bases need a virtual destructor.
        </p>
      </aside>
    </div>
  )
}
