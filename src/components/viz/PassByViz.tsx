import { useEffect, useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'value' | 'cref' | 'ref' | 'ptr' | 'fwd'

const MODES: { id: Mode; title: string }[] = [
  { id: 'value', title: 'by value' },
  { id: 'cref', title: 'const T&' },
  { id: 'ref', title: 'T&' },
  { id: 'ptr', title: 'T*' },
  { id: 'fwd', title: 'U&&' },
]

export function PassByViz() {
  const [id, setId] = useState<Mode>('value')
  const { i, playing, play, reset } = useBeats(4)
  const [flash, setFlash] = useState<'caller' | 'callee' | 'both' | null>(null)

  function select(next: string) {
    reset()
    setFlash(null)
    setId(next as Mode)
  }

  const bound = i >= 1
  const wrote = i >= 2
  const callerVal = id === 'ref' && wrote ? 8 : id === 'ptr' && wrote ? 8 : 7
  const calleeVal =
    id === 'value'
      ? bound
        ? wrote
          ? 8
          : 7
        : null
      : id === 'ptr'
        ? bound
          ? callerVal
          : null
        : bound
          ? callerVal
          : null

  const copyOn = id === 'value' && bound
  const weldOn = (id === 'cref' || id === 'ref' || id === 'fwd') && bound
  const ptrOn = id === 'ptr' && bound
  const forwarded = id === 'fwd' && wrote

  useEffect(() => {
    if (!playing) return
    if (i === 2 && id === 'value') setFlash('callee')
    else if (i === 2 && id === 'ref') setFlash('both')
    else if (i === 2 && id === 'ptr') setFlash('caller')
    else setFlash(null)
    const t = window.setTimeout(() => setFlash(null), 520)
    return () => window.clearTimeout(t)
  }, [i, playing, id])

  const code =
    id === 'value'
      ? i < 2
        ? `void f(T x);          // distinct object\nf(obj);`
        : `void f(T x) { ++x; }  // caller still 7`
      : id === 'cref'
        ? `void f(const T& x);   // no copy, no write\nf(obj);`
        : id === 'ref'
          ? i < 2
            ? `void f(T& x);         // alias, not a copy\nf(obj);`
            : `void f(T& x) { ++x; } // write-through`
          : id === 'ptr'
            ? i < 2
              ? `void f(T* p);         // nullable, reseatable\nf(&obj);`
              : `++*p;                 // writes obj`
            : i < 2
              ? `template<class U>\nvoid f(U&& x);        // deduced, not rvalue-only\nf(obj);`
              : `g(std::forward<U>(x)); // preserve category`

  const caption =
    i === 0
      ? id === 'value'
        ? 'Play f(obj). By-value is a new object. Cheap small types copy; big types usually do not.'
        : id === 'cref'
          ? 'Play f(obj). const T& is a read-only alias. Temporaries can bind here. No copy, no write.'
          : id === 'ref'
            ? 'Play f(obj). T& is an in-out alias. It cannot bind to a temporary.'
            : id === 'ptr'
              ? 'Play f(&obj). T* stores an address. It may be null and you can reseat it. A reference cannot.'
              : 'Play f(obj). In a deduced template, U&& is a forwarding reference — it binds to lvalues and rvalues.'
      : id === 'value' && i === 1
        ? 'x is a distinct copy. The caller’s 7 stays put. Cyan bar is “new object,” not a weld.'
        : id === 'value' && i === 2
          ? '++x mutates only the copy. That is why cheap types pass by value, and big types usually do not.'
          : id === 'value'
            ? 'Two objects, two lifetimes. A sink parameter still takes by value, then std::move inside — C++14.'
            : id === 'cref' && i === 1
              ? 'Green weld: same object, read-only. The callee cannot write. Temporaries extend here.'
              : id === 'cref' && i === 2
                ? 'No pulse. const on the alias is the API. Callee would not compile a write.'
                : id === 'cref'
                  ? 'Read-only bigger types: const T&. Prefer this over const T* unless null is meaningful.'
                  : id === 'ref' && i === 1
                    ? 'Green weld again, but mutable. The signature at the call site says in-out: f(obj).'
                    : id === 'ref' && i === 2
                      ? 'Write-through: ++x updates the caller. Same object, two names.'
                      : id === 'ref'
                        ? 'Out-parameter. Cannot bind a temporary. If absence matters, use T* instead.'
                        : id === 'ptr' && i === 1
                          ? 'Cyan address. p may be null. You can reseat it; a reference cannot. C++14 has no optional<T&>.'
                          : id === 'ptr' && i === 2
                            ? '++*p writes the pointee. The pointer itself did not move. Prefer T* when null is the design.'
                            : id === 'ptr'
                              ? 'Address, not an alias. Reseat or pass nullptr. Do not use T& when the callee might skip the object.'
                              : i === 1
                                ? 'U&& in a deduced template binds to this lvalue as U = T&. It is not “rvalue only.” A non-template T&& would reject obj.'
                                : i === 2
                                  ? 'std::forward<U>(x) restores the original category so the next call can move or copy correctly.'
                                  : 'std::forward only on forwarding references. std::move on owned rvalues you are done with.'

  const tone =
    id === 'cref' && wrote
      ? 'ok'
      : wrote && (id === 'value' || id === 'ref' || id === 'ptr' || id === 'fwd')
        ? 'ok'
        : 'idle'

  const linkCls = copyOn || ptrOn ? 'fx-link--on' : weldOn ? 'fx-link--weld' : ''
  const playLabel =
    id === 'value'
      ? 'Play f(obj) copy'
      : id === 'cref'
        ? 'Play const alias'
        : id === 'ref'
          ? 'Play write-through'
          : id === 'ptr'
            ? 'Play f(&obj)'
            : 'Play forward'

  const calleeName = id === 'ptr' ? 'p' : 'x'
  const callerFlash = flash === 'caller' || flash === 'both'
  const calleeFlash = flash === 'callee' || flash === 'both'

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={() => {
        setFlash(null)
        play()
      }}
      onReset={() => {
        reset()
        setFlash(null)
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
      <div className="fx-sh">
        <div className={`fx-pane${bound ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">caller</span>
          <div
            className={`fx-slot${bound ? ' fx-slot--focus' : ''}${
              callerFlash ? (id === 'ref' ? ' fx-slot--flash-ref' : ' fx-slot--flash') : ''
            }`}
          >
            <span className="fx-kicker">obj</span>
            <span className="fx-value">{callerVal}</span>
            <span className="fx-note">{id === 'ref' && wrote ? 'written through' : 'T obj'}</span>
          </div>
        </div>
        <div className={`fx-link${linkCls ? ` ${linkCls}` : ''}`} />
        <div className={`fx-pane${bound ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">callee</span>
          <div
            className={`fx-slot${
              copyOn
                ? ' fx-slot--focus'
                : weldOn
                  ? ' fx-slot--weld'
                  : ptrOn
                    ? ' fx-slot--focus'
                    : ' fx-slot--dim'
            }${calleeFlash ? (id === 'value' ? ' fx-slot--flash' : ' fx-slot--flash-ref') : ''}`}
          >
            <span className="fx-kicker">{calleeName}</span>
            <span className="fx-value">{calleeVal === null ? (id === 'ptr' ? 'unset' : '—') : calleeVal}</span>
            <span className="fx-note">
              {id === 'value' && copyOn
                ? wrote
                  ? 'mutated copy'
                  : 'distinct copy'
                : id === 'cref' && bound
                  ? 'const alias'
                  : id === 'ref' && bound
                    ? wrote
                      ? 'same object'
                      : 'mutable alias'
                    : id === 'ptr' && bound
                      ? wrote
                        ? '*p writes obj'
                        : '&obj · reseatable'
                      : id === 'fwd' && bound
                        ? forwarded
                          ? 'forwarded U&&'
                          : 'bound U&&'
                        : 'not bound'}
            </span>
            {id === 'cref' && bound && <span className="fx-badge">const</span>}
            {id === 'fwd' && forwarded && <span className="fx-badge fx-badge--owner">forward</span>}
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          i >= 2 ? (id === 'cref' ? 'fx-verdict--ok' : 'fx-verdict--ok') : ''
        }`}
      >
        {id === 'value' && wrote
          ? 'copy · caller still 7'
          : id === 'cref' && wrote
            ? 'const alias · no write'
            : id === 'ref' && wrote
              ? 'write-through · same object'
              : id === 'ptr' && wrote
                ? 'address · nullable, reseatable'
                : id === 'fwd' && forwarded
                  ? 'forwarding reference · preserve category'
                  : ''}
      </div>
    </SceneShell>
  )
}
