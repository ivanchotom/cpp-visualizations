import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'block' | 'stat' | 'dangle' | 'using'

const MODES: { id: Mode; title: string }[] = [
  { id: 'block', title: 'block' },
  { id: 'stat', title: 'static local' },
  { id: 'dangle', title: 'dangling' },
  { id: 'using', title: 'using ns' },
]

export function ScopeViz() {
  const [id, setId] = useState<Mode>('block')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const innerAlive = (id === 'block' && i >= 1 && i < 3) || (id === 'dangle' && i === 1)
  const innerDead = (id === 'block' && i >= 3) || (id === 'dangle' && i >= 2)
  const nVal =
    id === 'stat' ? (i >= 3 ? 2 : i >= 2 ? 1 : i >= 1 ? 0 : '—') : id === 'block' && innerAlive ? '1' : id === 'dangle' && i === 1 ? '7' : '—'
  const polluted = id === 'using' && i >= 2

  const code =
    id === 'block'
      ? `{\n  int n = 1;   // automatic\n}  // n destroyed here`
      : id === 'stat'
        ? `int counter() {\n  static int n = 0;\n  return ++n;\n}`
        : id === 'dangle'
          ? `int& leak() {\n  int local = 7;\n  return local;\n}`
          : `// header.hpp — don't\nusing namespace std;`

  const caption =
    i === 0
      ? id === 'block'
        ? 'Play the block. Scope is who can see the name. Lifetime is how long the object exists. For a local they end together.'
        : id === 'stat'
          ? 'Play static local. Initialized the first time control passes the declaration. Destroyed at program end — one n for the program.'
          : id === 'dangle'
            ? 'Play a returned reference. The name r is in scope in the caller. The object it bound died with the callee’s block.'
            : 'Play using namespace. A using-directive dumps names into the enclosing scope. In a header that is every TU.'
      : id === 'block' && i === 1
        ? 'n is constructed in the inner frame. The name n is only visible here. Outer code cannot say n.'
        : id === 'block' && i === 2
          ? 'Still in the block. Reverse destruction: last constructed, first destroyed, when the closing brace runs.'
          : id === 'block'
            ? 'Brace closed. The inner frame is dead. n is gone. Scope and lifetime lined up.'
            : id === 'stat' && i === 1
              ? 'First call. n is initialized to 0, once. Not each call.'
              : id === 'stat' && i === 2
                ? '++n → 1. The initializer does not run again. That is why a Meyers singleton works.'
                : id === 'stat'
                  ? 'Second call. Same object, now 2. Destroyed at program end, not when counter returns.'
                  : id === 'dangle' && i === 1
                    ? 'r binds to local. The reference is another name. It does not extend local’s lifetime.'
                    : id === 'dangle' && i === 2
                      ? 'local’s block ended. The object is gone. r still exists in the caller — a name with no object.'
                      : id === 'dangle'
                        ? 'Using r is UB. Scope (r is visible) and lifetime (local is dead) split. That is the whole lesson.'
                        : i === 1
                          ? 'using namespace std; makes std’s names visible as if they were here. Fine in a .cpp, poison in a header.'
                          : i === 2
                            ? 'cout is now in the surrounding soup. Every include of this header injects that lookup into another TU.'
                            : 'Prefer using std::cout; at function scope, or just std::. Named namespaces beat static at namespace scope.'

  const tone = innerDead && id === 'dangle' ? 'trap' : polluted ? 'warn' : innerDead && id === 'block' ? 'ok' : 'idle'

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
      playLabel="Play scope"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {id === 'using' ? (
        <div className="fx-split">
          <div className={`fx-ns${i >= 1 ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">namespace std</span>
            <div className="fx-ns-item">cout</div>
            <div className="fx-ns-item">vector</div>
          </div>
          <div className="fx-gutter">using</div>
          <div className={`fx-ns${polluted ? ' fx-ns--leak' : ''}`}>
            <span className="fx-kicker">enclosing scope</span>
            <div className={`fx-ns-item${polluted ? ' fx-ns-item--out' : ''}`}>{polluted ? 'cout  (leaked)' : '—'}</div>
          </div>
        </div>
      ) : (
        <div className="fx-frames">
          <div className="fx-frame">
            <span className="fx-kicker">{id === 'stat' ? 'function counter()' : id === 'dangle' ? 'caller' : 'function'}</span>
            {id === 'dangle' && i >= 1 && (
              <div className="fx-var">
                int& r {i >= 2 ? '· dangling' : '= local'}
              </div>
            )}
            {id === 'stat' && i >= 1 && (
              <div className="fx-var">
                static int n = {nVal} · lives until exit
              </div>
            )}
            {(id === 'block' || id === 'dangle') && (
              <div className={`fx-frame fx-frame--inner${innerDead ? ' fx-frame--dead' : ''}${innerAlive ? '' : i === 0 ? ' fx-slot--dim' : ''}`}>
                <span className="fx-kicker">{innerDead ? 'block ended' : 'block'}</span>
                {(innerAlive || innerDead) && (
                  <div className="fx-var">{id === 'block' ? `int n = ${innerAlive ? nVal : 'gone'}` : `int local = ${innerAlive ? '7' : 'destroyed'}`}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 3 ? ' fx-verdict--show' : ''} ${
          id === 'dangle' ? 'fx-verdict--trap' : polluted ? 'fx-verdict--warn' : 'fx-verdict--ok'
        }`}
      >
        {id === 'block' && i >= 3
          ? 'n destroyed with the brace'
          : id === 'stat' && i >= 3
            ? 'same n · 2 · not re-initialized'
            : id === 'dangle' && i >= 3
              ? 'r is in scope · local is dead · UB'
              : id === 'using' && i >= 3
                ? 'header pollution · every TU sees cout'
                : ''}
      </div>
    </SceneShell>
  )
}
