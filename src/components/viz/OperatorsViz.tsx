import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'mul' | 'assign' | 'eq' | 'bit'

const MODES: { id: Mode; title: string }[] = [
  { id: 'mul', title: 'a + b * c' },
  { id: 'assign', title: 'a = b = 1' },
  { id: 'eq', title: 'a < b == c' },
  { id: 'bit', title: '& vs ==' },
]

export function OperatorsViz() {
  const [id, setId] = useState<Mode>('mul')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const eqWarn = id === 'eq' && decided
  const bitTrap = id === 'bit' && decided
  const trap = bitTrap
  const warn = eqWarn
  const ok = (id === 'mul' && recap) || (id === 'assign' && recap)

  const code =
    id === 'mul'
      ? recap
        ? `int v = a + (b * c);  // * first`
        : `int v = a + b * c;`
      : id === 'assign'
        ? recap
          ? `a = (b = 1);  // right-associative`
          : `a = b = 1;`
        : id === 'eq'
          ? recap
            ? `(a < b) == c;  // bool compared to c`
            : `a < b == c;`
          : recap
            ? `if (flags & MASK == 0) { }    // flags & (MASK == 0)
if ((flags & MASK) == 0) { }  // what you meant`
            : `if (flags & MASK == 0) { }    // flags & (MASK == 0)`

  const caption =
    i === 0
      ? id === 'mul'
        ? 'Play a + b * c. Tokens in source order. Play to see what actually binds first — not left-to-right reading. When in doubt, parenthesize.'
        : id === 'assign'
          ? 'Play a = b = 1. Two assignments. Right-associative: the right = runs first. Nothing hops; the inner slot fills.'
          : id === 'eq'
            ? 'Play a < b == c. Looks like a three-way compare. It is not. Watch the grouping, not a flying token.'
            : 'Play flags & MASK == 0. Comparison binds tighter than bitwise &. This is the classic “flags test” bug.'
      : id === 'mul' && i === 1
        ? '* is multiplicative (tighter than +). b * c binds first. a waits. Stations light in place.'
        : id === 'mul' && i === 2
          ? '+ now combines a with that product. The tree is a + (b * c).'
          : id === 'mul'
            ? 'Parentheses make the tree obvious. The table is real; readers should not have to recite it.'
            : id === 'assign' && i === 1
              ? '1 is stored in b. The inner assignment yields b (an lvalue). a is still empty.'
              : id === 'assign' && i === 2
                ? 'That result is stored in a. a = (b = 1), not (a = b) = 1 — the latter would not even type-check the same way.'
                : id === 'assign'
                  ? 'Both names hold 1. Associativity lives in the grouping, not in a token flying left.'
                  : id === 'eq' && i === 1
                    ? '< binds first. You get a bool. == has not run.'
                    : id === 'eq' && i === 2
                      ? '== then compares that bool to c. Rarely what anyone meant.'
                      : id === 'eq'
                        ? 'Write (a < b) && (b == c), or use parentheses. Same class of bug as flags & MASK == 0.'
                        : i === 1
                          ? '== binds first. MASK == 0 is 0 or 1. & has not run.'
                          : i === 2
                            ? 'flags & 0 (or 1). Almost never a mask test. The compiler did exactly what the table asked.'
                            : 'Parenthesize: (flags & MASK) == 0. Same story: std::cout << a ? b : c is (cout << a) ? b : c.'

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'mul'
      ? 'Play a + b * c'
      : id === 'assign'
        ? 'Play a = b = 1'
        : id === 'eq'
          ? 'Play a < b == c'
          : 'Play flags & MASK == 0'

  const verdict =
    id === 'mul' && recap
      ? 'a + (b * c)'
      : id === 'mul' && decided
        ? '* first · then +'
        : id === 'mul' && stepped
          ? 'b * c · first'
          : id === 'assign' && recap
            ? 'a = (b = 1)'
            : id === 'assign' && decided
              ? 'right-associative'
              : id === 'assign' && stepped
                ? 'b = 1 · first'
                : id === 'eq' && recap
                  ? '(a < b) == c · not 3-way'
                  : eqWarn
                    ? 'bool compared to c'
                    : id === 'eq' && stepped
                      ? 'a < b · bool'
                      : bitTrap && recap
                        ? '(flags & MASK) == 0'
                        : bitTrap
                          ? 'flags & (MASK == 0)'
                          : id === 'bit' && stepped
                            ? 'MASK == 0 · first'
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
      {id === 'mul' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>bc</code>
            <span className="fx-note">*</span>
            <span className="fx-note">{stepped ? '1st' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">+</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'assign' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">r=</span>
            <span className="fx-note">{stepped ? '1' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">l=</span>
            <span className="fx-note">{decided ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'eq' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>lt</code>
            <span className="fx-note">{'<'}</span>
            <span className="fx-note">{stepped ? 'bl' : '—'}</span>
          </div>
          <div className={`fx-rank${eqWarn ? ' fx-rank--trap' : ''}`}>
            <code>eq</code>
            <span className="fx-note">==</span>
            <span className="fx-note">{eqWarn ? 'c' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'bit' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${bitTrap ? ' fx-rank--trap' : ''}`}>
            <code>eq</code>
            <span className="fx-note">==0</span>
            <span className="fx-note">{stepped ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${bitTrap ? ' fx-rank--trap' : ''}`}>
            <code>fl</code>
            <span className="fx-note">&amp;</span>
            <span className="fx-note">{bitTrap ? 'bad' : '—'}</span>
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
