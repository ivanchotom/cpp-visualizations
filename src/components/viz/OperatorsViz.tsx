import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Scene = 'mul' | 'assign' | 'eq' | 'bit'

const SCENES: { id: Scene; title: string; play: string }[] = [
  { id: 'mul', title: 'a + b * c', play: 'Play a + b * c' },
  { id: 'assign', title: 'a = b = 1', play: 'Play a = b = 1' },
  { id: 'eq', title: 'a < b == c', play: 'Play a < b == c' },
  { id: 'bit', title: '& vs ==', play: 'Play flags & MASK == 0' },
]

export function OperatorsViz() {
  const [id, setId] = useState<Scene>('mul')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Scene)
  }

  const scene = SCENES.find((s) => s.id === id) ?? SCENES[0]
  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const warn = (id === 'eq' && decided) || (id === 'bit' && decided && !recap)
  const ok = recap && id !== 'eq' && !(id === 'bit' && !recap)
  const trap = id === 'bit' && decided && !recap

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
            ? `if ((flags & MASK) == 0) { }  // what you meant`
            : `if (flags & MASK == 0) { }    // flags & (MASK == 0)`

  const caption =
    i === 0
      ? id === 'mul'
        ? 'Tokens in source order. Play to see what actually binds first — not left-to-right reading. When in doubt, parenthesize.'
        : id === 'assign'
          ? 'Two assignments. Right-associative: the right = runs first. Nothing hops; the inner slot fills.'
          : id === 'eq'
            ? 'Looks like a three-way compare. It is not. Watch the grouping box, not a flying token.'
            : 'Play flags & MASK == 0. Comparison binds tighter than bitwise &. This is the classic “flags test” bug.'
      : id === 'mul' && i === 1
        ? '* is multiplicative (tighter than +). A grouping box closes around b * c. a waits.'
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

  const tone = trap ? 'trap' : warn ? 'warn' : ok || recap ? 'ok' : 'idle'

  const verdict =
    id === 'mul' && recap
      ? 'a + (b * c)'
      : id === 'mul' && decided
        ? '* first · then +'
        : id === 'assign' && recap
          ? 'a = (b = 1)'
          : id === 'assign' && decided
            ? 'right-associative'
            : id === 'eq' && recap
              ? '(a < b) == c  ·  not a 3-way compare'
              : id === 'eq' && decided
                ? 'bool compared to c'
                : id === 'bit' && recap
                  ? '(flags & MASK) == 0'
                  : trap
                    ? 'flags & (MASK == 0) · wrong'
                    : ''

  return (
    <SceneShell
      modes={SCENES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setId(id)
      }}
      playLabel={scene.play}
      step={i}
      stepCount={4}
      sig={scene.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {id === 'mul' && (
        <>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>b * c</code>
            <span className="fx-note">multiplicative</span>
            <span className="fx-note">{stepped ? 'first' : 'tighter'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}`}>
            <code>a + …</code>
            <span className="fx-note">additive</span>
            <span className="fx-note">{decided ? 'then +' : 'waits'}</span>
          </div>
        </>
      )}
      {id === 'assign' && (
        <div className="fx-sh">
          <div className={`fx-slot${recap ? ' fx-slot--ok' : ''}`}>
            <span className="fx-kicker">a</span>
            <span className="fx-value">{recap ? '1' : '—'}</span>
            <span className="fx-note">{recap ? 'filled last' : 'left ='}</span>
          </div>
          <div className={`fx-link${decided ? ' fx-link--on' : ''}`} />
          <div className={`fx-slot${decided ? ' fx-slot--ok' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">b</span>
            <span className="fx-value">{decided ? '1' : '—'}</span>
            <span className="fx-note">{stepped ? 'right = first' : 'inner assign'}</span>
          </div>
        </div>
      )}
      {id === 'eq' && (
        <>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>a &lt; b</code>
            <span className="fx-note">comparison</span>
            <span className="fx-note">{stepped ? 'bool' : 'first'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--trap' : ''}`}>
            <code>… == c</code>
            <span className="fx-note">equality</span>
            <span className="fx-note">{decided ? 'bool vs c' : 'not a 3-way'}</span>
          </div>
        </>
      )}
      {id === 'bit' && (
        <>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${trap ? ' fx-rank--trap' : recap ? ' fx-rank--done' : ''}`}>
            <code>MASK == 0</code>
            <span className="fx-note">comparison first</span>
            <span className="fx-note">{trap ? '0 or 1' : stepped ? 'binds tighter' : '& waits'}</span>
          </div>
          <div className={`fx-rank${trap ? ' fx-rank--trap' : recap ? ' fx-rank--on' : ''}`}>
            <code>{recap ? '(flags & MASK) == 0' : 'flags & …'}</code>
            <span className="fx-note">bitwise</span>
            <span className="fx-note">{recap ? 'what you meant' : trap ? 'flags & 0/1' : 'looser than =='}</span>
          </div>
        </>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : warn ? 'fx-verdict--warn' : recap ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
