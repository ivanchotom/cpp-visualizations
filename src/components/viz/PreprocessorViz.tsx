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

  const before =
    id === 'include'
      ? `#include "math.hpp"\nint main();`
      : id === 'sqr'
        ? `#define SQR(x) ((x)*(x))\nint i = 2;\nSQR(++i);`
        : id === 'parens'
          ? `#define DOUBLE(x) x+x\n2 * DOUBLE(3)`
          : `// math.hpp\n#pragma once\nint add(int, int);`

  const after =
    id === 'include'
      ? i === 0
        ? `#include "math.hpp"\nint main();`
        : `int add(int, int);\nint main();`
      : id === 'sqr'
        ? i === 0
          ? `SQR(++i)`
          : i === 1
            ? `((++i)*(x))`
            : i === 2
              ? `((++i)*(++i))`
              : `((++i)*(++i))  // 3*4`
        : id === 'parens'
          ? i === 0
            ? `2 * DOUBLE(3)`
            : i === 1
              ? `2 * x+x`
              : i === 2
                ? `2 * 3 + 3`
                : `9`
          : i === 0
            ? `#include "math.hpp"  // first`
            : i === 1
              ? `int add(int, int);`
              : i === 2
                ? `#include "math.hpp"  // second`
                : `// skipped — already seen`

  const caption =
    i === 0
      ? id === 'include'
        ? 'Play include. The left pane is what you wrote. The right pane is what the compiler actually sees — still text.'
        : id === 'sqr'
          ? 'Play SQR(++i). A macro is copy-paste. Each x is replaced, so ++i runs twice.'
          : id === 'parens'
            ? 'Play DOUBLE without parens in the replacement list. Precedence after expansion is not the same as the call site looks.'
            : 'Play include guards. The second include of the same header is a no-op if the guard already fired.'
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

  const iVal = id === 'sqr' ? (i === 0 ? 2 : i === 1 ? 3 : 4) : null
  const trap = (id === 'sqr' && i >= 3) || (id === 'parens' && i >= 3)
  const tone = trap ? 'warn' : id === 'guard' && i >= 3 ? 'ok' : 'idle'

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
      playLabel="Play preprocess"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={id === 'sqr' ? `int i = ${iVal};\n${after}` : after}
      tone={tone}
    >
      <div className="fx-split">
        <div className={`fx-pane${i === 0 ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">source</span>
          <pre>
            <code>{before}</code>
          </pre>
        </div>
        <div className="fx-gutter">→</div>
        <div className={`fx-pane fx-pane--focus${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">after preprocess</span>
          <pre>
            <code className={trap ? 'fx-line--trap' : i >= 1 ? 'fx-line--hot' : ''}>{after}</code>
          </pre>
          {id === 'sqr' && iVal !== null && (
            <span className="fx-note">
              register i = <strong>{iVal}</strong>
            </span>
          )}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 3 ? ' fx-verdict--show' : ''} ${
          id === 'include'
            ? 'fx-verdict--ok'
            : id === 'guard'
              ? 'fx-verdict--ok'
              : 'fx-verdict--warn'
        }`}
      >
        {id === 'include' && i >= 3
          ? 'directive erased · compiler sees declarations'
          : id === 'sqr' && i >= 3
            ? '++i twice · 3 × 4 = 12'
            : id === 'parens' && i >= 3
              ? '2*3+3 = 9, not 12'
              : id === 'guard' && i >= 3
                ? 'second include skipped'
                : ''}
      </div>
    </SceneShell>
  )
}
