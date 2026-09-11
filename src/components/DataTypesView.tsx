import { useEffect, useMemo, useState } from 'react'
import {
  cppTypes,
  categoryLabels,
  categoryColors,
  type CppType,
  type TypeCategory,
} from '../data/types.ts'
import { SceneShell } from './viz/scene/SceneShell.tsx'
import { useBeats } from './viz/scene/useBeats.ts'

const filters: Array<{ id: TypeCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'integer', label: 'Integer' },
  { id: 'floating', label: 'Floating point' },
  { id: 'character', label: 'Character' },
  { id: 'boolean', label: 'Boolean' },
  { id: 'pointer', label: 'Pointer' },
]

function ByteBar({ bytes, color }: { bytes: number; color: string }) {
  const cells = Array.from({ length: bytes }, (_, n) => n)
  return (
    <div className="byte-bar" title={`${bytes} byte${bytes === 1 ? '' : 's'} = ${bytes * 8} bits`}>
      {cells.map((n) => (
        <span key={n} className="byte-cell" style={{ background: color }} />
      ))}
    </div>
  )
}

const RANK: { name: string; bytes: number; color: string; hint: string; code: string }[] = [
  {
    name: 'char',
    bytes: 1,
    color: categoryColors.character,
    hint: 'sizeof(char) is 1 by definition. The ranking of integer types starts here.',
    code: `sizeof(char) == 1`,
  },
  {
    name: 'short',
    bytes: 2,
    color: categoryColors.integer,
    hint: 'short is at least 16 bits. Typically 2 bytes. Ranking is required; exact width is not.',
    code: `sizeof(char) <= sizeof(short)`,
  },
  {
    name: 'int',
    bytes: 4,
    color: categoryColors.integer,
    hint: 'int is the default integer. Typically 32 bits — not guaranteed, but ranking is.',
    code: `sizeof(short) <= sizeof(int)`,
  },
  {
    name: 'long',
    bytes: 8,
    color: categoryColors.integer,
    hint: 'LP64 (Linux/macOS): long is 8. Windows LLP64 keeps long at 4. Do not assume.',
    code: `sizeof(int) <= sizeof(long)  // 8 on LP64`,
  },
  {
    name: 'void*',
    bytes: 8,
    color: categoryColors.pointer,
    hint: 'A pointer is an address. 8 bytes on 64-bit. Use nullptr, never NULL.',
    code: `void* p = nullptr;  // 8 bytes on LP64`,
  },
]

export function DataTypesView() {
  const [active, setActive] = useState<TypeCategory | 'all'>('all')
  const [selected, setSelected] = useState<CppType>(cppTypes[0])
  const { i, playing, play, reset, jump } = useBeats(6)

  const trap = i >= 5
  const rankI = Math.min(i, 4)
  const f = trap ? null : RANK[rankI]

  const visible = useMemo(
    () => (active === 'all' ? cppTypes : cppTypes.filter((t) => t.category === active)),
    [active],
  )

  useEffect(() => {
    if (f) {
      const match = cppTypes.find((t) => t.name === f.name)
      if (match) setSelected(match)
    }
  }, [f])

  const caption = trap
    ? 'Usual arithmetic conversions: −1 is converted to unsigned before <. −1 < 1u is false. Mixing signed and unsigned is a classic trap.'
    : (f?.hint ?? '')

  const code = trap ? `-1 < 1u;  // false — −1 becomes UINT_MAX` : (f?.code ?? '')

  return (
    <SceneShell
      playing={playing}
      onPlay={play}
      onReset={reset}
      playLabel="Play LP64 ranking then −1 < 1u"
      step={i}
      stepCount={6}
      sig={trap ? 'signed / unsigned' : f?.name}
      caption={caption}
      code={code}
      tone={trap ? 'trap' : 'idle'}
      footer={
        <>
          <div className="filters">
            {filters.map((fil) => (
              <button
                key={fil.id}
                className={`chip${active === fil.id ? ' chip--active' : ''}`}
                onClick={() => setActive(fil.id)}
                disabled={playing}
              >
                {fil.label}
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
                  onClick={() => {
                    if (playing) return
                    setSelected(t)
                  }}
                >
                  <span className="type-name">
                    <span className="type-dot" style={{ background: categoryColors[t.category] }} />
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
              <div className="detail-badge" style={{ background: categoryColors[selected.category] }}>
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
        </>
      }
    >
      {trap ? (
        <div className="fx-compare">
          <div className="fx-slot fx-slot--trap">
            <span className="fx-kicker">signed int</span>
            <span className="fx-value">-1</span>
            <span className="fx-note">what you wrote</span>
          </div>
          <span className="fx-op">&lt;</span>
          <div className="fx-slot fx-slot--focus">
            <span className="fx-kicker">unsigned int</span>
            <span className="fx-value">1u</span>
            <span className="fx-note">usual conversions</span>
          </div>
          <span className="fx-op">→</span>
          <div className="fx-slot fx-slot--trap">
            <span className="fx-kicker">after conversion</span>
            <span className="fx-value">UINT_MAX</span>
            <span className="fx-note">-1 converted, then compared</span>
          </div>
        </div>
      ) : (
        <div className="fx-ladder">
          {RANK.map((row, n) => (
            <button
              key={row.name}
              type="button"
              className={`fx-rank${n === rankI ? ' fx-rank--on' : ''}${n < rankI ? ' fx-rank--done' : ''}`}
              onClick={() => jump(n)}
            >
              <code>{row.name}</code>
              <span className="fx-cells">
                {Array.from({ length: row.bytes }, (_, b) => (
                  <span
                    key={b}
                    className={`fx-cell${n <= rankI ? ' fx-cell--on' : ''}`}
                    style={{ background: n <= rankI ? row.color : undefined }}
                  />
                ))}
              </span>
              <span className="fx-note">
                {row.bytes} B
              </span>
            </button>
          ))}
        </div>
      )}
      <div className={`fx-verdict${trap ? ' fx-verdict--show fx-verdict--trap' : ''}`}>
        {trap ? '-1 < 1u  →  false' : ''}
      </div>
    </SceneShell>
  )
}
