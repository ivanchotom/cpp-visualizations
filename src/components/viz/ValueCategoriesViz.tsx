import { useState } from 'react'

type Cat = 'lvalue' | 'xvalue' | 'prvalue'

interface Example {
  expr: string
  cat: Cat
  why: string
}

const examples: Example[] = [
  { expr: 'x', cat: 'lvalue', why: 'A named variable has identity. You can take &x.' },
  { expr: '++x', cat: 'lvalue', why: 'Prefix increment returns the object itself.' },
  { expr: 'x++', cat: 'prvalue', why: 'Postfix yields a temporary copy of the old value.' },
  { expr: '42', cat: 'prvalue', why: 'A literal has no identity; it is a pure value.' },
  { expr: 's.substr(1)', cat: 'prvalue', why: 'A function returning by value produces a prvalue (C++14).' },
  { expr: 'std::move(x)', cat: 'xvalue', why: 'static_cast<T&&>(x) — an expiring lvalue you may steal from.' },
  { expr: 'std::string{"hi"}', cat: 'prvalue', why: 'A temporary of a specified type, no name.' },
  { expr: '*p', cat: 'lvalue', why: 'Dereference names the pointee (assuming p is valid).' },
  {
    expr: 'return std::move(local)',
    cat: 'xvalue',
    why: 'You forced an xvalue and may have blocked NRVO. Prefer return local; — the compiler already knows it is leaving.',
  },
]

const taxonomy: { cat: Cat; aka: string; steal: string; identity: string }[] = [
  { cat: 'lvalue', aka: 'glvalue', steal: 'no (copy)', identity: 'yes' },
  { cat: 'xvalue', aka: 'glvalue + rvalue', steal: 'yes (move)', identity: 'yes (expiring)' },
  { cat: 'prvalue', aka: 'rvalue', steal: 'yes (init / move)', identity: 'no' },
]

export function ValueCategoriesViz() {
  const [i, setI] = useState(0)
  const ex = examples[i]

  return (
    <div className="viz">
      <div>
        <div className="cat-diagram">
          {taxonomy.map((t) => (
            <div
              key={t.cat}
              className={`cat-cell cat-cell--${t.cat}${ex.cat === t.cat ? ' cat-cell--on' : ''}`}
            >
              <strong>{t.cat}</strong>
              <span>{t.aka}</span>
              <span>identity: {t.identity}</span>
              <span>move from: {t.steal}</span>
            </div>
          ))}
        </div>
        <div className="stepper" style={{ marginTop: 14 }}>
          {examples.map((e, idx) => (
            <button
              key={e.expr}
              className={`chip${i === idx ? ' chip--active' : ''}`}
              onClick={() => setI(idx)}
            >
              <code>{e.expr}</code>
            </button>
          ))}
        </div>
      </div>
      <aside className="viz-detail">
        <div className={`detail-badge cat-badge--${ex.cat}`}>{ex.cat}</div>
        <h3>
          <code>{ex.expr}</code>
        </h3>
        <p>{ex.why}</p>
        <p className="detail-note">
          glvalue = lvalue ∪ xvalue. rvalue = xvalue ∪ prvalue. A named T&& is still an
          lvalue — you need std::move to treat it as an xvalue.
        </p>
      </aside>
    </div>
  )
}
