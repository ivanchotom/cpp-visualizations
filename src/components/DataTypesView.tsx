import { useMemo, useState } from 'react'
import {
  cppTypes,
  categoryLabels,
  categoryColors,
  type CppType,
  type TypeCategory,
} from '../data/types.ts'
import { SceneShell } from './viz/scene/SceneShell.tsx'
import { useBeats } from './viz/scene/useBeats.ts'

type Mode = 'rank' | 'mix' | 'long' | 'null'

const MODES: { id: Mode; title: string }[] = [
  { id: 'rank', title: 'ranking' },
  { id: 'mix', title: '-1 < 1u' },
  { id: 'long', title: 'long' },
  { id: 'null', title: 'nullptr' },
]

const RANK: { name: string; bytes: number }[] = [
  { name: 'char', bytes: 1 },
  { name: 'short', bytes: 2 },
  { name: 'int', bytes: 4 },
  { name: 'long', bytes: 8 },
]

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

export function DataTypesView() {
  const [id, setId] = useState<Mode>('rank')
  const [active, setActive] = useState<TypeCategory | 'all'>('all')
  const [selected, setSelected] = useState<CppType>(cppTypes[0])
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const lit = id === 'rank' ? (i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 3 : 4) : 0
  const mixTrap = id === 'mix' && decided
  const lp64 = id === 'long' && stepped
  const llp64 = id === 'long' && decided
  const nil = id === 'null' && stepped

  const visible = useMemo(
    () => (active === 'all' ? cppTypes : cppTypes.filter((t) => t.category === active)),
    [active],
  )

  const code =
    id === 'rank'
      ? recap
        ? `sizeof(char) <= sizeof(short)
  <= sizeof(int) <= sizeof(long);
// ranking is required; widths are not`
        : `sizeof(char) == 1;  // by definition`
      : id === 'mix'
        ? recap
          ? `-1 < 1u;  // false
// −1 became UINT_MAX`
          : `-1 < 1u;`
        : id === 'long'
          ? recap
            ? `// LP64:  long is 8
// LLP64: long is 4  (Windows)
std::int64_t k = 0;  // when width is the contract`
            : `sizeof(long);  // 8 on LP64, 4 on LLP64`
          : recap
            ? `void* p = nullptr;  // std::nullptr_t
// NULL is a macro; 0 is an int`
            : `void* p = nullptr;`

  const caption =
    i === 0
      ? id === 'rank'
        ? 'Play ranking. The standard guarantees relative order, not exact widths. This sheet is typical LP64 (Linux/macOS).'
        : id === 'mix'
          ? 'Play −1 < 1u. Mixing signed and unsigned in a comparison converts the signed operand. The result is often the opposite of what you meant.'
          : id === 'long'
            ? 'Play long. LP64 (Linux/macOS) makes long 8. Windows LLP64 keeps long at 4. Do not assume.'
            : 'Play nullptr. Use nullptr (type std::nullptr_t), never NULL or 0, for pointers.'
      : id === 'rank' && i === 1
        ? 'sizeof(char) is 1 by definition. short is at least 16 bits. Ranking is required; CHAR_BIT is usually 8.'
        : id === 'rank' && i === 2
          ? 'int is the default integer. Typically 32 bits — not guaranteed. Use <cstdint> when the width is the contract.'
          : id === 'rank'
            ? 'long is 8 on this LP64 machine. long long is at least 64 bits everywhere. Ranking: char ≤ short ≤ int ≤ long ≤ long long.'
            : id === 'mix' && i === 1
              ? 'Left is signed −1. Right is unsigned 1u. Usual arithmetic conversions pick unsigned int.'
              : id === 'mix' && i === 2
                ? '−1 converted to unsigned is UINT_MAX. UINT_MAX < 1u is false. The comparison did exactly what the conversions asked.'
                : id === 'mix'
                  ? 'Write the types, or compare in a signed domain. −1 < 1u is the classic trap, not a compiler bug.'
                  : id === 'long' && i === 1
                    ? 'LP64: int 4, long 8, pointer 8. Linux and macOS. Cells light 8 on long.'
                    : id === 'long' && i === 2
                      ? 'LLP64 (Windows): long stays 4. Pointers are still 8. sizeof(long) is not a portable 64-bit check.'
                      : id === 'long'
                        ? 'When the width is the contract, write std::int64_t or long long. int is the default when it is not.'
                        : i === 1
                          ? 'nullptr is a keyword. Type is std::nullptr_t. It converts to any pointer type.'
                          : i === 2
                            ? 'NULL is a macro (often 0). 0 is an int. Overload sets treat them differently from nullptr.'
                            : 'Use nullptr. That is the C++11/14 spelling. 8 bytes on LP64 — it is an address, not an integer 0.'

  const tone = mixTrap ? 'trap' : llp64 ? 'warn' : recap && id !== 'mix' ? 'ok' : 'idle'
  const playLabel =
    id === 'rank' ? 'Play ranking' : id === 'mix' ? 'Play -1 < 1u' : id === 'long' ? 'Play long' : 'Play nullptr'

  const verdict =
    id === 'rank' && recap
      ? 'char ≤ short ≤ int ≤ long'
      : id === 'rank' && decided
        ? 'int · default integer'
        : id === 'rank' && stepped
          ? 'char is 1 · short ≥ 16 bits'
          : mixTrap && recap
            ? '−1 < 1u → false'
            : mixTrap
              ? '−1 became UINT_MAX'
              : id === 'mix' && stepped
                ? 'usual conversions → unsigned'
                : llp64 && recap
                  ? 'do not assume long is 8'
                  : llp64
                    ? 'LLP64 · long is 4'
                    : lp64
                      ? 'LP64 · long is 8'
                      : id === 'null' && recap
                        ? 'nullptr · not NULL, not 0'
                        : nil && decided
                          ? 'std::nullptr_t · any pointer'
                          : nil
                            ? 'keyword · not an int'
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
      {id === 'rank' && (
        <div className="fx-ladder">
          {RANK.map((row, n) => (
            <div
              key={row.name}
              className={`fx-rank${n < lit ? ' fx-rank--on' : ''}${n < lit - 1 ? ' fx-rank--done' : ''}`}
            >
              <code>{row.name}</code>
              <span className="fx-cells">
                {Array.from({ length: row.bytes }, (_, b) => (
                  <span key={b} className={`fx-cell${n < lit ? ' fx-cell--on' : ''}`} />
                ))}
              </span>
              <span className="fx-note">{row.bytes} B</span>
            </div>
          ))}
        </div>
      )}
      {id === 'mix' && (
        <div className="fx-compare">
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">signed int</span>
            <span className="fx-value">-1</span>
            <span className="fx-note">what you wrote</span>
          </div>
          <span className="fx-op">&lt;</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">unsigned int</span>
            <span className="fx-value">1u</span>
            <span className="fx-note">usual conversions</span>
          </div>
          <span className="fx-op">→</span>
          <div className={`fx-slot${mixTrap ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">after conversion</span>
            <span className="fx-value">{mixTrap ? 'max' : '—'}</span>
            <span className="fx-note">{mixTrap ? 'UINT_MAX' : 'waiting'}</span>
          </div>
        </div>
      )}
      {id === 'long' && (
        <div className="fx-sh">
          <div className={`fx-pane${lp64 ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">LP64</span>
            <div className={`fx-slot${lp64 ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">long</span>
              <span className="fx-value">{lp64 ? '8' : '—'}</span>
              <span className="fx-note">Linux / macOS</span>
            </div>
          </div>
          <div className={`fx-link${llp64 ? ' fx-link--dead' : lp64 ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${llp64 ? ' fx-pane--focus' : ''}${llp64 ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">LLP64</span>
            <div className={`fx-slot${llp64 ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">long</span>
              <span className="fx-value">{llp64 ? '4' : '—'}</span>
              <span className="fx-note">Windows</span>
            </div>
          </div>
        </div>
      )}
      {id === 'null' && (
        <div className="fx-sh">
          <div className={`fx-pane${nil ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">keyword</span>
            <div className={`fx-slot${nil ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">nullptr</span>
              <span className="fx-value">{nil ? 'null' : '—'}</span>
              <span className="fx-note">std::nullptr_t</span>
            </div>
          </div>
          <div className={`fx-link${decided ? ' fx-link--dead' : nil ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">not these</span>
            <div className={`fx-slot${decided ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">NULL / 0</span>
              <span className="fx-value">{decided ? 'int' : '—'}</span>
              <span className="fx-note">macro / integer</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          mixTrap || (llp64 && recap) ? (mixTrap ? 'fx-verdict--trap' : 'fx-verdict--warn') : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
