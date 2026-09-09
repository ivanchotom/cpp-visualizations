import { useState } from 'react'

type Kind = 'unique' | 'shared' | 'weak'

export function OwnershipViz() {
  const [kind, setKind] = useState<Kind>('unique')
  const [owners, setOwners] = useState(1)
  const [weak, setWeak] = useState(0)
  const alive = owners > 0

  function reset(k: Kind) {
    setKind(k)
    setOwners(1)
    setWeak(k === 'weak' ? 1 : 0)
  }

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className={`chip${kind === 'unique' ? ' chip--active' : ''}`} onClick={() => reset('unique')}>
          unique_ptr
        </button>
        <button className={`chip${kind === 'shared' ? ' chip--active' : ''}`} onClick={() => reset('shared')}>
          shared_ptr
        </button>
        <button className={`chip${kind === 'weak' ? ' chip--active' : ''}`} onClick={() => reset('weak')}>
          weak_ptr
        </button>
      </div>
      <div className="own-row">
        <div className="own-owners">
          {Array.from({ length: Math.max(owners, 0) }, (_, i) => (
            <div key={`o${i}`} className="ptr-box ptr-box--pointer">
              <span className="ptr-kind">{kind === 'unique' ? 'unique' : 'shared'}</span>
              <span className="ptr-name">owner {i + 1}</span>
            </div>
          ))}
          {kind !== 'unique' &&
            Array.from({ length: weak }, (_, i) => (
              <div key={`w${i}`} className="ptr-box ptr-box--ref">
                <span className="ptr-kind">weak</span>
                <span className="ptr-name">observer {i + 1}</span>
              </div>
            ))}
        </div>
        <span className="pipe-arrow">→</span>
        <div className={`mem-cell mem-cell--heap${alive ? '' : ' mem-cell--ghost'}`}>
          <span className="mem-name">T object</span>
          <span className="mem-val">{alive ? 'alive' : 'destroyed'}</span>
          {kind !== 'unique' && (
            <span className="mem-note">
              use = {owners}
              {weak ? ` · weak = ${weak}` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="stepper">
        {kind === 'unique' ? (
          <>
            <button className="chip" onClick={() => setOwners(1)}>
              make_unique
            </button>
            <button className="chip" onClick={() => setOwners(0)}>
              reset / leave scope
            </button>
          </>
        ) : (
          <>
            <button className="chip" onClick={() => setOwners((n) => n + 1)}>
              copy shared_ptr
            </button>
            <button className="chip" onClick={() => setOwners((n) => Math.max(0, n - 1))}>
              drop shared_ptr
            </button>
            {kind === 'weak' && (
              <>
                <button className="chip" onClick={() => setWeak((n) => n + 1)}>
                  add weak_ptr
                </button>
                <button className="chip" onClick={() => setWeak((n) => Math.max(0, n - 1))}>
                  drop weak_ptr
                </button>
              </>
            )}
          </>
        )}
      </div>
      <p className="layout-hint">
        {kind === 'unique' &&
          'One owner. Move it, never copy. Destructor deletes. sizeof is typically one pointer.'}
        {kind === 'shared' &&
          'Last shared_ptr destroys T. Copies bump a control-block refcount (atomic). Cycles leak — that is what weak_ptr is for.'}
        {kind === 'weak' &&
          (alive
            ? 'weak_ptr::lock() would succeed. Dropping all shared_ptrs destroys T even if weaks remain.'
            : 'Object is gone. lock() returns an empty shared_ptr. The control block lives until weaks are gone too.')}
      </p>
    </div>
  )
}
