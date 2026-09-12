import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'pointee' | 'ptr' | 'mutable' | 'cast'

const MODES: { id: Mode; title: string }[] = [
  { id: 'pointee', title: 'const T*' },
  { id: 'ptr', title: 'T* const' },
  { id: 'mutable', title: 'mutable' },
  { id: 'cast', title: 'const_cast' },
]

export function CvQualViz() {
  const [id, setId] = useState<Mode>('pointee')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const pcIll = id === 'pointee' && decided
  const reseatOk = id === 'pointee' && recap
  const cpIll = id === 'ptr' && decided
  const writeOk = id === 'ptr' && recap
  const getOn = id === 'mutable' && stepped
  const hitsOn = id === 'mutable' && decided
  const castOk = id === 'cast' && stepped
  const ub = id === 'cast' && recap
  const trap = pcIll || (cpIll && !writeOk) || ub
  const ok = writeOk || (hitsOn && recap) || reseatOk

  const code =
    id === 'pointee'
      ? `const int* pc = &x;\n*pc = 2;            // error`
      : id === 'ptr'
        ? `int* const cp = &x;\n*cp = 2;            // ok\ncp = &y;            // error`
        : id === 'mutable'
          ? `struct C {\n  mutable int hits;\n  int get() const { return ++hits; }\n};`
          : `const int x = 1;\nint* p = const_cast<int*>(&x);\n*p = 2;            // UB if x was born const`

  const caption =
    i === 0
      ? id === 'pointee'
        ? 'Play *pc = 2. Two independent knobs: can you change the int, and can you reseat the pointer? Stations light in place.'
        : id === 'ptr'
          ? 'Play *cp = 2. The pointer is glued. The int it names is still mutable.'
          : id === 'mutable'
            ? 'Play ++hits. A const member function can still write that one field. Logical const, not bitwise.'
            : 'Play const_cast. It compiles. Writing through it is UB if the object was defined const.'
      : id === 'pointee' && i === 1
        ? 'pc points at x. *pc is a const int. The handle may still reseat.'
        : id === 'pointee' && i === 2
          ? '*pc = 2 is rejected. You may reseat pc. The lock is on the T, not the pointer.'
          : id === 'pointee'
            ? 'Read as “pointer to const T”. The * is to the right of const: the T is const.'
            : id === 'ptr' && i === 1
              ? 'cp is a const pointer. The handle is locked. The cell is not.'
              : id === 'ptr' && i === 2
                ? 'cp = &y is rejected. Reseating is the thing const on the pointer forbids.'
                : id === 'ptr'
                  ? '*cp = 2 succeeds. x is 2. const after the * locks the address, not the int.'
                  : id === 'mutable' && i === 1
                    ? 'get() is const. this is const C*. hits is declared mutable.'
                    : id === 'mutable' && i === 2
                      ? '++hits is allowed. The object’s bitwise const is broken on purpose for caches and counters.'
                      : id === 'mutable'
                        ? 'Don’t use mutable to dodge a design that should not be const. It is a narrow tool.'
                        : i === 1
                          ? 'const_cast strips const from the pointer type. The lock looks gone. The object may still be const.'
                          : i === 2
                            ? 'The write is attempted. If x was defined const, this is undefined behavior — not a warning, UB.'
                            : 'The cell is poisoned. const_cast is for interfacing with const-incorrect APIs, not for mutation.'

  const tone = ub ? 'trap' : trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'pointee' ? 'Play *pc = 2' : id === 'ptr' ? 'Play *cp = 2' : id === 'mutable' ? 'Play ++hits' : 'Play const_cast'

  const verdict =
    pcIll && recap
      ? 'pointer to const T · may reseat'
      : pcIll
        ? '*pc = 2  ·  does not compile'
        : writeOk
          ? '*cp = 2  ·  x is 2'
          : cpIll
            ? 'cp = &y  ·  does not compile'
            : hitsOn && recap
              ? '++hits inside const get() · allowed'
              : hitsOn
                ? 'mutable field · const method writes'
                : ub
                  ? '*p = 2  ·  UB — object was born const'
                  : castOk
                    ? 'const_cast compiles · write is the crime'
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
      {id === 'pointee' && (
        <div className="fx-ladder">
          <div className={`fx-rank${pcIll ? ' fx-rank--trap' : stepped ? ' fx-rank--on' : ''}`}>
            <code>*p</code>
            <span className="fx-note">set</span>
            <span className="fx-note">{pcIll ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${reseatOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>pc</code>
            <span className="fx-note">rst</span>
            <span className="fx-note">{reseatOk ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ptr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${cpIll ? ' fx-rank--trap' : ''}`}>
            <code>cp</code>
            <span className="fx-note">rst</span>
            <span className="fx-note">{cpIll ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${writeOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>*c</code>
            <span className="fx-note">set</span>
            <span className="fx-note">{writeOk ? '2' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'mutable' && (
        <div className="fx-ladder">
          <div className={`fx-rank${getOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>gt</code>
            <span className="fx-note">cst</span>
            <span className="fx-note">{getOn ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${hitsOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>ht</code>
            <span className="fx-note">mut</span>
            <span className="fx-note">{hitsOn ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cast' && (
        <div className="fx-ladder">
          <div className={`fx-rank${castOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>cc</code>
            <span className="fx-note">cst</span>
            <span className="fx-note">{castOk ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${ub ? ' fx-rank--trap' : decided ? ' fx-rank--on' : ''}`}>
            <code>*p</code>
            <span className="fx-note">set</span>
            <span className="fx-note">{ub ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          ub ? 'fx-verdict--trap' : trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
