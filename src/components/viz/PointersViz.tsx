import { useState } from 'react'

export function PointersViz() {
  const [a, setA] = useState(10)
  const [b, setB] = useState(20)
  const [pointAt, setPointAt] = useState<'a' | 'b'>('a')
  const pVal = pointAt === 'a' ? a : b

  function writeThroughP(n: number) {
    if (pointAt === 'a') setA(n)
    else setB(n)
  }

  return (
    <div className="viz viz--col">
      <div className="ptr-board">
        <VarBox name="a" value={a} bound={pointAt === 'a'} kind="object" />
        <VarBox name="b" value={b} bound={pointAt === 'b'} kind="object" />
        <VarBox
          name="p"
          value={`&${pointAt}`}
          extra={`*p = ${pVal}`}
          kind="pointer"
          bound
        />
        <VarBox name="r" value="alias of a" extra={`r = ${a}`} kind="ref" bound />
      </div>
      <div className="stepper">
        <button className="chip" onClick={() => setPointAt('a')}>
          p = &a
        </button>
        <button className="chip" onClick={() => setPointAt('b')}>
          p = &b
        </button>
        <button className="chip" onClick={() => writeThroughP(pVal + 1)}>
          ++*p
        </button>
        <button className="chip" onClick={() => setA(a + 1)}>
          ++r  (same as ++a)
        </button>
        <button className="chip chip--ghost" onClick={() => { setA(10); setB(20); setPointAt('a') }}>
          reset
        </button>
      </div>
      <p className="layout-hint">
        <strong>p</strong> is a pointer: you can reseat it from a to b. <strong>r</strong> is
        a reference bound to a for life — <code>++r</code> increments a, it never becomes b.
        There is no <code>r = b</code> that reseats a reference.
      </p>
    </div>
  )
}

function VarBox({
  name,
  value,
  extra,
  kind,
  bound,
}: {
  name: string
  value: string | number
  extra?: string
  kind: 'object' | 'pointer' | 'ref'
  bound?: boolean
}) {
  return (
    <div className={`ptr-box ptr-box--${kind}${bound ? ' ptr-box--bound' : ''}`}>
      <span className="ptr-kind">{kind}</span>
      <span className="ptr-name">
        <code>{name}</code>
      </span>
      <span className="ptr-value">{value}</span>
      {extra && <span className="ptr-extra">{extra}</span>}
    </div>
  )
}
