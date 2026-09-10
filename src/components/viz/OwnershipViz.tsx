import { useState } from 'react'

type Kind = 'unique' | 'shared' | 'weak' | 'cycle'

export function OwnershipViz() {
  const [kind, setKind] = useState<Kind>('cycle')
  const [owners, setOwners] = useState(1)
  const [weak, setWeak] = useState(0)
  const [cycleBroken, setCycleBroken] = useState(false)
  const [externals, setExternals] = useState(1)
  const alive = kind === 'cycle' ? !cycleBroken || externals > 0 : owners > 0
  const leaked = kind === 'cycle' && !cycleBroken && externals === 0

  function reset(k: Kind) {
    setKind(k)
    setOwners(1)
    setWeak(k === 'weak' ? 1 : 0)
    setCycleBroken(false)
    setExternals(1)
  }

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {(['unique', 'shared', 'weak', 'cycle'] as const).map((k) => (
          <button key={k} className={`chip${kind === k ? ' chip--active' : ''}`} onClick={() => reset(k)}>
            {k === 'cycle' ? 'shared cycle' : `${k}_ptr`}
          </button>
        ))}
      </div>

      {kind === 'cycle' ? (
        <div className="own-cycle">
          <div className={`gnode gnode--heap${leaked ? '' : ''}${externals === 0 && cycleBroken ? ' gnode--ghost' : ''}`}>
            <strong>A</strong>
            <span>{cycleBroken ? 'next shared · parent weak' : 'next shared · parent shared'}</span>
          </div>
          <span className="pipe-arrow">{cycleBroken ? '→  ╌╌← weak' : '→  ← leak'}</span>
          <div className={`gnode gnode--heap${externals === 0 && cycleBroken ? ' gnode--ghost' : ''}`}>
            <strong>B</strong>
            <span>{leaked ? 'still alive (cycle)' : alive ? 'alive' : 'destroyed'}</span>
          </div>
        </div>
      ) : (
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
          </div>
        </div>
      )}

      <div className="stepper">
        {kind === 'cycle' ? (
          <>
            <button className="chip" onClick={() => setExternals(1)}>
              hold roots
            </button>
            <button className="chip" onClick={() => setExternals(0)}>
              drop roots
            </button>
            <button className="chip" onClick={() => setCycleBroken(true)}>
              parent = weak_ptr
            </button>
          </>
        ) : kind === 'unique' ? (
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
          'Last shared_ptr destroys T. Copies bump a control-block refcount. Cycles leak — open the cycle view.'}
        {kind === 'weak' &&
          (alive
            ? 'lock() would succeed. Dropping all shared_ptrs destroys T even if weaks remain.'
            : 'Object is gone. lock() returns empty. The control block lives until weaks die too.')}
        {kind === 'cycle' &&
          (leaked
            ? 'Roots are gone, use counts are still one. Leak. That is the contract Python Tutor will not name.'
            : cycleBroken
              ? 'Weak back-edge. Drop roots and both objects die. lock() fails afterwards.'
              : 'A holds B, B holds A. Drop the external pointers next and watch them refuse to die.')}
      </p>
    </div>
  )
}
