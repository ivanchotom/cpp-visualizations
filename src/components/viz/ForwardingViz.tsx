import { useState } from 'react'

type Call = 'lval' | 'prval' | 'xval'

const calls: {
  id: Call
  expr: string
  t: string
  collapsed: string
  forward: string
  note: string
}[] = [
  {
    id: 'lval',
    expr: 'wrap(x)   // x is int',
    t: 'int&',
    collapsed: 'int&',
    forward: 'static_cast<int&>(t)',
    note: 'T is deduced as int& (reference collapsing). t is an lvalue named int&. std::forward preserves that — it does not move.',
  },
  {
    id: 'prval',
    expr: 'wrap(42)',
    t: 'int',
    collapsed: 'int&&',
    forward: 'static_cast<int&&>(t)',
    note: 'T is int. T&& is int&&. The parameter t is still an lvalue (it has a name). std::forward<T>(t) casts it back to an rvalue.',
  },
  {
    id: 'xval',
    expr: 'wrap(std::move(x))',
    t: 'int',
    collapsed: 'int&&',
    forward: 'static_cast<int&&>(t)',
    note: 'An xvalue deduces like a prvalue here: T = int, parameter type int&&. Forward again so the callee can steal.',
  },
]

export function ForwardingViz() {
  const [id, setId] = useState<Call>('lval')
  const c = calls.find((x) => x.id === id) ?? calls[0]

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {calls.map((x) => (
            <button
              key={x.id}
              className={`chip${id === x.id ? ' chip--active' : ''}`}
              onClick={() => setId(x.id)}
            >
              <code>{x.expr.split('  ')[0]}</code>
            </button>
          ))}
        </div>
        <pre className="fwd-sig">{`template <typename T>
void wrap(T&& t) {
  sink(std::forward<T>(t));
}`}</pre>
        <dl className="detail-list">
          <div>
            <dt>Call</dt>
            <dd>
              <code>{c.expr}</code>
            </dd>
          </div>
          <div>
            <dt>T deduced</dt>
            <dd>
              <code>{c.t}</code>
            </dd>
          </div>
          <div>
            <dt>T&& collapses to</dt>
            <dd>
              <code>{c.collapsed}</code>
            </dd>
          </div>
          <div>
            <dt>std::forward&lt;T&gt;(t)</dt>
            <dd>
              <code>{c.forward}</code>
            </dd>
          </div>
        </dl>
      </div>
      <aside className="viz-detail">
        <h3>Reference collapsing</h3>
        <p>{c.note}</p>
        <p className="detail-note">
          U&amp; + &amp;&amp; → U&amp;. U&amp;&amp; + &amp;&amp; → U&amp;&amp;. A named T&amp;&amp; is still an lvalue —
          that is why forward exists.
        </p>
      </aside>
    </div>
  )
}
