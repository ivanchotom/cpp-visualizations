import { useMemo, useState } from 'react'
import {
  cppTypes,
  categoryLabels,
  categoryColors,
  type CppType,
  type TypeCategory,
} from '../data/types.ts'

const filters: Array<{ id: TypeCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'integer', label: 'Integer' },
  { id: 'floating', label: 'Floating point' },
  { id: 'character', label: 'Character' },
  { id: 'boolean', label: 'Boolean' },
  { id: 'pointer', label: 'Pointer' },
]

function ByteBar({ bytes, color }: { bytes: number; color: string }) {
  const cells = Array.from({ length: bytes }, (_, i) => i)
  return (
    <div className="byte-bar" title={`${bytes} byte${bytes === 1 ? '' : 's'} = ${bytes * 8} bits`}>
      {cells.map((i) => (
        <span key={i} className="byte-cell" style={{ background: color }} />
      ))}
    </div>
  )
}

export function DataTypesView() {
  const [active, setActive] = useState<TypeCategory | 'all'>('all')
  const [selected, setSelected] = useState<CppType>(cppTypes[0])

  const visible = useMemo(
    () => (active === 'all' ? cppTypes : cppTypes.filter((t) => t.category === active)),
    [active],
  )

  return (
    <div className="viz-root">
      <div className="filters">
        {filters.map((f) => (
          <button
            key={f.id}
            className={`chip${active === f.id ? ' chip--active' : ''}`}
            onClick={() => setActive(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="types-grid">
        <div className="type-table" role="table">
          <div className="type-row type-row--head" role="row">
            <span>Type</span>
            <span>Size</span>
            <span className="hide-narrow">Width</span>
            <span className="hide-narrow">Range</span>
          </div>
          {visible.map((t) => (
            <button
              key={t.name}
              className={`type-row${selected.name === t.name ? ' type-row--active' : ''}`}
              role="row"
              onClick={() => setSelected(t)}
            >
              <span className="type-name">
                <span
                  className="type-dot"
                  style={{ background: categoryColors[t.category] }}
                />
                <code>{t.name}</code>
              </span>
              <span className="type-size">
                {t.bytes} <small>byte{t.bytes === 1 ? '' : 's'}</small>
              </span>
              <span className="hide-narrow">
                <ByteBar bytes={t.bytes} color={categoryColors[t.category]} />
              </span>
              <span className="type-range hide-narrow">{t.range}</span>
            </button>
          ))}
        </div>

        <aside className="detail-card" aria-live="polite">
          <div
            className="detail-badge"
            style={{ background: categoryColors[selected.category] }}
          >
            {categoryLabels[selected.category]}
          </div>
          <h2>
            <code>{selected.name}</code>
          </h2>
          <ByteBar bytes={selected.bytes} color={categoryColors[selected.category]} />
          <dl className="detail-list">
            <div>
              <dt>Size</dt>
              <dd>
                {selected.bytes} bytes ({selected.bytes * 8} bits)
              </dd>
            </div>
            <div>
              <dt>Range</dt>
              <dd>{selected.range}</dd>
            </div>
            {selected.signed !== undefined && (
              <div>
                <dt>Signedness</dt>
                <dd>{selected.signed ? 'signed' : 'unsigned'}</dd>
              </div>
            )}
          </dl>
          <p className="detail-note">{selected.note}</p>
        </aside>
      </div>
    </div>
  )
}
