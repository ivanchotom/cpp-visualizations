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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const octOn = id === 'octal' && stepped
  const eight = id === 'octal' && decided
  const sufOn = id === 'suffix' && stepped
  const unsOn = id === 'suffix' && decided
  const nilOn = id === 'nullptr' && stepped
  const notInt = id === 'nullptr' && decided
  const listOn = id === 'brace' && stepped
  const intAlt = id === 'brace' && decided
  const trap = eight || (id === 'brace' && recap)
  const ok = (id === 'suffix' && recap) || (id === 'nullptr' && recap)

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
      ? id === 'octal'
        ? 'Play 010. A literal is source text with a type and a value. The spelling is not the value. Stations light in place.'
        : id === 'suffix'
          ? 'Play 42u. u (or U) is part of the token. 42u is not “42, then convert”.'
          : id === 'nullptr'
            ? 'Play nullptr. It is a keyword. It is not 0, and it is not NULL (which is often 0).'
            : 'Play auto x{1}. Braces in C++14 with auto do not mean “this is an int”. Direct-list-init of auto is a list.'
      : id === 'octal' && i === 1
        ? 'A leading 0 means octal, not a style of decimal. 010 is base 8.'
        : id === 'octal' && i === 2
          ? 'Type is int. Value is 1×8 + 0 = 8. The trap is thinking you wrote ten.'
          : id === 'octal'
            ? 'Print 010 and you get 8. Prefer 0x or just 10. Leading zeros are not padding.'
            : id === 'suffix' && i === 1
              ? 'u (or U) is a suffix. It is part of the token. The type is not deduced as int then converted.'
              : id === 'suffix' && i === 2
                ? 'Type is unsigned int. That changes overload resolution and usual arithmetic conversions.'
                : id === 'suffix'
                  ? 'Write 42u when you mean unsigned. Mixing with signed -1 is the same trap as −1 < 1u.'
                  : id === 'nullptr' && i === 1
                    ? 'Type is std::nullptr_t. It converts to any pointer type.'
                    : id === 'nullptr' && i === 2
                      ? 'It is not int 0. Overload sets treat 0, NULL, and nullptr differently.'
                      : id === 'nullptr'
                        ? 'Use nullptr. NULL is a macro; 0 is an int.'
                        : i === 1
                          ? 'auto x{1} is std::initializer_list<int> in C++14. The braces are a list, not a decoration.'
                          : i === 2
                            ? 'auto x = 1 is int. This was a defect; C++17 changed auto x{1} to int. C++14 still has the list.'
                            : 'If you wanted int, write auto x = 1; or int x{1}.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'octal' ? 'Play 010' : id === 'suffix' ? 'Play 42u' : id === 'nullptr' ? 'Play nullptr' : 'Play auto x{1}'

  const verdict =
    id === 'octal' && recap
      ? '010 is eight'
      : eight
        ? 'leading 0 · base 8'
        : id === 'suffix' && recap
          ? '42u is unsigned int'
          : unsOn
            ? 'suffix u · type is unsigned'
            : id === 'nullptr' && recap
              ? 'nullptr_t, not int 0'
              : notInt
                ? 'not an int · not NULL'
                : id === 'brace' && recap
                  ? 'C++14 auto x{1} is initializer_list'
                  : listOn
                    ? 'direct-list-init of auto'
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
      {id === 'octal' && (
        <div className="fx-ladder">
          <div className={`fx-rank${octOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>oc</code>
            <span className="fx-note">oct</span>
            <span className="fx-note">{octOn ? '8' : '—'}</span>
          </div>
          <div className={`fx-rank${eight ? ' fx-rank--trap' : ''}`}>
            <code>tn</code>
            <span className="fx-note">dec</span>
            <span className="fx-note">{eight ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'suffix' && (
        <div className="fx-ladder">
          <div className={`fx-rank${sufOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>4u</code>
            <span className="fx-note">suf</span>
            <span className="fx-note">{sufOn ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${unsOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>ty</code>
            <span className="fx-note">uns</span>
            <span className="fx-note">{unsOn ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'nullptr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${nilOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>np</code>
            <span className="fx-note">ptr</span>
            <span className="fx-note">{nilOn ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${notInt ? ' fx-rank--trap' : ''}`}>
            <code>0</code>
            <span className="fx-note">int</span>
            <span className="fx-note">{notInt ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'brace' && (
        <div className="fx-ladder">
          <div className={`fx-rank${listOn ? ' fx-rank--trap' : ''}`}>
            <code>x</code>
            <span className="fx-note">{'{}'}</span>
            <span className="fx-note">{listOn ? 'il' : '—'}</span>
          </div>
          <div className={`fx-rank${intAlt ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>y</code>
            <span className="fx-note">int</span>
            <span className="fx-note">{intAlt ? 'int' : '—'}</span>
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
