import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'octal' | 'suffix' | 'nullptr' | 'brace'

const MODES: { id: Mode; title: string }[] = [
  { id: 'octal', title: '010' },
  { id: 'suffix', title: '42u' },
  { id: 'nullptr', title: 'nullptr' },
  { id: 'brace', title: 'auto x{1}' },
]

export function LiteralsViz() {
  const [id, setId] = useState<Mode>('octal')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const source = id === 'octal' ? '010' : id === 'suffix' ? '42u' : id === 'nullptr' ? 'nullptr' : 'auto x{1}'
  const base = i === 0 ? '—' : id === 'octal' ? '8 (leading 0)' : id === 'suffix' ? '10' : id === 'nullptr' ? 'pointer' : 'list'
  const type =
    i < 2
      ? '—'
      : id === 'octal'
        ? 'int'
        : id === 'suffix'
          ? 'unsigned int'
          : id === 'nullptr'
            ? 'std::nullptr_t'
            : 'std::initializer_list<int>'
  const value =
    i < 3
      ? '—'
      : id === 'octal'
        ? '8'
        : id === 'suffix'
          ? '42u'
          : id === 'nullptr'
            ? 'null pointer'
            : '{1}  (not int)'

  const trap = (id === 'octal' && i >= 3) || (id === 'brace' && i >= 2)

  const code =
    id === 'octal'
      ? `int x = 010;     // 8, not ten`
      : id === 'suffix'
        ? `auto n = 42u;    // unsigned int`
        : id === 'nullptr'
          ? `auto p = nullptr;\n// std::nullptr_t, not int`
          : `auto x{1};       // C++14: initializer_list\nauto y = 1;      // int`

  const caption =
    i === 0
      ? 'Play the decoder. A literal is source text with a type and a value. The spelling is not the value.'
      : i === 1
        ? id === 'octal'
          ? 'A leading 0 means octal, not a style of decimal. 010 is base 8.'
          : id === 'suffix'
            ? 'u (or U) is a suffix. It is part of the token. 42u is not “42, then convert”.'
            : id === 'nullptr'
              ? 'nullptr is a keyword. It is not 0, and it is not NULL (which is often 0).'
              : 'Braces in C++14 with auto do not mean “this is an int”. Direct-list-init of auto is a list.'
        : i === 2
          ? id === 'octal'
            ? 'Type is int. Value is 1×8 + 0 = 8. The trap is thinking you wrote ten.'
            : id === 'suffix'
              ? 'Type is unsigned int. That changes overload resolution and usual arithmetic conversions.'
              : id === 'nullptr'
                ? 'Type is std::nullptr_t. It converts to any pointer type, not to bool via 0 in the same way 0 does in every context.'
                : 'auto x{1} is std::initializer_list<int> in C++14. auto x = 1 is int. This was a defect; C++17 changed it.'
          : id === 'octal'
            ? 'Print 010 and you get 8. Prefer 0x or just 10. Leading zeros are not padding.'
            : id === 'suffix'
              ? 'Write 42u when you mean unsigned. Mixing with signed -1 is the same trap as −1 < 1u.'
              : id === 'nullptr'
                ? 'Use nullptr. NULL is a macro; 0 is an int. Overload sets treat them differently.'
                : 'C++14: auto x{1} is a list of one int. If you wanted int, write auto x = 1; or int x{1}.'

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
      playLabel="Play literal"
      step={i}
      stepCount={4}
      sig={source}
      caption={caption}
      code={code}
      tone={trap ? 'warn' : 'idle'}
    >
      <div className="fx-decode">
        <div className={`fx-slot${i === 0 ? ' fx-slot--focus' : ''}`}>
          <span className="fx-kicker">spelling</span>
          <span className="fx-value">{source}</span>
          <span className="fx-note">what you typed</span>
        </div>
        <div className={`fx-slot${i === 1 ? ' fx-slot--focus' : ''}`}>
          <span className="fx-kicker">decode</span>
          <span className="fx-value" style={{ fontSize: 16 }}>
            {base}
          </span>
          <span className="fx-note">base / form</span>
        </div>
        <div className={`fx-slot${i >= 2 ? ' fx-slot--focus' : ''}${trap ? ' fx-slot--trap' : i >= 3 ? ' fx-slot--ok' : ''}`}>
          <span className="fx-kicker">type · value</span>
          <span className="fx-value" style={{ fontSize: 16 }}>
            {type}
          </span>
          <span className="fx-note">{value}</span>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 3 ? ' fx-verdict--show' : ''} ${trap ? 'fx-verdict--warn' : 'fx-verdict--ok'}`}
      >
        {id === 'octal' && i >= 3
          ? '010 is eight'
          : id === 'suffix' && i >= 3
            ? '42u is unsigned int'
            : id === 'nullptr' && i >= 3
              ? 'nullptr_t, not int 0'
              : id === 'brace' && i >= 3
                ? 'C++14 auto x{1} is initializer_list'
                : ''}
      </div>
    </SceneShell>
  )
}
