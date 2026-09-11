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

  const lockPointee = (id === 'pointee' || id === 'cast') && i >= 1
  const lockPtr = id === 'ptr' && i >= 1
  const writeTry = i >= 2
  const done = i >= 3
  const writeOk = id === 'ptr' && done
  const hits = id === 'mutable' && i >= 2 ? 1 : 0
  const xVal = id === 'ptr' && writeOk ? 2 : id === 'cast' && done ? 'UB' : 1
  const rejected = (id === 'pointee' && writeTry) || (id === 'ptr' && writeTry && !done) || (id === 'cast' && writeTry && !done)
  const ub = id === 'cast' && done

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
        ? 'Play const T*. Two independent knobs: can you change the int, and can you reseat the pointer?'
        : id === 'ptr'
          ? 'Play T* const. The pointer is glued. The int it names is still mutable.'
          : id === 'mutable'
            ? 'Play mutable. A const member function can still write that one field. Logical const, not bitwise.'
            : 'Play const_cast. It compiles. Writing through it is UB if the object was defined const.'
      : id === 'pointee' && i === 1
        ? 'pc points at x. A lock sits on the pointee. *pc is a const int.'
        : id === 'pointee' && i === 2
          ? '*pc = 2 is rejected. You may reseat pc (not shown as a lock on the handle).'
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

  const tone = ub ? 'trap' : rejected && done ? 'warn' : writeOk || (id === 'mutable' && done) ? 'ok' : 'idle'
  const linkOn = i >= 1
  const linkKind = ub ? 'dead' : id === 'ptr' && writeOk ? 'weld' : linkOn ? 'on' : ''

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
      playLabel="Play cv"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-lockrow">
        <div className={`fx-slot${lockPtr ? ' fx-slot--focus' : ''}${id === 'ptr' && writeTry && !writeOk ? ' fx-slot--trap' : ''}`}>
          <span className="fx-kicker">pointer</span>
          <span className="fx-value">{id === 'pointee' || id === 'cast' ? 'pc' : id === 'ptr' ? 'cp' : 'this'}</span>
          {lockPtr && <span className="fx-badge fx-badge--lock">locked handle</span>}
          {!lockPtr && i >= 1 && id !== 'mutable' && <span className="fx-badge fx-badge--open">may reseat</span>}
        </div>
        <div className={`fx-link${linkKind === 'on' ? ' fx-link--on' : ''}${linkKind === 'weld' ? ' fx-link--weld' : ''}${linkKind === 'dead' ? ' fx-link--dead' : ''}`} />
        <div
          className={`fx-slot${lockPointee ? ' fx-slot--focus' : ''}${rejected && id === 'pointee' ? ' fx-slot--trap' : ''}${writeOk ? ' fx-slot--ok' : ''}${ub ? ' fx-slot--trap' : ''}`}
        >
          <span className="fx-kicker">object</span>
          <span className="fx-value">{id === 'mutable' ? hits : xVal}</span>
          {lockPointee && <span className="fx-badge fx-badge--lock">const T</span>}
          {id === 'mutable' && i >= 1 && <span className="fx-badge fx-badge--open">mutable hits</span>}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          ub ? 'fx-verdict--trap' : rejected ? 'fx-verdict--trap' : writeOk || (id === 'mutable' && i >= 2) ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'pointee' && writeTry
          ? '*pc = 2  ·  does not compile'
          : id === 'ptr' && writeTry && !done
            ? 'cp = &y  ·  does not compile'
            : id === 'ptr' && writeOk
              ? '*cp = 2  ·  x is 2'
              : id === 'mutable' && i >= 2
                ? '++hits inside const get() · allowed'
                : ub
                  ? '*p = 2  ·  UB — object was born const'
                  : id === 'cast' && writeTry
                    ? 'const_cast compiles · write is the crime'
                    : ''}
      </div>
    </SceneShell>
  )
}
