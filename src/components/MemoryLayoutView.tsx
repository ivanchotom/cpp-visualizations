import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  computeLayout,
  makeMember,
  memberTypes,
  type MemberType,
  type StructMember,
} from '../data/layout.ts'
import { centerOf, hop, waitNextBeat, type Point } from './viz/motion.ts'

const BYTE_PX = 34

const CHAR = memberTypes[0]
const INT = memberTypes[3]

const BAD: { type: MemberType; name: string }[] = [
  { type: CHAR, name: 'flag' },
  { type: INT, name: 'id' },
  { type: CHAR, name: 'ready' },
]

const GOOD: { type: MemberType; name: string }[] = [
  { type: INT, name: 'id' },
  { type: CHAR, name: 'flag' },
  { type: CHAR, name: 'ready' },
]

const initialMembers: StructMember[] = BAD.map((m) => makeMember(m.type, m.name))

const STEP_MS = 1300
const HOP_MS = 680

function membersFor(i: number): StructMember[] {
  if (i <= 0) return [makeMember(BAD[0].type, BAD[0].name)]
  if (i === 1) return [makeMember(BAD[0].type, BAD[0].name), makeMember(BAD[1].type, BAD[1].name)]
  if (i === 2 || i === 3) return BAD.map((m) => makeMember(m.type, m.name))
  return GOOD.map((m) => makeMember(m.type, m.name))
}

const HINTS = [
  'Start with char flag. Alignment is 1 — no padding yet.',
  'int wants offset 0 mod 4. Three padding bytes appear so id can sit at 4.',
  'char ready sits at 8, then the struct rounds up to alignof = 4. Trailing padding. sizeof is 12.',
  'Packed size is 6. Padding is 6. Order is costing you half the object.',
  'Largest-first: int, then the two chars. sizeof drops to 8. Padding is only the tail.',
]

const CODES = [
  `struct Bad { char flag; };`,
  `struct Bad { char flag; int id; };`,
  `struct Bad { char flag; int id; char ready; };`,
  `sizeof(Bad);  // 12, packed 6`,
  `struct Good { int id; char flag; char ready; };
sizeof(Good);  // 8`,
]

export function MemoryLayoutView() {
  const [members, setMembers] = useState<StructMember[]>(initialMembers)
  const [i, setI] = useState(2)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 40, y: 40 })
  const [to, setTo] = useState<Point>({ x: 180, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const layout = useMemo(() => computeLayout(members), [members])
  const naiveSize = useMemo(() => members.reduce((sum, m) => sum + m.type.size, 0), [members])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(srcRef.current, origin))
    setTo(centerOf(dstRef.current, origin))
  }, [i, members])

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
      if (i >= 4) {
        setPlaying(false)
        setHopT(1)
        return
      }
      const next = i + 1
      setI(next)
      setMembers(membersFor(next))
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stop()
    }
  }, [playing, i])

  function play() {
    setI(0)
    setMembers(membersFor(0))
    setHopT(0)
    setPlaying(true)
  }

  function addMember(type: MemberType) {
    if (playing) return
    const count = members.filter((m) => m.type.name === type.name).length
    const base = type.name.replace(/[^a-z0-9]/gi, '') || 'field'
    setMembers((prev) => [...prev, makeMember(type, `${base}${count > 0 ? count : ''}`)])
  }

  function removeMember(id: string) {
    if (playing) return
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function reset() {
    setPlaying(false)
    setI(2)
    setHopT(1)
    setMembers(BAD.map((m) => makeMember(m.type, m.name)))
  }

  const pos = hopT < 1 && i < 3 ? hop(from, to, hopT) : null
  const flyer = i === 0 ? 'char' : i === 1 ? 'int' : i === 2 ? 'char' : null
  const packed = i >= 4

  const lastMember = layout.slots.filter((s) => s.kind === 'member').slice(-1)[0]

  return (
    <div className="viz-root">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play Bad then pack Good
        </button>
        {memberTypes.map((t) => (
          <button key={t.name} className="chip" onClick={() => addMember(t)} disabled={playing}>
            + <code>{t.name}</code>
          </button>
        ))}
        <button className="chip chip--ghost" onClick={reset}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage lay-stage viz-stage--live${layout.paddingBytes > 0 ? ' lay-stage--pad' : ''}${packed ? ' lay-stage--good' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/5 · sizeof {layout.totalSize}
          {layout.paddingBytes > 0 ? ` · pad ${layout.paddingBytes}` : ''}
          {packed ? ' · packed' : ''}
        </p>
        <div className="lf-beats" aria-hidden>
          {HINTS.map((_, n) => (
            <span key={n} className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}`} />
          ))}
        </div>
        <div className="lay-top">
          <div ref={srcRef} className="inh-call">
            <span className="tpl-kicker">incoming</span>
            <code>{flyer ?? (packed ? 'Good' : 'member')}</code>
          </div>
          <div className="layout-stats">
            <div className="stat">
              <span className="stat-value">{layout.totalSize}</span>
              <span className="stat-label">sizeof</span>
            </div>
            <div className="stat">
              <span className={`stat-value${layout.paddingBytes > 0 ? ' stat-value--warn' : ''}`}>{layout.paddingBytes}</span>
              <span className="stat-label">padding</span>
            </div>
            <div className="stat">
              <span className="stat-value">{naiveSize}</span>
              <span className="stat-label">packed</span>
            </div>
          </div>
        </div>
        <div className="byte-map">
          {layout.slots.map((slot) => {
            const isDst = lastMember && slot.kind === 'member' && slot.label === lastMember.label && slot.offset === lastMember.offset
            return (
              <div
                key={`${slot.kind}-${slot.offset}`}
                ref={isDst ? dstRef : undefined}
                className={`slot slot--${slot.kind}${slot.kind === 'padding' ? ' slot--pad-hot' : ''}`}
                style={{ width: slot.size * BYTE_PX }}
              >
                <span className="slot-offset">{slot.offset}</span>
                <span className="slot-label">{slot.kind === 'padding' ? 'padding' : slot.label}</span>
              </div>
            )
          })}
        </div>
        {pos && flyer && (
          <span className="lay-flyer" style={{ left: pos.x, top: pos.y }}>
            {flyer}
          </span>
        )}
        {packed && <span className="ex-caught-flag">sizeof 8</span>}
        {i === 3 && <span className="ct-flag">waste 6</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{CODES[Math.min(i, CODES.length - 1)]}</code>
      </pre>
      <p className="layout-hint">{HINTS[Math.min(i, HINTS.length - 1)]}</p>

      <div className="layout-grid">
        <div className="struct-source">
          <div className="struct-source-head">struct Example {'{'}</div>
          {members.length === 0 && <div className="struct-empty">add members above…</div>}
          {members.map((m) => (
            <div key={m.id} className="struct-line">
              <code>
                <span className="kw">{m.type.name}</span> {m.fieldName};
              </code>
              <button className="struct-remove" onClick={() => removeMember(m.id)} aria-label={`remove ${m.fieldName}`} disabled={playing}>
                ×
              </button>
            </div>
          ))}
          <div className="struct-source-head">{'}'};</div>
        </div>
      </div>
    </div>
  )
}
