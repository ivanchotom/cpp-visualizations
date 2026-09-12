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
  const warn = silent
  const ok = (id === 'named' && recap) || (id === 'assign' && recap)

  const code =
    id === 'assign'
      ? recap
        ? `int n = d;          // 3, silent
// prefer braces or a named cast`
        : `double d = 3.9;
int n = d;          // 3, silent`
      : id === 'brace'
        ? recap
          ? `int n{d};           // error (narrowing)
// d is unchanged`
          : `double d = 3.9;
int n{d};           // error (narrowing)`
        : id === 'named'
          ? recap
            ? `int n = static_cast<int>(d);  // 3, named
// still truncates; at least it is named`
            : `int n = static_cast<int>(d);  // 3, named`
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

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'assign' ? 'Play int n = d' : id === 'brace' ? 'Play int n{d}' : id === 'named' ? 'Play static_cast' : 'Play dynamic_cast'

  const verdict =
    id === 'assign' && recap
      ? 'prefer braces or a named cast'
      : silent
        ? 'n = 3 · silent'
        : id === 'assign' && stepped
          ? 'd · 3.9'
          : rejected && recap
            ? 'n{d} · ill'
            : rejected
              ? 'narrowing · ill'
              : id === 'brace' && stepped
                ? 'd · 3.9'
                : namedOk && recap
                  ? 'named · still truncates'
                  : namedOk
                    ? 'static_cast · 3'
                    : id === 'named' && stepped
                      ? 'gate · int'
                      : dynFail && recap
                        ? 'test the pointer · refs throw'
                        : dynFail
                          ? 'dynamic_cast · null'
                          : id === 'dynamic' && stepped
                            ? 'RTTI · virtual'
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
      {id === 'assign' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>d</code>
            <span className="fx-note">dbl</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${silent ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">asg</span>
            <span className="fx-note">{silent ? '3' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'brace' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>d</code>
            <span className="fx-note">dbl</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${rejected ? ' fx-rank--trap' : ''}`}>
            <code>n</code>
            <span className="fx-note">{'{}'}</span>
            <span className="fx-note">{rejected ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'named' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>d</code>
            <span className="fx-note">dbl</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${namedOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">sc</span>
            <span className="fx-note">{namedOk ? '3' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dynamic' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">A*</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${dynFail ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">B*</span>
            <span className="fx-note">{dynFail ? 'null' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : warn ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
