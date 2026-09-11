import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

export function TemplatesViz() {
  const { i, playing, play, reset } = useBeats(4)

  const hasInt = i >= 1
  const hasDouble = i >= 2
  const binary = i >= 3

  const code =
    i === 0
      ? `template <typename T>
T twice(T x) {
  return x + x;
}`
      : i === 1
        ? `twice(21);  // T = int`
        : i === 2
          ? `twice(2.5);  // T = double`
          : `// twice<int> and twice<double>
// both exist in the binary`

  const caption =
    i === 0
      ? 'Play twice(21) then twice(2.5). A function template is not a function. It is a recipe the compiler copies for each set of arguments it actually sees.'
      : i === 1
        ? 'Deduction: T = int. The compiler stamps out a real function int twice(int). That copy is what the linker sees. Unused T’s are never generated.'
        : i === 2
          ? 'A second instantiation: T = double. twice<int> stays in the binary — they are different functions. C++14 has no CTAD; function templates still deduce from arguments.'
          : 'Two copies now live in the program. That is why templates belong in headers — each TU that calls twice must see the recipe.'

  const tone = binary ? 'ok' : 'idle'
  const linkCls = hasInt ? (binary ? 'fx-link--weld' : 'fx-link--on') : ''

  return (
    <SceneShell
      playing={playing}
      onPlay={play}
      onReset={reset}
      playLabel="Play twice(21) then twice(2.5)"
      step={i}
      stepCount={4}
      sig={i === 0 ? 'recipe' : i === 1 ? 'T = int' : i === 2 ? 'T = double' : 'two functions'}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-expr">
        <span className={`fx-tok${hasInt ? ' fx-tok--hot' : ''}`}>twice(21)</span>
        <span className={`fx-tok${hasDouble ? ' fx-tok--hot' : ''}`}>twice(2.5)</span>
      </div>
      <div className="fx-sh">
        <div className={`fx-pane${i >= 0 ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">recipe</span>
          <div className="fx-slot fx-slot--focus">
            <span className="fx-kicker">template</span>
            <span className="fx-value">
              <code>twice&lt;T&gt;</code>
            </span>
            <span className="fx-note">not a function yet</span>
          </div>
        </div>
        <div className={`fx-link${linkCls ? ` ${linkCls}` : ''}`} />
        <div className={`fx-pane${hasInt ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">stamped into this TU</span>
          <div className={`fx-slot${hasInt ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">T = int</span>
            <span className="fx-value">{hasInt ? '42' : '—'}</span>
            <span className="fx-note">{hasInt ? 'int twice(int)' : 'not generated yet'}</span>
            {hasInt && <span className="fx-badge fx-badge--open">twice(21)</span>}
          </div>
          <div className={`fx-slot${hasDouble ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">T = double</span>
            <span className="fx-value">{hasDouble ? '5.0' : '—'}</span>
            <span className="fx-note">{hasDouble ? 'double twice(double)' : 'not generated yet'}</span>
            {hasDouble && <span className="fx-badge fx-badge--open">twice(2.5)</span>}
          </div>
        </div>
      </div>
      <div className={`fx-verdict${i >= 1 ? ' fx-verdict--show' : ''} ${binary ? 'fx-verdict--ok' : hasInt ? 'fx-verdict--ok' : ''}`}>
        {binary
          ? 'two functions · unused T never generated'
          : hasDouble
            ? 'second stamp · twice<double>'
            : hasInt
              ? 'first stamp · twice<int>'
              : ''}
      </div>
    </SceneShell>
  )
}
