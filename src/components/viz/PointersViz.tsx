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

  const pAtB = id === 'reseat' && decided
  const pNull = id === 'null' && stepped
  const starUb = id === 'null' && decided
  const xAlive = id === 'dangle' && stepped && !decided
  const dangling = id === 'dangle' && decided
  const writeB = id === 'write' && stepped
  const writeA = id === 'write' && decided
  const trap = (id === 'null' && decided) || dangling
  const ok = (id === 'reseat' && recap) || (id === 'write' && recap)

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
        ? 'p starts at a. r is another name for a, for life. Stations light in place — nothing hops.'
        : id === 'reseat' && i === 2
          ? 'p = &b. p now names b. r did not move. There is no r = b that rebinds a reference.'
          : id === 'reseat'
            ? 'p can be null or reseated. r cannot. Prefer r in APIs; p when absence or reseating is the design.'
            : id === 'write' && i === 1
              ? '++*p writes through the address. b becomes 21. a is untouched.'
              : id === 'write' && i === 2
                ? '++r writes a. The alias never left a. Same object, two names. a is 11; b is still 21.'
                : id === 'write'
                  ? 'r = b would also assign to a. That is the classic trap: it looks like reseating and is not.'
                  : id === 'null' && i === 1
                    ? 'p = nullptr. p still exists as an object; it holds the null pointer value.'
                    : id === 'null' && i === 2
                      ? '*p now is undefined behavior. A reference cannot represent this state. That is why APIs use T* for optional objects.'
                      : id === 'null'
                        ? 'int& r; does not compile. Bind at initialization, or use a pointer when absence is the design.'
                        : i === 1
                          ? 'x is automatic. p stores its address. The object is still alive inside f.'
                          : i === 2
                            ? 'f returned. The frame is gone. p still holds a bit pattern. The object is not there.'
                            : '*p is a dangling load. The address did not keep x alive.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'reseat'
      ? 'Play p = &b'
      : id === 'write'
        ? 'Play ++*p then ++r'
        : id === 'null'
          ? 'Play p = nullptr'
          : 'Play return &x'

  const verdict =
    id === 'reseat' && recap
      ? 'p → b · r still a · two different bindings'
      : pAtB
        ? 'p reseated · r stayed'
        : id === 'write' && recap
          ? '++r wrote a · alias never moved'
          : writeA
            ? '++r · a is 11'
            : writeB
              ? '++*p · b is 21'
              : id === 'null' && recap
                ? 'p may be null · r cannot'
                : starUb
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
      {id === 'reseat' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">ptr</span>
            <span className="fx-note">{pAtB ? 'b' : stepped ? 'a' : '—'}</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>r</code>
            <span className="fx-note">ref</span>
            <span className="fx-note">{stepped ? 'a' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'write' && (
        <div className="fx-ladder">
          <div className={`fx-rank${writeB ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>*p</code>
            <span className="fx-note">b</span>
            <span className="fx-note">{writeB ? '21' : '—'}</span>
          </div>
          <div className={`fx-rank${writeA ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>r</code>
            <span className="fx-note">a</span>
            <span className="fx-note">{writeA ? '11' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'null' && (
        <div className="fx-ladder">
          <div className={`fx-rank${pNull ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">nil</span>
            <span className="fx-note">{pNull ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${starUb ? ' fx-rank--trap' : ''}`}>
            <code>*p</code>
            <span className="fx-note">rd</span>
            <span className="fx-note">{starUb ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dangle' && (
        <div className="fx-ladder">
          <div className={`fx-rank${xAlive ? ' fx-rank--on' : ''}${dangling ? ' fx-rank--trap' : ''}`}>
            <code>x</code>
            <span className="fx-note">stk</span>
            <span className="fx-note">{dangling ? 'gone' : xAlive ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${xAlive ? ' fx-rank--on' : ''}${dangling ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">ret</span>
            <span className="fx-note">{dangling ? 'ub' : xAlive ? 'ok' : '—'}</span>
          </div>
        </div>
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
