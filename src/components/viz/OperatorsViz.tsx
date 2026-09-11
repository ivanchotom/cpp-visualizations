import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Scene = 'mul' | 'assign' | 'eq'

const SCENES: { id: Scene; title: string; play: string }[] = [
  { id: 'mul', title: 'a + b * c', play: 'Play a + b * c' },
  { id: 'assign', title: 'a = b = 1', play: 'Play a = b = 1' },
  { id: 'eq', title: 'a < b == c', play: 'Play a < b == c' },
]

export function OperatorsViz() {
  const [id, setId] = useState<Scene>('mul')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Scene)
  }

  const scene = SCENES.find((s) => s.id === id) ?? SCENES[0]

  const code =
    id === 'mul'
      ? i < 1
        ? `int v = a + b * c;`
        : i < 2
          ? `int v = a + (b * c);  // * first`
          : `int v = a + (b * c);`
      : id === 'assign'
        ? i < 2
          ? `a = b = 1;`
          : `a = (b = 1);  // right-associative`
        : i < 2
          ? `a < b == c;`
          : `(a < b) == c;  // bool compared to c`

  const caption =
    i === 0
      ? id === 'mul'
        ? 'Tokens in source order. Play to see what actually binds first — not left-to-right reading.'
        : id === 'assign'
          ? 'Two assignments. Right-associative: the right = runs first. Nothing hops; the inner slot fills.'
          : 'Looks like a three-way compare. It is not. Watch the grouping box, not a flying token.'
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
                  : i === 1
                    ? '< binds first. You get a bool. == has not run.'
                    : i === 2
                      ? '== then compares that bool to c. Rarely what anyone meant.'
                      : 'Write (a < b) && (b == c), or use parentheses. Same trap: flags & MASK == 0.'

  const warn = id === 'eq' && i >= 2

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
      tone={warn ? 'warn' : i >= 3 ? 'ok' : 'idle'}
    >
      {id === 'mul' && (
        <div className="fx-tree">
          <div className="fx-tree-row">
            <span className={`fx-tok${i >= 2 ? ' fx-tok--hot' : ''}`}>+</span>
          </div>
          <div className={`fx-tree-stem${i >= 2 ? ' fx-tree-stem--on' : ''}`} />
          <div className="fx-tree-row">
            <span className="fx-tok">a</span>
            <span className={`fx-group${i >= 1 ? ' fx-group--on' : ''}`}>
              <span className={`fx-tok${i >= 1 ? ' fx-tok--hot' : ''}`}>*</span>
            </span>
          </div>
          <div className={`fx-tree-stem${i >= 1 ? ' fx-tree-stem--on' : ''}`} />
          <div className="fx-tree-row">
            <span className={`fx-tok${i >= 1 ? ' fx-tok--hot' : ''}`}>b</span>
            <span className={`fx-tok${i >= 1 ? ' fx-tok--hot' : ''}`}>c</span>
          </div>
        </div>
      )}
      {id === 'assign' && (
        <div className="fx-expr">
          <span className={`fx-tok fx-slot${i >= 3 ? ' fx-tok--hot' : ''}`}>
            a{i >= 3 ? <em style={{ fontStyle: 'normal' }}> = 1</em> : ''}
          </span>
          <span className={`fx-op${i >= 2 ? ' fx-op--on' : ''}`}>=</span>
          <span className={`fx-tok${i >= 2 ? ' fx-tok--hot' : ''}`}>
            b{i >= 2 ? <em style={{ fontStyle: 'normal' }}> = 1</em> : ''}
          </span>
          <span className={`fx-op${i === 1 ? ' fx-op--on' : ''}`}>=</span>
          <span className="fx-tok fx-tok--hot">1</span>
        </div>
      )}
      {id === 'eq' && (
        <div className="fx-expr">
          <span className={`fx-group${i >= 1 ? ' fx-group--on' : ''}`}>
            <span className="fx-tok">a</span>
            <span className={`fx-op${i === 1 ? ' fx-op--on' : ''}`}>&lt;</span>
            <span className="fx-tok">b</span>
          </span>
          <span className={`fx-op${i >= 2 ? ' fx-op--on' : ''}`}>==</span>
          <span className={`fx-tok${i >= 2 ? ' fx-tok--warn' : ''}`}>c</span>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 3 ? ' fx-verdict--show' : ''} ${warn ? 'fx-verdict--warn' : 'fx-verdict--ok'}`}
      >
        {id === 'mul' && i >= 3
          ? 'a + (b * c)'
          : id === 'assign' && i >= 3
            ? 'a = (b = 1)'
            : id === 'eq' && i >= 3
              ? '(a < b) == c  ·  not a 3-way compare'
              : ''}
      </div>
    </SceneShell>
  )
}
