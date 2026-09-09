import { useState } from 'react'

type Mode = 'value' | 'cref' | 'ref' | 'ptr' | 'fwd'

const modes: { id: Mode; sig: string; title: string; body: string }[] = [
  {
    id: 'value',
    sig: 'void f(T x)',
    title: 'By value',
    body: 'Caller copies (or moves) into x. f owns a distinct object. Best for cheap types or sink parameters you will store.',
  },
  {
    id: 'cref',
    sig: 'void f(const T& x)',
    title: 'Const reference',
    body: 'No copy. Read-only alias. Binds to temporaries. Default for anything bigger than a couple of words.',
  },
  {
    id: 'ref',
    sig: 'void f(T& x)',
    title: 'Mutable reference',
    body: 'In-out parameter. Cannot bind to a temporary. Makes mutation obvious at the call: f(obj), not f(&obj).',
  },
  {
    id: 'ptr',
    sig: 'void f(T* x)',
    title: 'Pointer',
    body: 'Nullable, reseatable borrow (or an array). Document whether it may be null. Prefer optional<T&> isn’t in C++14 — pointer is the idiom.',
  },
  {
    id: 'fwd',
    sig: 'template<class U> void f(U&& x)',
    title: 'Forwarding reference',
    body: 'U&& in a deduced template is not “rvalue only.” It binds to anything. Pair with std::forward<U>(x) to preserve the category.',
  },
]

const callPic: Record<Mode, { caller: string; arrow: string; callee: string }> = {
  value: { caller: 'obj', arrow: 'copy / move', callee: 'x  (distinct)' },
  cref: { caller: 'obj', arrow: 'alias (const)', callee: 'x  (same object)' },
  ref: { caller: 'obj', arrow: 'alias', callee: 'x  (same object)' },
  ptr: { caller: '&obj or nullptr', arrow: 'address', callee: 'x  (maybe null)' },
  fwd: { caller: 'lvalue or rvalue', arrow: 'std::forward', callee: 'x  (same category)' },
}

export function PassByViz() {
  const [id, setId] = useState<Mode>('value')
  const m = modes.find((x) => x.id === id) ?? modes[0]
  const pic = callPic[id]

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {modes.map((x) => (
            <button
              key={x.id}
              className={`chip${id === x.id ? ' chip--active' : ''}`}
              onClick={() => setId(x.id)}
            >
              {x.title}
            </button>
          ))}
        </div>
        <div className="pass-row">
          <div className="ptr-box ptr-box--object">
            <span className="ptr-kind">caller</span>
            <span className="ptr-value">{pic.caller}</span>
          </div>
          <span className="pipe-arrow">{pic.arrow}</span>
          <div className="ptr-box ptr-box--ref">
            <span className="ptr-kind">callee</span>
            <span className="ptr-name">
              <code>{m.sig}</code>
            </span>
            <span className="ptr-value">{pic.callee}</span>
          </div>
        </div>
      </div>
      <aside className="viz-detail">
        <h3>{m.title}</h3>
        <p>{m.body}</p>
      </aside>
    </div>
  )
}
