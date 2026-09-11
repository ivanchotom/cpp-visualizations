import { useMemo, useState } from 'react'
import {
  computeLayout,
  makeMember,
  memberTypes,
  type MemberType,
  type StructMember,
} from '../data/layout.ts'
import { SceneShell } from './viz/scene/SceneShell.tsx'
import { useBeats } from './viz/scene/useBeats.ts'

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

function membersFor(step: number): StructMember[] {
  if (step <= 0) return [makeMember(BAD[0].type, BAD[0].name)]
  if (step === 1) return [makeMember(BAD[0].type, BAD[0].name), makeMember(BAD[1].type, BAD[1].name)]
  if (step === 2 || step === 3) return BAD.map((m) => makeMember(m.type, m.name))
  return GOOD.map((m) => makeMember(m.type, m.name))
}

const HINTS = [
  'Start with char flag. Alignment is 1 — no padding yet. Play Bad then pack Good.',
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
  `struct Good { int id; char flag; char ready; };\nsizeof(Good);  // 8`,
]

export function MemoryLayoutView() {
  const { i, playing, play, reset } = useBeats(5)
  const [custom, setCustom] = useState<StructMember[] | null>(null)

  const members = custom && !playing ? custom : membersFor(i)
  const layout = useMemo(() => computeLayout(members), [members])
  const naiveSize = useMemo(() => members.reduce((sum, m) => sum + m.type.size, 0), [members])
  const packed = i >= 4 && !custom
  const waste = i === 3 && !custom

  function addMember(type: MemberType) {
    if (playing) return
    const count = members.filter((m) => m.type.name === type.name).length
    const base = type.name.replace(/[^a-z0-9]/gi, '') || 'field'
    setCustom([...members, makeMember(type, `${base}${count > 0 ? count : ''}`)])
  }

  function removeMember(id: string) {
    if (playing) return
    setCustom(members.filter((m) => m.id !== id))
  }

  function onPlay() {
    setCustom(null)
    play()
  }

  function onReset() {
    setCustom(null)
    reset()
  }

  const tone = packed ? 'ok' : waste ? 'warn' : layout.paddingBytes > 0 ? 'warn' : 'idle'

  return (
    <SceneShell
      playing={playing}
      onPlay={onPlay}
      onReset={onReset}
      playLabel="Play Bad then pack Good"
      step={i}
      stepCount={5}
      sig={`sizeof ${layout.totalSize}`}
      caption={custom ? 'Builder mode. Padding hatches in place when alignment demands it. Play to walk Bad then Good.' : HINTS[i]}
      code={custom ? members.map((m) => `${m.type.name} ${m.fieldName};`).join('\n') : CODES[i]}
      tone={tone}
      footer={
        <>
          <div className="stepper">
            {memberTypes.map((t) => (
              <button key={t.name} className="chip" onClick={() => addMember(t)} disabled={playing}>
                + <code>{t.name}</code>
              </button>
            ))}
          </div>
          <div className="fx-pane fx-footer-gap">
            <span className="fx-kicker">struct Example {'{'}</span>
            {members.length === 0 && <span className="fx-note">add members above…</span>}
            {members.map((m) => (
              <div key={m.id} className="fx-struct-line">
                <code>
                  {m.type.name} {m.fieldName};
                </code>
                <button className="chip chip--ghost" onClick={() => removeMember(m.id)} disabled={playing} type="button">
                  ×
                </button>
              </div>
            ))}
            <span className="fx-kicker">{'}'};</span>
          </div>
        </>
      }
    >
      <div className="fx-stats">
        <div className="fx-stat">
          <span className="fx-value">{layout.totalSize}</span>
          <span className="fx-kicker">sizeof</span>
        </div>
        <div className="fx-stat">
          <span className={`fx-value${layout.paddingBytes > 0 ? ' fx-stat--warn' : ''}`}>{layout.paddingBytes}</span>
          <span className="fx-kicker">padding</span>
        </div>
        <div className="fx-stat">
          <span className="fx-value">{naiveSize}</span>
          <span className="fx-kicker">packed</span>
        </div>
      </div>
      <div className="fx-buf-row">
        {layout.slots.flatMap((slot) =>
          Array.from({ length: slot.size }, (_, n) => (
            <span
              key={`${slot.kind}-${slot.offset}-${n}`}
              className={`fx-letter${slot.kind === 'padding' ? ' fx-letter--pad' : ' fx-letter--on'}`}
              title={`${slot.kind} @ ${slot.offset + n}`}
            >
              {slot.kind === 'padding' ? 'pad' : (slot.label ?? '').slice(0, 3)}
            </span>
          )),
        )}
      </div>
      <div
        className={`fx-verdict${i >= 2 || custom ? ' fx-verdict--show' : ''} ${
          packed ? 'fx-verdict--ok' : waste ? 'fx-verdict--warn' : layout.paddingBytes > 0 ? 'fx-verdict--warn' : ''
        }`}
      >
        {packed
          ? 'int first · sizeof 8 · tail pad only'
          : waste
            ? 'sizeof 12 · packed 6 · order wasted 6'
            : layout.paddingBytes > 0
              ? `${layout.paddingBytes} pad bytes · hatched, not flying`
              : ''}
      </div>
    </SceneShell>
  )
}
