import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'assign' | 'brace' | 'named' | 'dynamic'

const MODES: { id: Mode; title: string }[] = [
  { id: 'assign', title: 'int n = d' },
  { id: 'brace', title: 'int n{d}' },
  { id: 'named', title: 'static_cast' },
  { id: 'dynamic', title: 'dynamic_cast' },
]

export function ConversionsViz() {
  const [id, setId] = useState<Mode>('assign')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const silent = id === 'assign' && i >= 1
  const rejected = id === 'brace' && i >= 2
  const named = id === 'named' && i >= 1
  const dynFail = id === 'dynamic' && i >= 2

  const srcVal = '3.9'
  const dstVal =
    id === 'assign' && i >= 2
      ? '3'
      : id === 'named' && i >= 2
        ? '3'
        : id === 'dynamic' && i >= 2
          ? 'nullptr'
          : '—'

  const code =
    id === 'assign'
      ? `double d = 3.9;\nint n = d;          // 3, silent`
      : id === 'brace'
        ? `double d = 3.9;\nint n{d};           // error (narrowing)`
        : id === 'named'
          ? `int n = static_cast<int>(d);  // 3, named`
          : `B* p = dynamic_cast<B*>(a);\n// nullptr if a is not a B`

  const caption =
    i === 0
      ? id === 'assign'
        ? 'Play copy-init. double sits in its slot. int is empty. Assignment will narrow without asking.'
        : id === 'brace'
          ? 'Play list-init. Brace initialization is the narrowing firewall. 3.9 cannot become int here.'
          : id === 'named'
            ? 'Play static_cast. The conversion is explicit in the source. Still truncates; at least it is named.'
            : 'Play dynamic_cast on a pointer. If the object is not that type, you get nullptr — not a flying failure.'
      : id === 'assign' && i === 1
        ? 'The conversion is underway. The double is still 3.9. The int slot is about to receive a truncated copy.'
        : id === 'assign' && i === 2
          ? 'n is 3. The fractional part is gone. No diagnostic. This is why braces exist.'
          : id === 'assign'
            ? 'Prefer int n{d} or a named cast. Silent narrowing is a defect magnet.'
            : id === 'brace' && i === 1
              ? 'd is 3.9. The int slot stays empty. List-init checks narrowing at compile time.'
              : id === 'brace'
                ? 'Rejected. The program does not compile. The value never moved. That is the point of the braces.'
                : id === 'named' && i === 1
                  ? 'static_cast is a gate. You asked for int. The compiler will truncate on purpose.'
                  : id === 'named'
                    ? 'n is 3. Readers see the cast. Prefer this over assignment when the loss is intended.'
                    : i === 1
                      ? 'The pointer is tested against B’s type info. This is a runtime check, not a hop.'
                      : i === 2
                        ? 'Not a B. The pointer slot becomes nullptr. No exception on pointer dynamic_cast (references throw).'
                        : 'Always test the result. C++14: dynamic_cast needs a polymorphic source (virtual function).'

  const tone = rejected || dynFail ? 'trap' : named && i >= 3 ? 'ok' : silent && i >= 3 ? 'warn' : 'idle'

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
      playLabel="Play convert"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-compare">
        <div className={`fx-slot${i === 0 ? ' fx-slot--focus' : ''}`}>
          <span className="fx-kicker">{id === 'dynamic' ? 'A*' : 'double d'}</span>
          <span className="fx-value">{id === 'dynamic' ? 'pA' : srcVal}</span>
          <span className="fx-note">source stays</span>
        </div>
        <span className="fx-op">{id === 'brace' ? '{ }' : id === 'named' ? 'cast' : id === 'dynamic' ? 'RTTI' : '='}</span>
        <div
          className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ' fx-slot--dim'}${rejected ? ' fx-slot--trap' : ''}${
            (id === 'named' && i >= 2) || (id === 'assign' && i >= 2) ? ' fx-slot--ok' : ''
          }${dynFail ? ' fx-slot--trap' : ''}`}
        >
          <span className="fx-kicker">{id === 'dynamic' ? 'B*' : 'int n'}</span>
          <span className="fx-value">{rejected ? '∅' : dstVal}</span>
          <span className="fx-note">
            {rejected ? 'narrowing blocked' : dynFail ? 'not a B' : id === 'assign' && i >= 2 ? 'silent truncate' : 'destination'}
          </span>
        </div>
        <span className="fx-op" />
        <div className="fx-slot fx-slot--dim">
          <span className="fx-kicker">rule</span>
          <span className="fx-note">
            {id === 'assign'
              ? 'copy-init allows narrowing'
              : id === 'brace'
                ? 'list-init forbids it'
                : id === 'named'
                  ? 'explicit, still truncates'
                  : 'pointer: nullptr on miss'}
          </span>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          rejected || dynFail ? 'fx-verdict--trap' : id === 'assign' && i >= 2 ? 'fx-verdict--warn' : 'fx-verdict--ok'
        }`}
      >
        {id === 'assign' && i >= 2
          ? 'n = 3  ·  silent'
          : id === 'brace' && rejected
            ? 'does not compile · d unchanged'
            : id === 'named' && i >= 2
              ? 'static_cast<int>(3.9) = 3'
              : dynFail
                ? 'dynamic_cast → nullptr'
                : ''}
      </div>
    </SceneShell>
  )
}
