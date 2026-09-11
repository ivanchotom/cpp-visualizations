import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'reseat' | 'write' | 'null' | 'dangle'

const MODES: { id: Mode; title: string }[] = [
  { id: 'reseat', title: 'reseat' },
  { id: 'write', title: 'write' },
  { id: 'null', title: 'nullptr' },
  { id: 'dangle', title: 'dangle' },
]

export function PointersViz() {
  const [id, setId] = useState<Mode>('reseat')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const pAtB = id === 'reseat' ? decided : id === 'write' ? true : false
  const pNull = id === 'null' && stepped
  const dangling = id === 'dangle' && decided
  const aVal = id === 'write' && recap ? 11 : 10
  const bVal = id === 'write' && decided ? 21 : 20
  const xAlive = id === 'dangle' && stepped && !decided
  const trap = (id === 'null' && decided && !recap) || dangling
  const ok = (id === 'reseat' && recap) || (id === 'write' && recap) || (id === 'null' && recap)

  const code =
    id === 'reseat'
      ? recap
        ? `p = &b;          // ok
// r is still a
// there is no r = b that rebinds`
        : `int a = 10, b = 20;
int* p = &a;
int& r = a;`
      : id === 'write'
        ? recap
          ? `++*p;   // writes b
++r;    // writes a, does not reseat
// r = b would also assign to a`
          : `int* p = &b;
int& r = a;`
        : id === 'null'
          ? recap
            ? `p = nullptr;     // ok
// *p is UB
// int& r;         // ill-formed — must bind`
            : `int* p = &a;
p = nullptr;`
          : recap
            ? `int* p = f();
*p;                 // dangling — UB`
            : `int* f() {
  int x = 7;
  return &x;        // address of automatic
}`

  const caption =
    i === 0
      ? id === 'reseat'
        ? 'Play p = &b. A pointer is an object that holds an address. It can reseat. A reference is another name for an existing object and cannot move.'
        : id === 'write'
          ? 'Play ++*p then ++r. Write-through follows the current binding. ++r writes a. r = b assigns through the alias — it does not reseat r.'
          : id === 'null'
            ? 'Play p = nullptr. Pointers may be null. A reference cannot: it must bind at initialization. *nullptr is undefined behavior.'
            : 'Play return &x. Returning a pointer to a local automatic object is undefined behavior. The address does not keep the object alive.'
      : id === 'reseat' && i === 1
        ? 'p starts at a. The cyan bar is an address. The green weld is r: another name for a, for life.'
        : id === 'reseat' && i === 2
          ? 'p = &b. The cyan bar now names b. r did not move. There is no r = b that rebinds a reference.'
          : id === 'reseat'
            ? 'p can be null or reseated. r cannot. Prefer r in APIs; p when absence or reseating is the design.'
            : id === 'write' && i === 1
              ? '++*p writes through the address. b becomes 21. a is untouched. The flash is in place — nothing hops.'
              : id === 'write' && i === 2
                ? '++r writes a. The weld never left a. Same object, two names. a is 11; b is still 21.'
                : id === 'write'
                  ? 'r = b would also assign to a. That is the classic trap: it looks like reseating and is not.'
                  : id === 'null' && i === 1
                    ? 'p = nullptr. The cyan bar is dead. p still exists as an object; it holds the null pointer value.'
                    : id === 'null' && i === 2
                      ? '*p now is undefined behavior. A reference cannot represent this state. That is why APIs use T* for optional objects.'
                      : id === 'null'
                        ? 'int& r; does not compile. Bind at initialization, or use a pointer when absence is the design.'
                        : i === 1
                          ? 'x is automatic. p stores its address. The object is still alive inside f.'
                          : i === 2
                            ? 'f returned. The frame is gone. p still holds a bit pattern. The object is not there.'
                            : '*p is a dangling load. The address did not keep x alive. Same trap as return &x from a stack-heap demo.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'reseat'
      ? 'Play p = &b'
      : id === 'write'
        ? 'Play ++*p then ++r'
        : id === 'null'
          ? 'Play p = nullptr'
          : 'Play return &x'

  const pNote = pNull ? 'nullptr' : dangling ? 'stale address' : pAtB ? '0xB0 · *p = ' + bVal : '0xA0 · *p = ' + aVal
  const pLink = pNull || dangling ? 'dead' : 'on'
  const pPointee = pNull ? '—' : dangling ? 'gone' : pAtB ? String(bVal) : aVal

  const verdict =
    id === 'reseat' && recap
      ? 'p → b · r still a · two different bindings'
      : id === 'reseat' && decided
        ? 'cyan reseated · green weld stayed'
        : id === 'write' && recap
          ? '++r wrote a · weld never moved'
          : id === 'write' && decided
            ? '++*p · b is 21 · a unchanged'
            : id === 'null' && recap
              ? 'p may be null · r cannot'
              : id === 'null' && decided
                ? '*p is UB'
                : id === 'dangle' && recap
                  ? 'dangling · UB'
                  : dangling
                    ? 'frame gone · p still holds bits'
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
      {id === 'dangle' ? (
        <div className="fx-sh">
          <div className={`fx-pane${xAlive ? ' fx-pane--focus' : ''}${dangling ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">stack</span>
            <div className={`fx-slot${xAlive ? ' fx-slot--focus' : dangling ? ' fx-slot--dim' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">int x</span>
              <span className="fx-value">{xAlive ? '7' : '—'}</span>
              <span className="fx-note">{dangling ? 'destroyed' : stepped ? 'automatic' : 'not in f yet'}</span>
            </div>
          </div>
          <div className={`fx-link${dangling ? ' fx-link--dead' : xAlive ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${dangling ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">caller</span>
            <div className={`fx-slot${dangling ? ' fx-slot--trap' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">int* p</span>
              <span className="fx-value">{dangling ? 'stale' : xAlive ? '&x' : '—'}</span>
              <span className="fx-note">{dangling ? 'does not keep x alive' : 'stores an address'}</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="fx-sh">
            <div className={`fx-slot${id === 'write' && recap ? ' fx-slot--flash-ref' : !pAtB && !pNull ? ' fx-slot--focus' : ''}`}>
              <span className="fx-kicker">int a</span>
              <span className="fx-value">{aVal}</span>
              <span className="fx-note">r is always this object</span>
            </div>
            <div className="fx-link" />
            <div
              className={`fx-slot${pAtB ? ' fx-slot--focus' : ' fx-slot--dim'}${
                id === 'write' && decided && !recap ? ' fx-slot--flash' : ''
              }`}
            >
              <span className="fx-kicker">int b</span>
              <span className="fx-value">{bVal}</span>
              <span className="fx-note">{pAtB ? 'p names b' : 'other object'}</span>
            </div>
          </div>
          <div className="fx-lockrow">
            <div className={`fx-slot${pNull ? ' fx-slot--trap' : ''}`}>
              <span className="fx-kicker">pointer</span>
              <span className="fx-value">
                <code>int* p</code>
              </span>
              <span className="fx-note">{pNote}</span>
              <span className="fx-badge fx-badge--open">may reseat</span>
            </div>
            <div className={`fx-link fx-link--${pLink}`} />
            <div className={`fx-slot${pNull || dangling ? ' fx-slot--dim' : pAtB ? ' fx-slot--focus' : ' fx-slot--focus'}`}>
              <span className="fx-kicker">{pNull ? 'pointee' : pAtB ? 'pointee b' : 'pointee a'}</span>
              <span className="fx-value">{pPointee}</span>
              <span className="fx-note">{pNull ? 'no object' : pAtB ? 'b, not r' : 'same object as r'}</span>
            </div>
          </div>
          <div className="fx-lockrow">
            <div className={`fx-slot fx-slot--weld${id === 'write' && recap ? ' fx-slot--flash-ref' : ''}`}>
              <span className="fx-kicker">reference</span>
              <span className="fx-value">
                <code>int& r</code>
              </span>
              <span className="fx-note">r = {aVal}</span>
              <span className="fx-badge fx-badge--lock">welded to a</span>
            </div>
            <div className="fx-link fx-link--weld" />
            <div className={`fx-slot fx-slot--weld${id === 'write' && recap ? ' fx-slot--flash-ref' : ''}`}>
              <span className="fx-kicker">alias of a</span>
              <span className="fx-value">{aVal}</span>
              <span className="fx-note">cannot reseat</span>
            </div>
          </div>
        </>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
