import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  cppTypes,
  categoryLabels,
  categoryColors,
  type CppType,
  type TypeCategory,
} from '../data/types.ts'
import { centerOf, hop, waitNextBeat, type Point } from './viz/motion.ts'

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

interface RankFrame {
  name: string
  bytes: number
  color: string
  trap: boolean
  hint: string
  code: string
}

const RANK: RankFrame[] = [
  {
    name: 'char',
    bytes: 1,
    color: categoryColors.character,
    trap: false,
    hint: 'sizeof(char) is 1 by definition. The ranking starts here.',
    code: `sizeof(char) == 1`,
  },
  {
    name: 'short',
    bytes: 2,
    color: categoryColors.integer,
    trap: false,
    hint: 'short is at least 16 bits. Typically 2 bytes.',
    code: `sizeof(char) <= sizeof(short)`,
  },
  {
    name: 'int',
    bytes: 4,
    color: categoryColors.integer,
    trap: false,
    hint: 'int is the default integer. Typically 32 bits — not guaranteed, but ranking is.',
    code: `sizeof(short) <= sizeof(int)`,
  },
  {
    name: 'long',
    bytes: 8,
    color: categoryColors.integer,
    trap: false,
    hint: 'LP64 (Linux/macOS): long is 8. Windows LLP64 keeps long at 4. Do not assume.',
    code: `sizeof(int) <= sizeof(long)  // 8 on LP64`,
  },
  {
    name: 'void*',
    bytes: 8,
    color: categoryColors.pointer,
    trap: false,
    hint: 'A pointer is an address. 8 bytes on 64-bit. Use nullptr, never NULL.',
    code: `void* p = nullptr;  // 8 bytes on LP64`,
  },
  {
    name: 'int / unsigned',
    bytes: 4,
    color: categoryColors.integer,
    trap: true,
    hint: '−1 converts to a huge unsigned before the compare. −1 < 1u is false. Mixing signed and unsigned is a classic trap.',
    code: `-1 < 1u;  // false — −1 becomes UINT_MAX`,
  },
]

const STEP_MS = 1300
const HOP_MS = 640

export function DataTypesView() {
  const [active, setActive] = useState<TypeCategory | 'all'>('all')
  const [selected, setSelected] = useState<CppType>(cppTypes[0])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 40, y: 40 })
  const [to, setTo] = useState<Point>({ x: 200, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const f = RANK[Math.min(i, RANK.length - 1)]

  const visible = useMemo(
    () => (active === 'all' ? cppTypes : cppTypes.filter((t) => t.category === active)),
    [active],
  )

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(srcRef.current, origin))
    setTo(centerOf(dstRef.current, origin))
  }, [i])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stop = waitNextBeat(STEP_MS, () => {
      if (i >= RANK.length - 1) {
        setPlaying(false)
        setHopT(1)
        return
      }
      setI(i + 1)
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stop()
    }
  }, [playing, i])

  useEffect(() => {
    const match = cppTypes.find((t) => t.name === f.name)
    if (match) setSelected(match)
  }, [f.name])

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = hopT < 1 ? hop(from, to, hopT) : null

  return (
    <div className="viz-root">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play LP64 ranking then −1 &lt; 1u
        </button>
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={playing || i === 0}>
          ◂ prev
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(RANK.length - 1, n + 1))} disabled={playing || i === RANK.length - 1}>
          next ▸
        </button>
        <button
          className="chip chip--ghost"
          onClick={() => {
            setPlaying(false)
            setI(0)
            setHopT(1)
          }}
        >
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ty-stage viz-stage--live${f.trap ? ' ty-stage--trap' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{RANK.length} · {f.trap ? 'signed/unsigned' : f.name}
        </p>
        <div className="lf-beats" aria-hidden>
          {RANK.map((_, n) => (
            <span
              key={n}
              className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${n === RANK.length - 1 ? ' lf-beat--dtor' : ''}`}
            />
          ))}
        </div>
        {f.trap ? (
          <div className="ty-trap">
            <div ref={srcRef} className="own-card">
              <span className="lf-tag">signed</span>
              <span className="own-name">-1</span>
              <span className="mem-note">int</span>
            </div>
            <span className="pipe-arrow">&lt;</span>
            <div className="own-card own-card--shared">
              <span className="lf-tag">unsigned</span>
              <span className="own-name">1u</span>
              <span className="mem-note">unsigned int</span>
            </div>
            <div ref={dstRef} className="own-card own-card--unique">
              <span className="lf-tag">usual arithmetic</span>
              <span className="own-name">UINT_MAX</span>
              <span className="mem-note">-1 converted</span>
            </div>
          </div>
        ) : (
          <div className="ty-rank">
            <div ref={srcRef} className="ty-name">
              <span className="tpl-kicker">type</span>
              <code>{f.name}</code>
            </div>
            <div ref={dstRef} className="ty-bytes">
              {Array.from({ length: f.bytes }, (_, n) => (
                <span key={n} className="ty-cell" style={{ background: f.color }} />
              ))}
              <span className="ty-width">
                {f.bytes} byte{f.bytes === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        )}
        {pos && (
          <span className={`ty-flyer${f.trap ? ' ty-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {f.trap ? '-1' : f.name}
          </span>
        )}
        {f.trap && <span className="sf-hard">false</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{f.code}</code>
      </pre>
      <p className="layout-hint">{f.hint}</p>

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
    </div>
  )
}
