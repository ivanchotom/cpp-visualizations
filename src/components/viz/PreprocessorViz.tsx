import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'include' | 'sqr' | 'parens' | 'guard'

const MODES: { id: Mode; title: string }[] = [
  { id: 'include', title: '#include' },
  { id: 'sqr', title: 'SQR(++i)' },
  { id: 'parens', title: 'DOUBLE' },
  { id: 'guard', title: 'guard' },
]

export function PreprocessorViz() {
  const [id, setId] = useState<Mode>('include')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const pasted = id === 'include' && stepped
  const seen = id === 'include' && decided
  const x1 = id === 'sqr' && stepped
  const x2 = id === 'sqr' && decided
  const looks = id === 'parens' && stepped
  const real = id === 'parens' && decided
  const first = id === 'guard' && stepped
  const skip = id === 'guard' && decided
  const trap = (id === 'sqr' && recap) || (id === 'parens' && recap)
  const ok = (id === 'include' && recap) || (id === 'guard' && recap)

  const after =
    id === 'include'
      ? recap
        ? `int add(int, int);\nint main();`
        : pasted
          ? `int add(int, int);\nint main();`
          : `#include "math.hpp"\nint main();`
      : id === 'sqr'
        ? recap
          ? `((++i)*(++i))  // 3*4`
          : x2
            ? `((++i)*(++i))`
            : x1
              ? `((++i)*(x))`
              : `SQR(++i)`
        : id === 'parens'
          ? recap
            ? `2 * 3 + 3  // 9`
            : real
              ? `2 * 3 + 3`
              : looks
                ? `2 * x+x`
                : `2 * DOUBLE(3)`
          : recap
            ? `// skipped — already seen`
            : skip
              ? `#include "math.hpp"  // second`
              : first
                ? `int add(int, int);`
                : `#include "math.hpp"  // first`

  const caption =
    i === 0
      ? id === 'include'
        ? 'Play #include. The directive is not a compiler feature. It is paste. Stations light in place — the tokens do not fly.'
        : id === 'sqr'
          ? 'Play SQR(++i). A macro is copy-paste. Each x is replaced, so ++i runs twice.'
          : id === 'parens'
            ? 'Play DOUBLE without parens in the replacement list. Precedence after expansion is not the same as the call site looks.'
            : 'Play guard. The second include of the same header is a no-op if the guard already fired.'
      : id === 'include' && i === 1
        ? 'The #include line is gone. The header body is pasted in its place. Still one translation unit, still text.'
        : id === 'include' && i === 2
          ? 'The compiler never saw the directive. It type-checks this stream. Missing a header fails here as a missing declaration.'
          : id === 'include'
            ? 'That is why you include headers, never .cpp files: paste would duplicate definitions across TUs.'
            : id === 'sqr' && i === 1
              ? 'First x becomes ++i. i was 2, now 3. The second x has not been substituted yet.'
              : id === 'sqr' && i === 2
                ? 'Second x is also ++i. i becomes 4. The product is 3×4, not 3×3.'
                : id === 'sqr'
                  ? 'Result 12. Parentheses in the macro saved grouping, not evaluation count. Prefer an inline function.'
                  : id === 'parens' && i === 1
                    ? 'DOUBLE(x) is x+x with no extra parens. 2 * DOUBLE(3) becomes 2 * x+x.'
                    : id === 'parens' && i === 2
                      ? 'Tokens: 2 * 3 + 3. * binds first, so you get 6+3, not 2*(3+3).'
                      : id === 'parens'
                        ? '9, not 12. Wrap the replacement: #define DOUBLE(x) ((x)+(x)). Or don’t use a macro.'
                        : i === 1
                          ? 'First include pastes the header. #pragma once (or classic #ifndef) records that this file is done.'
                          : i === 2
                            ? 'Second include of the same header in this TU. The guard is already set.'
                            : 'Paste skipped. Without a guard, the second paste would duplicate declarations — or definitions, if you put them in the header.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'include' ? 'Play #include' : id === 'sqr' ? 'Play SQR(++i)' : id === 'parens' ? 'Play DOUBLE' : 'Play guard'

  const verdict =
    id === 'include' && recap
      ? 'directive erased · compiler sees declarations'
      : id === 'include' && seen
        ? 'compiler sees add, not #include'
        : id === 'sqr' && recap
          ? '++i twice · 3 × 4 = 12'
          : x2
            ? 'second ++i · i is 4'
            : x1
              ? 'first ++i · i is 3'
              : id === 'parens' && recap
                ? '2*3+3 = 9, not 12'
                : real
                  ? '* binds first'
                  : skip && recap
                    ? 'second include skipped'
                    : skip
                      ? 'guard already set'
                      : first
                        ? 'first paste · recorded'
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
      code={after}
      tone={tone}
    >
      {id === 'include' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>#i</code>
            <span className="fx-note">hpp</span>
            <span className="fx-note">{seen ? 'gone' : stepped ? 'in' : '—'}</span>
          </div>
          <div className={`fx-rank${seen ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>ad</code>
            <span className="fx-note">dc</span>
            <span className="fx-note">{seen ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'sqr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${x1 ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x1</code>
            <span className="fx-note">++</span>
            <span className="fx-note">{x1 ? '3' : '—'}</span>
          </div>
          <div className={`fx-rank${x2 ? ' fx-rank--on' : ''}${recap ? ' fx-rank--trap' : ''}`}>
            <code>x2</code>
            <span className="fx-note">++</span>
            <span className="fx-note">{x2 ? '4' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'parens' && (
        <div className="fx-ladder">
          <div className={`fx-rank${looks ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>lk</code>
            <span className="fx-note">aim</span>
            <span className="fx-note">{looks ? '12' : '—'}</span>
          </div>
          <div className={`fx-rank${real ? ' fx-rank--on' : ''}${recap ? ' fx-rank--trap' : ''}`}>
            <code>ex</code>
            <span className="fx-note">got</span>
            <span className="fx-note">{recap || real ? '9' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'guard' && (
        <div className="fx-ladder">
          <div className={`fx-rank${first ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>i1</code>
            <span className="fx-note">in</span>
            <span className="fx-note">{first ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${skip ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>i2</code>
            <span className="fx-note">sk</span>
            <span className="fx-note">{skip ? 'sk' : '—'}</span>
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
