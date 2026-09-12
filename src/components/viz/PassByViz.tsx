import { useState } from 'react'
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

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const bound = i >= 1
  const wrote = i >= 2
  const recap = i >= 3

  const copyOn = id === 'value' && bound
  const aliasOn = (id === 'cref' || id === 'ref') && bound
  const ptrOn = id === 'ptr' && bound
  const fwdOn = id === 'fwd' && bound
  const forwarded = id === 'fwd' && wrote
  const writeThru = (id === 'ref' || id === 'ptr') && wrote
  const ok = recap

  const code =
    id === 'value'
      ? wrote
        ? `void f(T x) { ++x; }  // caller still 7`
        : `void f(T x);          // distinct object\nf(obj);`
      : id === 'cref'
        ? `void f(const T& x);   // no copy, no write\nf(obj);`
        : id === 'ref'
          ? wrote
            ? `void f(T& x) { ++x; } // write-through`
            : `void f(T& x);         // alias, not a copy\nf(obj);`
          : id === 'ptr'
            ? wrote
              ? `++*p;                 // writes obj`
              : `void f(T* p);         // nullable, reseatable\nf(&obj);`
            : wrote
              ? `g(std::forward<U>(x)); // preserve category`
              : `template<class U>\nvoid f(U&& x);        // deduced, not rvalue-only\nf(obj);`

  const caption =
    i === 0
      ? id === 'value'
        ? 'Play f(obj) copy. By-value is a new object. Cheap small types copy; big types usually do not. Stations light in place.'
        : id === 'cref'
          ? 'Play const alias. const T& is a read-only alias. Temporaries can bind here. No copy, no write.'
          : id === 'ref'
            ? 'Play write-through. T& is an in-out alias. It cannot bind to a temporary.'
            : id === 'ptr'
              ? 'Play f(&obj). T* stores an address. It may be null and you can reseat it. A reference cannot.'
              : 'Play forward. In a deduced template, U&& is a forwarding reference — it binds to lvalues and rvalues.'
      : id === 'value' && i === 1
        ? 'x is a distinct copy. The caller’s 7 stays put. The copy is a new object, not a weld.'
        : id === 'value' && i === 2
          ? '++x mutates only the copy. That is why cheap types pass by value, and big types usually do not.'
          : id === 'value'
            ? 'Two objects, two lifetimes. A sink parameter still takes by value, then std::move inside — C++14.'
            : id === 'cref' && i === 1
              ? 'Same object, read-only. The callee cannot write. Temporaries extend here.'
              : id === 'cref' && i === 2
                ? 'No write. const on the alias is the API. Callee would not compile a mutation.'
                : id === 'cref'
                  ? 'Read-only bigger types: const T&. Prefer this over const T* unless null is meaningful.'
                  : id === 'ref' && i === 1
                    ? 'Mutable alias. The signature at the call site says in-out: f(obj).'
                    : id === 'ref' && i === 2
                      ? 'Write-through: ++x updates the caller. Same object, two names.'
                      : id === 'ref'
                        ? 'Out-parameter. Cannot bind a temporary. If absence matters, use T* instead.'
                        : id === 'ptr' && i === 1
                          ? 'p holds an address. p may be null. You can reseat it; a reference cannot. C++14 has no optional<T&>.'
                          : id === 'ptr' && i === 2
                            ? '++*p writes the pointee. The pointer itself did not move. Prefer T* when null is the design.'
                            : id === 'ptr'
                              ? 'Address, not an alias. Reseat or pass nullptr. Do not use T& when the callee might skip the object.'
                              : i === 1
                                ? 'U&& in a deduced template binds to this lvalue as U = T&. It is not “rvalue only.” A non-template T&& would reject obj.'
                                : i === 2
                                  ? 'std::forward<U>(x) restores the original category so the next call can move or copy correctly.'
                                  : 'std::forward only on forwarding references. std::move on owned rvalues you are done with.'

  const tone = ok ? 'ok' : 'idle'
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

  const verdict =
    id === 'value' && wrote
      ? 'copy · caller still 7'
      : id === 'cref' && wrote
        ? 'const alias · no write'
        : id === 'ref' && wrote
          ? 'write-through · same object'
          : id === 'ptr' && wrote
            ? 'address · nullable, reseatable'
            : forwarded
              ? 'forwarding reference · preserve category'
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
      {id === 'value' && (
        <div className="fx-ladder">
          <div className={`fx-rank${copyOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>obj</code>
            <span className="fx-note">call</span>
            <span className="fx-note">{bound ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${copyOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">copy</span>
            <span className="fx-note">{wrote ? '8' : copyOn ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cref' && (
        <div className="fx-ladder">
          <div className={`fx-rank${aliasOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>obj</code>
            <span className="fx-note">call</span>
            <span className="fx-note">{bound ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${aliasOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">cref</span>
            <span className="fx-note">{wrote ? 'ok' : aliasOn ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ref' && (
        <div className="fx-ladder">
          <div className={`fx-rank${aliasOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>obj</code>
            <span className="fx-note">call</span>
            <span className="fx-note">{writeThru ? '8' : bound ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${writeThru ? ' fx-rank--on' : aliasOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">ref</span>
            <span className="fx-note">{writeThru ? '8' : aliasOn ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ptr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${ptrOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>obj</code>
            <span className="fx-note">tgt</span>
            <span className="fx-note">{writeThru ? '8' : bound ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${ptrOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">ptr</span>
            <span className="fx-note">{ptrOn ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'fwd' && (
        <div className="fx-ladder">
          <div className={`fx-rank${fwdOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>U</code>
            <span className="fx-note">T&</span>
            <span className="fx-note">{fwdOn ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${forwarded ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>fwd</code>
            <span className="fx-note">fwd</span>
            <span className="fx-note">{forwarded ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${ok ? 'fx-verdict--ok' : ''}`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
