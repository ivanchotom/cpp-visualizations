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

type Mode = 'bad' | 'good' | 'ebo' | 'wire'

const MODES: { id: Mode; title: string }[] = [
  { id: 'bad', title: 'Bad' },
  { id: 'good', title: 'Good' },
  { id: 'ebo', title: 'empty base' },
  { id: 'wire', title: 'memcpy pad' },
]

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

function membersFor(mode: Mode, step: number): StructMember[] {
  const src = mode === 'good' ? GOOD : BAD
  if (mode === 'ebo' || mode === 'wire') return BAD.map((m) => makeMember(m.type, m.name))
  if (step <= 0) return [makeMember(src[0].type, src[0].name)]
  if (step === 1) return [makeMember(src[0].type, src[0].name), makeMember(src[1].type, src[1].name)]
  return src.map((m) => makeMember(m.type, m.name))
}

export function MemoryLayoutView() {
  const [id, setId] = useState<Mode>('bad')
  const { i, playing, play, reset } = useBeats(4)
  const [custom, setCustom] = useState<StructMember[] | null>(null)

  function select(next: string) {
    reset()
    setCustom(null)
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const members = custom && !playing ? custom : membersFor(id, i)
  const layout = useMemo(() => computeLayout(members), [members])
  const naiveSize = useMemo(() => members.reduce((sum, m) => sum + m.type.size, 0), [members])
  const waste = id === 'bad' && decided && !custom
  const packed = id === 'good' && decided && !custom
  const eboWin = id === 'ebo' && recap
  const wireTrap = id === 'wire' && decided

  function addMember(type: MemberType) {
    if (playing) return
    const count = members.filter((m) => m.type.name === type.name).length
    const base = type.name.replace(/[^a-z0-9]/gi, '') || 'field'
    setCustom([...members, makeMember(type, `${base}${count > 0 ? count : ''}`)])
  }

  function removeMember(mid: string) {
    if (playing) return
    setCustom(members.filter((m) => m.id !== mid))
  }

  function onPlay() {
    setCustom(null)
    play()
  }

  function onReset() {
    setCustom(null)
    reset()
  }

  const code =
    id === 'bad'
      ? recap
        ? `sizeof(Bad);  // 12, packed 6`
        : decided
          ? `struct Bad { char flag; int id; char ready; };`
          : `struct Bad { char flag; int id; };`
      : id === 'good'
        ? recap
          ? `struct Good { int id; char flag; char ready; };
sizeof(Good);  // 8`
          : `struct Good { int id; char flag; char ready; };`
        : id === 'ebo'
          ? recap
            ? `struct D : Empty { int n; };
// sizeof 4 — empty base optimization`
            : `struct Empty {};
struct Has { Empty e; int n; };
// empty member ≥ 1 byte`
          : recap
            ? `// padding is not your protocol
// do not memcpy the struct on the wire`
            : `struct Bad { char flag; int id; char ready; };
std::memcpy(buf, &bad, sizeof(bad));  // pad bytes too`

  const caption =
    i === 0
      ? id === 'bad'
        ? 'Play Bad. Members are laid out in order. Each one starts at an offset that is a multiple of its alignment. Padding hatches in place.'
        : id === 'good'
          ? 'Play Good. Largest-to-smallest often packs tighter. Same members, different order, smaller sizeof.'
          : id === 'ebo'
            ? 'Play empty base. Empty base optimization can make a base take zero extra size. An empty member still takes at least 1 byte.'
            : 'Play memcpy. Padding is not part of your protocol. Sending a struct by memcpy copies the hatched bytes too.'
      : id === 'bad' && i === 1
        ? 'int wants offset 0 mod 4. Three padding bytes appear so id can sit at 4. Nothing hops — the hatch is the pad.'
        : id === 'bad' && i === 2
          ? 'char ready sits at 8, then the struct rounds up to alignof = 4. Trailing padding. sizeof is 12.'
          : id === 'bad'
            ? 'Packed size is 6. Padding is 6. Order is costing you half the object.'
            : id === 'good' && i === 1
              ? 'int first at 0. No pad before it. Alignment is already satisfied.'
              : id === 'good' && i === 2
                ? 'Two chars sit at 4 and 5. Tail pad to 8. sizeof drops from 12 to 8.'
                : id === 'good'
                  ? 'Largest-first. Padding is only the tail. That is the usual packing rule of thumb.'
                  : id === 'ebo' && i === 1
                    ? 'Empty e is a member. It must have a unique address, so it occupies at least 1 byte, then pad, then n.'
                    : id === 'ebo' && i === 2
                      ? 'Has is 8. The empty member did not disappear. sizeof(Empty) as a member is at least 1.'
                      : id === 'ebo'
                        ? 'D : Empty { int n; } can be 4. The empty base may take zero extra size. That is EBO, not a member.'
                        : i === 1
                          ? 'sizeof(Bad) is 12. Six of those bytes are padding. memcpy copies them.'
                          : i === 2
                            ? 'Those pad bytes are not flag, id, or ready. They are not a stable protocol field.'
                            : 'Write the fields you mean, or pack a wire format on purpose. #pragma pack has its own ABI cost.'

  const tone = wireTrap || waste ? 'warn' : packed || eboWin ? 'ok' : 'idle'
  const playLabel =
    id === 'bad' ? 'Play Bad' : id === 'good' ? 'Play Good' : id === 'ebo' ? 'Play EBO' : 'Play memcpy'

  const verdict = custom
    ? layout.paddingBytes > 0
      ? `${layout.paddingBytes} pad · hatched, not flying`
      : `sizeof ${layout.totalSize}`
    : id === 'bad' && recap
      ? 'sizeof 12 · packed 6 · order wasted 6'
      : id === 'bad' && decided
        ? `${layout.paddingBytes} pad bytes · hatched`
        : id === 'bad' && stepped
          ? 'int at 4 · 3 pad before id'
          : packed && recap
            ? 'int first · sizeof 8 · tail pad only'
            : packed
              ? 'sizeof 8'
              : id === 'good' && stepped
                ? 'int at 0 · no lead pad'
                : eboWin
                  ? 'empty base · sizeof 4'
                  : id === 'ebo' && decided
                    ? 'empty member · sizeof 8'
                    : id === 'ebo' && stepped
                      ? 'Empty e ≥ 1 byte'
                      : wireTrap && recap
                        ? 'pad is not a protocol'
                        : wireTrap
                          ? 'memcpy copies pad'
                          : id === 'wire' && stepped
                            ? 'sizeof 12 includes hatch'
                            : ''

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={onPlay}
      onReset={onReset}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={id === 'ebo' ? (eboWin ? 'EBO 4' : 'member 8') : `sizeof ${layout.totalSize}`}
      caption={
        custom
          ? 'Builder mode. Padding hatches in place when alignment demands it. Play to walk the selected scene.'
          : caption
      }
      code={custom ? members.map((m) => `${m.type.name} ${m.fieldName};`).join('\n') : code}
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
      {id === 'ebo' ? (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !eboWin ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">Has · member</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>e</span>
              <span className={`fx-letter${stepped ? ' fx-letter--pad' : ' fx-letter--empty'}`}>·</span>
              <span className={`fx-letter${stepped ? ' fx-letter--pad' : ' fx-letter--empty'}`}>·</span>
              <span className={`fx-letter${stepped ? ' fx-letter--pad' : ' fx-letter--empty'}`}>·</span>
              <span className={`fx-letter${decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              <span className={`fx-letter${decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              <span className={`fx-letter${decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              <span className={`fx-letter${decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
            </div>
            <span className="fx-note">sizeof 8 · e is 1 + pad</span>
          </div>
          <div className={`fx-link${eboWin ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${eboWin ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">D : Empty</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${eboWin ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              <span className={`fx-letter${eboWin ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              <span className={`fx-letter${eboWin ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              <span className={`fx-letter${eboWin ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
            </div>
            <span className="fx-note">{eboWin ? 'base takes 0 extra' : 'EBO waiting'}</span>
          </div>
        </div>
      ) : (
        <>
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
                  className={`fx-letter${slot.kind === 'padding' ? (wireTrap ? ' fx-letter--dead' : ' fx-letter--pad') : ' fx-letter--on'}`}
                  title={`${slot.kind} @ ${slot.offset + n}`}
                >
                  {slot.kind === 'padding' ? '·' : (slot.label ?? 'x').slice(0, 1)}
                </span>
              )),
            )}
          </div>
        </>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          wireTrap || waste ? 'fx-verdict--warn' : packed || eboWin ? 'fx-verdict--ok' : layout.paddingBytes > 0 ? 'fx-verdict--warn' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
