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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const nOn = id === 'block' && stepped
  const nGone = id === 'block' && recap
  const initOn = id === 'stat' && stepped
  const nOne = id === 'stat' && decided
  const nTwo = id === 'stat' && recap
  const localOn = id === 'dangle' && i === 1
  const localGone = id === 'dangle' && decided
  const leaked = id === 'using' && decided
  const trap = localGone
  const warn = leaked
  const ok = nGone || nTwo

  const code =
    id === 'block'
      ? recap
        ? `{\n  int n = 1;   // automatic\n}  // n destroyed here`
        : `{\n  int n = 1;   // automatic\n}`
      : id === 'stat'
        ? `int counter() {\n  static int n = 0;\n  return ++n;\n}`
        : id === 'dangle'
          ? `int& leak() {\n  int local = 7;\n  return local;\n}`
          : `// header.hpp — don't\nusing namespace std;`

  const caption =
    i === 0
      ? id === 'block'
        ? 'Play int n. Scope is who can see the name. Lifetime is how long the object exists. For a local they end together.'
        : id === 'stat'
          ? 'Play ++n. A static local is initialized the first time control passes the declaration. Destroyed at program end — one n for the program.'
          : id === 'dangle'
            ? 'Play int& leak. The name r is in scope in the caller. The object it bound died with the callee’s block.'
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

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'block' ? 'Play int n' : id === 'stat' ? 'Play ++n' : id === 'dangle' ? 'Play int& leak' : 'Play using namespace'

  const verdict =
    nGone
      ? 'n destroyed with the brace'
      : nTwo
        ? 'same n · 2 · not re-initialized'
        : localGone && recap
          ? 'r is in scope · local is dead · UB'
          : localGone
            ? 'local gone · r still names it'
            : leaked && recap
              ? 'header pollution · every TU sees cout'
              : leaked
                ? 'cout dumped into this scope'
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
      {id === 'block' && (
        <div className="fx-ladder">
          <div className={`fx-rank${nOn ? ' fx-rank--on' : ''}${nGone ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">stk</span>
            <span className="fx-note">{nGone ? 'gone' : nOn ? '1' : '—'}</span>
          </div>
          <div className={`fx-rank${nGone ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>out</code>
            <span className="fx-note">see</span>
            <span className="fx-note">{nGone ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'stat' && (
        <div className="fx-ladder">
          <div className={`fx-rank${initOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>in</code>
            <span className="fx-note">1x</span>
            <span className="fx-note">{initOn ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${nOne ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>++</code>
            <span className="fx-note">n</span>
            <span className="fx-note">{nTwo ? '2' : nOne ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dangle' && (
        <div className="fx-ladder">
          <div className={`fx-rank${localOn ? ' fx-rank--on' : ''}${localGone ? ' fx-rank--trap' : ''}`}>
            <code>loc</code>
            <span className="fx-note">stk</span>
            <span className="fx-note">{localGone ? 'gone' : localOn ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${localOn ? ' fx-rank--on' : ''}${localGone ? ' fx-rank--trap' : ''}`}>
            <code>r</code>
            <span className="fx-note">ref</span>
            <span className="fx-note">{localGone ? 'ub' : localOn ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'using' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>std</code>
            <span className="fx-note">io</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${leaked ? ' fx-rank--trap' : ''}`}>
            <code>hdr</code>
            <span className="fx-note">use</span>
            <span className="fx-note">{leaked ? 'leak' : '—'}</span>
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
