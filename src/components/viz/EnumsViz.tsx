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

  const bounce = (id === 'scoped' && i >= 2) || (id === 'mask' && i >= 2)
  const leak = id === 'legacy' && i >= 2
  const won = id === 'width' && i >= 2

  const code =
    id === 'scoped'
      ? `enum class Color { red, green };\nColor c = Color::red;\nint n = c;              // error`
      : id === 'legacy'
        ? `enum Legacy { FLAG_ON = 1 };\nint x = FLAG_ON;        // implicit`
        : id === 'width'
          ? `enum class Color : std::uint8_t { red, green };`
          : `Color::red | Color::green;  // error unless you define |`

  const caption =
    i === 0
      ? id === 'scoped'
        ? 'Play enum class. Names live inside the type. No implicit conversion to int.'
        : id === 'legacy'
          ? 'Play unscoped enum. Enumerators leak into the surrounding scope and convert to int without asking.'
          : id === 'width'
            ? 'Play underlying type. Specify it when the width or signedness matters. Default is implementation-defined for unscoped.'
            : 'Play bitmask. enum class has no operator|. That is the point — define it if you want flags.'
      : id === 'scoped' && i === 1
        ? 'Color::red is a Color. The int slot is empty. No conversion has happened.'
        : id === 'scoped'
          ? 'int n = c is rejected. static_cast<int>(c) if you truly need the integer.'
          : id === 'legacy' && i === 1
            ? 'FLAG_ON is introduced in this scope. It is not Legacy::FLAG_ON unless you say so.'
            : id === 'legacy'
              ? 'int x = FLAG_ON compiles. The name leaked, and the value converted. Collides with macros and other enums.'
              : id === 'width' && i === 1
                ? 'Underlying type is uint8_t. sizeof(Color) is 1. You asked for that width.'
                : id === 'width'
                  ? 'Keep it scoped and sized. Packed flags and wire formats need this.'
                  : i === 1
                    ? 'red and green are Color values. | is not defined for Color.'
                    : 'The | is rejected. Unscoped enums convert to int and | silently. That is a footgun, not a feature.'

  const tone = bounce ? 'trap' : leak ? 'warn' : won ? 'ok' : 'idle'

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
      playLabel="Play enum"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-split">
        <div className={`fx-ns${id === 'legacy' && leak ? ' fx-ns--leak' : ' fx-pane--focus'}`}>
          <span className="fx-kicker">{id === 'legacy' ? 'enum Legacy' : 'enum class Color'}</span>
          <div className="fx-ns-item">red</div>
          <div className={`fx-ns-item${id === 'legacy' && leak ? ' fx-ns-item--out' : ''}`}>
            {id === 'width' ? 'green · uint8_t' : 'green'}
          </div>
        </div>
        <div className="fx-gutter">{id === 'mask' ? '|' : '→'}</div>
        <div className={`fx-slot${bounce ? ' fx-slot--trap' : leak ? ' fx-slot--trap' : won ? ' fx-slot--ok' : ''}`}>
          <span className="fx-kicker">{id === 'width' ? 'sizeof' : id === 'mask' ? 'operator|' : 'int'}</span>
          <span className="fx-value">
            {bounce ? '∅' : leak && i >= 2 ? '1' : won ? '1 B' : i >= 1 && id === 'scoped' ? 'Color' : '—'}
          </span>
          <span className="fx-note">
            {bounce
              ? 'no implicit conversion'
              : leak
                ? 'leaked + converted'
                : won
                  ? 'you chose the width'
                  : 'destination'}
          </span>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          bounce ? 'fx-verdict--trap' : leak ? 'fx-verdict--warn' : won ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'scoped' && bounce
          ? 'int n = c  ·  does not compile'
          : id === 'legacy' && leak
            ? 'FLAG_ON is in this scope · converts to int'
            : id === 'width' && won
              ? 'underlying type std::uint8_t'
              : id === 'mask' && bounce
                ? 'no operator| · define it if you mean flags'
                : ''}
      </div>
    </SceneShell>
  )
}
