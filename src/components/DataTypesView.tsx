import { useState } from 'react'
import { SceneShell } from './viz/scene/SceneShell.tsx'
import { useBeats } from './viz/scene/useBeats.ts'

type Mode = 'rank' | 'mix' | 'long' | 'null'

const MODES: { id: Mode; title: string }[] = [
  { id: 'rank', title: 'ranking' },
  { id: 'mix', title: '-1 < 1u' },
  { id: 'long', title: 'long' },
  { id: 'null', title: 'nullptr' },
]

export function DataTypesView() {
  const [id, setId] = useState<Mode>('rank')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const mixTrap = id === 'mix' && decided
  const winTrap = id === 'long' && decided
  const nullTrap = id === 'null' && decided
  const ok = (id === 'rank' && recap) || (id === 'null' && recap)

  const code =
    id === 'rank'
      ? recap
        ? `sizeof(char) <= sizeof(short)
  <= sizeof(int) <= sizeof(long);
// ranking is required; widths are not`
        : `sizeof(char) == 1;  // by definition`
      : id === 'mix'
        ? recap
          ? `-1 < 1u;  // false
// −1 became UINT_MAX`
          : `-1 < 1u;`
        : id === 'long'
          ? recap
            ? `// LP64:  long is 8
// LLP64: long is 4  (Windows)
std::int64_t k = 0;  // when width is the contract`
            : `sizeof(long);  // 8 on LP64, 4 on LLP64`
          : recap
            ? `void* p = nullptr;  // std::nullptr_t
// NULL is a macro; 0 is an int`
            : `void* p = nullptr;`

  const caption =
    i === 0
      ? id === 'rank'
        ? 'Play ranking. The standard guarantees relative order, not exact widths. This sheet is typical LP64 (Linux/macOS).'
        : id === 'mix'
          ? 'Play −1 < 1u. Mixing signed and unsigned in a comparison converts the signed operand. The result is often the opposite of what you meant.'
          : id === 'long'
            ? 'Play long. LP64 (Linux/macOS) makes long 8. Windows LLP64 keeps long at 4. Do not assume.'
            : 'Play nullptr. Use nullptr (type std::nullptr_t), never NULL or 0, for pointers.'
      : id === 'rank' && i === 1
        ? 'sizeof(char) is 1 by definition. short is at least 16 bits. Ranking is required; CHAR_BIT is usually 8.'
        : id === 'rank' && i === 2
          ? 'int is the default integer. Typically 32 bits — not guaranteed. Use <cstdint> when the width is the contract.'
          : id === 'rank'
            ? 'long is 8 on this LP64 machine. long long is at least 64 bits everywhere. Ranking: char ≤ short ≤ int ≤ long ≤ long long.'
            : id === 'mix' && i === 1
              ? 'Left is signed −1. Right is unsigned 1u. Usual arithmetic conversions pick unsigned int. Stations light in place.'
              : id === 'mix' && i === 2
                ? '−1 converted to unsigned is UINT_MAX. UINT_MAX < 1u is false. The comparison did exactly what the conversions asked.'
                : id === 'mix'
                  ? 'Write the types, or compare in a signed domain. −1 < 1u is the classic trap, not a compiler bug.'
                  : id === 'long' && i === 1
                    ? 'LP64: int 4, long 8, pointer 8. Linux and macOS. long lights 8.'
                    : id === 'long' && i === 2
                      ? 'LLP64 (Windows): long stays 4. Pointers are still 8. sizeof(long) is not a portable 64-bit check.'
                      : id === 'long'
                        ? 'When the width is the contract, write std::int64_t or long long. int is the default when it is not.'
                        : i === 1
                          ? 'nullptr is a keyword. Type is std::nullptr_t. It converts to any pointer type.'
                          : i === 2
                            ? 'NULL is a macro (often 0). 0 is an int. Overload sets treat them differently from nullptr.'
                            : 'Use nullptr. That is the C++11/14 spelling. It is an address, not an integer 0.'

  const tone = mixTrap ? 'trap' : winTrap || nullTrap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'rank' ? 'Play ranking' : id === 'mix' ? 'Play -1 < 1u' : id === 'long' ? 'Play long' : 'Play nullptr'

  const verdict =
    id === 'rank' && recap
      ? 'char ≤ short ≤ int ≤ long'
      : id === 'rank' && decided
        ? 'int · default integer'
        : id === 'rank' && stepped
          ? 'char is 1 · short ≥ 16 bits'
          : mixTrap && recap
            ? '−1 < 1u → false'
            : mixTrap
              ? '−1 became UINT_MAX'
              : id === 'mix' && stepped
                ? 'usual conversions → unsigned'
                : winTrap && recap
                  ? 'do not assume long is 8'
                  : winTrap
                    ? 'LLP64 · long is 4'
                    : id === 'long' && stepped
                      ? 'LP64 · long is 8'
                      : id === 'null' && recap
                        ? 'nullptr · not NULL, not 0'
                        : nullTrap
                          ? 'NULL / 0 · int'
                          : id === 'null' && stepped
                            ? 'keyword · not an int'
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
      {id === 'rank' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>ch</code>
            <span className="fx-note">sizeof</span>
            <span className="fx-note">{stepped ? '1' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>lg</code>
            <span className="fx-note">sizeof</span>
            <span className="fx-note">{decided ? '8' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'mix' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${mixTrap ? ' fx-rank--trap' : ''}`}>
            <code>s</code>
            <span className="fx-note">signed</span>
            <span className="fx-note">{mixTrap ? 'max' : stepped ? '-1' : '—'}</span>
          </div>
          <div className={`fx-rank${mixTrap ? ' fx-rank--trap' : ''}`}>
            <code>lt</code>
            <span className="fx-note">cmp</span>
            <span className="fx-note">{mixTrap ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'long' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>LP</code>
            <span className="fx-note">Linux</span>
            <span className="fx-note">{stepped ? '8' : '—'}</span>
          </div>
          <div className={`fx-rank${winTrap ? ' fx-rank--trap' : ''}`}>
            <code>Win</code>
            <span className="fx-note">long</span>
            <span className="fx-note">{winTrap ? '4' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'null' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>np</code>
            <span className="fx-note">nullptr</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${nullTrap ? ' fx-rank--trap' : ''}`}>
            <code>N</code>
            <span className="fx-note">NULL</span>
            <span className="fx-note">{nullTrap ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          mixTrap ? 'fx-verdict--trap' : winTrap || nullTrap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
