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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const silent = id === 'assign' && decided
  const rejected = id === 'brace' && decided
  const namedOk = id === 'named' && decided
  const dynFail = id === 'dynamic' && decided
  const trap = rejected || dynFail
  const ok = namedOk && recap

  const code =
    id === 'assign'
      ? recap
        ? `int n = d;          // 3, silent
// prefer braces or a named cast`
        : `double d = 3.9;
int n = d;          // 3, silent`
      : id === 'brace'
        ? `double d = 3.9;
int n{d};           // error (narrowing)`
        : id === 'named'
          ? `int n = static_cast<int>(d);  // 3, named
// still truncates; at least it is named`
          : recap
            ? `B* p = dynamic_cast<B*>(a);
// nullptr if a is not a B
// reference dynamic_cast throws`
            : `B* p = dynamic_cast<B*>(a);
// needs a polymorphic source`

  const caption =
    i === 0
      ? id === 'assign'
        ? 'Play int n = d. Copy-init narrows without asking. d stays 3.9; n becomes 3. Stations light in place.'
        : id === 'brace'
          ? 'Play int n{d}. Brace initialization is the narrowing firewall. 3.9 cannot become int here.'
          : id === 'named'
            ? 'Play static_cast. The conversion is explicit in the source. Still truncates; at least it is named.'
            : 'Play dynamic_cast. Pointer miss is nullptr, not a throw. The source must be polymorphic (a virtual function).'
      : id === 'assign' && i === 1
        ? 'd is 3.9. Copy-init is underway. The int slot has not received a value yet.'
        : id === 'assign' && i === 2
          ? 'n is 3. The fractional part is gone. No diagnostic. This is why braces exist.'
          : id === 'assign'
            ? 'Prefer int n{d} or a named cast. Silent narrowing is a defect magnet.'
            : id === 'brace' && i === 1
              ? 'd is 3.9. List-init checks narrowing at compile time. The int slot stays empty.'
              : id === 'brace'
                ? 'Rejected. The program does not compile. d is unchanged. That is the point of the braces.'
                : id === 'named' && i === 1
                  ? 'static_cast is a gate. You asked for int. The compiler will truncate on purpose.'
                  : id === 'named'
                    ? 'n is 3. Readers see the cast. Prefer this over assignment when the loss is intended.'
                    : i === 1
                      ? 'The pointer is tested against B’s type info. This is a runtime check. C++14: the source type needs a virtual function.'
                      : i === 2
                        ? 'Not a B. The destination is nullptr. No exception on pointer dynamic_cast (a reference throw is a different rule).'
                        : 'Always test the result. C-style (B*)a can mix several cast kinds — avoid it.'

  const tone = trap ? 'trap' : silent ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'assign' ? 'Play int n = d' : id === 'brace' ? 'Play int n{d}' : id === 'named' ? 'Play static_cast' : 'Play dynamic_cast'

  const verdict =
    silent && !recap
      ? 'n = 3 · silent'
      : id === 'assign' && recap
        ? 'prefer braces or a named cast'
        : rejected
          ? 'n{d} · ill'
          : namedOk && recap
            ? 'named · still truncates'
            : namedOk
              ? 'static_cast<int>(3.9) = 3'
              : dynFail && !recap
                ? 'dynamic_cast → nullptr'
                : id === 'dynamic' && recap
                  ? 'test the pointer · refs throw'
                  : id === 'dynamic' && i === 1
                    ? 'RTTI · polymorphic source'
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
      {id === 'dynamic' ? (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">A*</span>
            <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">source</span>
              <span className="fx-value">
                <code>a</code>
              </span>
              <span className="fx-note">polymorphic</span>
            </div>
          </div>
          <div className={`fx-link${dynFail ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${dynFail ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">B*</span>
            <div className={`fx-slot${dynFail ? ' fx-slot--trap' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">result</span>
              <span className="fx-value">{dynFail ? 'null' : stepped ? '?' : '—'}</span>
              <span className="fx-note">{dynFail ? 'not a B' : 'runtime check'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${rejected || silent ? ' fx-rank--done' : ''}`}>
            <code>d</code>
            <span className="fx-note">3.9</span>
            <span className="fx-note">{stepped ? 'stays' : '—'}</span>
          </div>
          <div
            className={`fx-rank${decided ? ' fx-rank--on' : ''}${rejected ? ' fx-rank--trap' : ''}`}
          >
            <code>{id === 'assign' ? 'n = d' : id === 'brace' ? 'n{d}' : 'cast'}</code>
            <span className="fx-note">{id === 'assign' ? 'copy-init' : id === 'brace' ? 'list-init' : 'named'}</span>
            <span className="fx-note">{rejected ? 'ill' : silent || namedOk ? '3' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : silent ? 'fx-verdict--warn' : ok || namedOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
