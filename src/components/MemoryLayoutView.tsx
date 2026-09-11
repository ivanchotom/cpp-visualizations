import { useState } from 'react'
import { SceneShell } from './viz/scene/SceneShell.tsx'
import { useBeats } from './viz/scene/useBeats.ts'

type Mode = 'bad' | 'good' | 'ebo' | 'wire'

const MODES: { id: Mode; title: string }[] = [
  { id: 'bad', title: 'Bad' },
  { id: 'good', title: 'Good' },
  { id: 'ebo', title: 'empty base' },
  { id: 'wire', title: 'memcpy pad' },
]

export function MemoryLayoutView() {
  const [id, setId] = useState<Mode>('bad')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const waste = id === 'bad' && decided
  const packed = id === 'good' && recap
  const eboWin = id === 'ebo' && recap
  const wireTrap = id === 'wire' && decided
  const trap = waste || wireTrap
  const ok = packed || eboWin

  const code =
    id === 'bad'
      ? recap
        ? `sizeof(Bad);  // 12, packed 6`
        : `struct Bad { char flag; int id; char ready; };`
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
        ? 'Play sizeof 12. Members are laid out in order. Each one starts at an offset that is a multiple of its alignment. Padding is waste, not a hop.'
        : id === 'good'
          ? 'Play sizeof 8. Largest-to-smallest often packs tighter. Same members, different order, smaller sizeof.'
          : id === 'ebo'
            ? 'Play EBO. Empty base optimization can make a base take zero extra size. An empty member still takes at least 1 byte.'
            : 'Play memcpy. Padding is not part of your protocol. Sending a struct by memcpy copies the pad bytes too.'
      : id === 'bad' && i === 1
        ? 'int wants offset 0 mod 4. Three padding bytes sit so id can sit at 4. Stations light in place.'
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

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'bad' ? 'Play sizeof 12' : id === 'good' ? 'Play sizeof 8' : id === 'ebo' ? 'Play EBO' : 'Play memcpy'

  const verdict =
    id === 'bad' && recap
      ? 'sizeof 12 · packed 6 · order wasted 6'
      : waste
        ? '12 · 6 pad bytes'
        : id === 'bad' && stepped
          ? 'int at 4 · 3 pad before id'
          : packed
            ? 'int first · sizeof 8 · tail pad only'
            : id === 'good' && decided
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
                            ? 'sizeof 12 includes pad'
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
    >
      {id === 'bad' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${waste ? ' fx-rank--trap' : ''}`}>
            <code>sz</code>
            <span className="fx-note">sizeof</span>
            <span className="fx-note">{waste ? '12' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${waste ? ' fx-rank--trap' : ''}`}>
            <code>pad</code>
            <span className="fx-note">waste</span>
            <span className="fx-note">{waste ? '6' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'good' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>sz</code>
            <span className="fx-note">sizeof</span>
            <span className="fx-note">{decided ? '8' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>pad</code>
            <span className="fx-note">tail</span>
            <span className="fx-note">{recap ? '2' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ebo' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--trap' : ''}`}>
            <code>Has</code>
            <span className="fx-note">member</span>
            <span className="fx-note">{decided ? '8' : '—'}</span>
          </div>
          <div className={`fx-rank${eboWin ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>D</code>
            <span className="fx-note">EBO</span>
            <span className="fx-note">{eboWin ? '4' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'wire' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>sz</code>
            <span className="fx-note">sizeof</span>
            <span className="fx-note">{stepped ? '12' : '—'}</span>
          </div>
          <div className={`fx-rank${wireTrap ? ' fx-rank--trap' : ''}`}>
            <code>cp</code>
            <span className="fx-note">memcpy</span>
            <span className="fx-note">{wireTrap ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
