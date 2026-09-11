import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'scoped' | 'legacy' | 'width' | 'mask'

const MODES: { id: Mode; title: string }[] = [
  { id: 'scoped', title: 'enum class' },
  { id: 'legacy', title: 'unscoped' },
  { id: 'width', title: 'underlying' },
  { id: 'mask', title: 'bitmask' },
]

export function EnumsViz() {
  const [id, setId] = useState<Mode>('scoped')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const redOk = id === 'scoped' && stepped
  const nIll = id === 'scoped' && decided
  const leaked = id === 'legacy' && stepped
  const converted = id === 'legacy' && decided
  const sized = id === 'width' && decided
  const maskIll = id === 'mask' && decided
  const trap = nIll || maskIll
  const warn = converted
  const ok = sized && recap

  const code =
    id === 'scoped'
      ? recap
        ? `enum class Color { red, green };
Color c = Color::red;
// int n = c;              // error
int n = static_cast<int>(c);`
        : `enum class Color { red, green };
Color c = Color::red;
int n = c;              // error`
      : id === 'legacy'
        ? `enum Legacy { FLAG_ON = 1 };
int x = FLAG_ON;        // implicit`
        : id === 'width'
          ? `enum class Color : std::uint8_t { red, green };
// sizeof(Color) == 1`
          : recap
            ? `// Color::red | Color::green  // error
// define operator| if you want flags`
            : `Color::red | Color::green;  // error unless you define |`

  const caption =
    i === 0
      ? id === 'scoped'
        ? 'Play Color::red. Names live inside the type. No implicit conversion to int. Stations light in place.'
        : id === 'legacy'
          ? 'Play FLAG_ON. Unscoped enumerators leak into the surrounding scope and convert to int without asking.'
          : id === 'width'
            ? 'Play uint8_t. Specify the underlying type when the width or signedness matters. Default is implementation-defined for unscoped.'
            : 'Play Color | Color. enum class has no operator|. That is the point — define it if you want flags.'
      : id === 'scoped' && i === 1
        ? 'Color::red is a Color. The int assignment has not happened. No conversion is in flight.'
        : id === 'scoped'
          ? 'int n = c is rejected. static_cast<int>(c) if you truly need the integer.'
          : id === 'legacy' && i === 1
            ? 'FLAG_ON is introduced in this scope. It is not Legacy::FLAG_ON unless you say so.'
            : id === 'legacy'
              ? 'int x = FLAG_ON compiles. The name leaked, and the value converted. Collides with macros and other enums.'
              : id === 'width' && i === 1
                ? 'Underlying type is uint8_t. You asked for that width. sizeof has not been read yet.'
                : id === 'width'
                  ? 'sizeof(Color) is 1. Keep it scoped and sized. Packed flags and wire formats need this.'
                  : i === 1
                    ? 'red and green are Color values. | is not defined for Color.'
                    : 'The | is rejected. Unscoped enums convert to int and | silently. That is a footgun, not a feature.'

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'scoped'
      ? 'Play Color::red'
      : id === 'legacy'
        ? 'Play FLAG_ON'
        : id === 'width'
          ? 'Play uint8_t'
          : 'Play Color | Color'

  const verdict =
    nIll && recap
      ? 'int n = c · does not compile'
      : nIll
        ? 'no implicit conversion'
        : converted && recap
          ? 'FLAG_ON leaked · converts to int'
          : converted
            ? 'int x = 1 · silent'
            : leaked
              ? 'FLAG_ON is in this scope'
              : sized && recap
                ? 'underlying type std::uint8_t'
                : sized
                  ? 'sizeof(Color) is 1'
                  : maskIll && recap
                    ? 'no operator| · define it if you mean flags'
                    : maskIll
                      ? '| is ill-formed'
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
      {id === 'scoped' && (
        <div className="fx-ladder">
          <div className={`fx-rank${redOk ? ' fx-rank--on' : ''}${nIll ? ' fx-rank--done' : ''}`}>
            <code>red</code>
            <span className="fx-note">
              <code>Color::red</code>
            </span>
            <span className="fx-note">{redOk ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${nIll ? ' fx-rank--trap' : ''}`}>
            <code>n = c</code>
            <span className="fx-note">implicit to int</span>
            <span className="fx-note">{nIll ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'legacy' && (
        <div className="fx-ladder">
          <div className={`fx-rank${leaked ? ' fx-rank--on' : ''}${converted ? ' fx-rank--done' : ''}`}>
            <code>FLAG_ON</code>
            <span className="fx-note">leaked name</span>
            <span className="fx-note">{leaked ? 'yes' : '—'}</span>
          </div>
          <div className={`fx-rank${converted ? ' fx-rank--trap' : ''}`}>
            <code>int x</code>
            <span className="fx-note">implicit convert</span>
            <span className="fx-note">{converted ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'width' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${sized ? ' fx-rank--done' : ''}`}>
            <code>type</code>
            <span className="fx-note">
              <code>uint8_t</code>
            </span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${sized ? ' fx-rank--on' : ''}`}>
            <code>size</code>
            <span className="fx-note">
              <code>sizeof</code>
            </span>
            <span className="fx-note">{sized ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'mask' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${maskIll ? ' fx-rank--done' : ''}`}>
            <code>red</code>
            <span className="fx-note">Color value</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${maskIll ? ' fx-rank--trap' : ''}`}>
            <code>|</code>
            <span className="fx-note">operator|</span>
            <span className="fx-note">{maskIll ? 'ill' : '—'}</span>
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
