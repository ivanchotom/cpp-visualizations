import { useState } from 'react'

type Arg = 'int' | 'double' | 'string'

const args: { id: Arg; expr: string }[] = [
  { id: 'int', expr: 'describe(42)' },
  { id: 'double', expr: 'describe(1.5)' },
  { id: 'string', expr: 'describe(s)' },
]

const candidates = [
  {
    id: 'integral',
    sig: 'enable_if_t<is_integral<T>>',
    ok: (a: Arg) => a === 'int',
    why: {
      int: 'is_integral<int> is true → ::type exists. This overload is the winner.',
      double: 'is_integral<double> is false → substitution fails. Quietly dropped.',
      string: 'is_integral<string> is false → dropped.',
    },
  },
  {
    id: 'floating',
    sig: 'enable_if_t<is_floating_point<T>>',
    ok: (a: Arg) => a === 'double',
    why: {
      int: 'is_floating_point<int> is false → dropped.',
      double: 'is_floating_point<double> is true. This overload is the winner.',
      string: 'is_floating_point<string> is false → dropped.',
    },
  },
]

export function SfinaeViz() {
  const [arg, setArg] = useState<Arg>('int')
  const winner = candidates.find((c) => c.ok(arg))

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {args.map((a) => (
            <button
              key={a.id}
              className={`chip${arg === a.id ? ' chip--active' : ''}`}
              onClick={() => setArg(a.id)}
            >
              <code>{a.expr}</code>
            </button>
          ))}
        </div>
        <div className="sfinae-list">
          {candidates.map((c) => {
            const live = c.ok(arg)
            return (
              <div
                key={c.id}
                className={`sfinae-card${live ? ' sfinae-card--ok' : ' sfinae-card--fail'}`}
              >
                <span className="sfinae-tag">{live ? 'survives' : 'SFINAE out'}</span>
                <code>{c.sig}</code>
                <p>{c.why[arg]}</p>
              </div>
            )
          })}
        </div>
      </div>
      <aside className="viz-detail">
        <h3>
          <code>{args.find((a) => a.id === arg)?.expr}</code>
        </h3>
        <p>
          {winner
            ? `One candidate remains. Overload resolution picks it. The body of the discarded overload is never instantiated.`
            : 'Both substitutions fail. There is no viable function — a hard error at the call site, not inside a body.'}
        </p>
        <p className="detail-note">
          SFINAE only applies to the immediate context of the signature. A failure in the function
          body is still a hard error.
        </p>
      </aside>
    </div>
  )
}
