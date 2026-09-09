import { useState } from 'react'

const steps = [
  {
    title: 'Recipe',
    stamp: null as string | null,
    body: 'A function template is not a function. It is a recipe the compiler copies for each set of arguments it actually sees.',
  },
  {
    title: 'Call twice(21)',
    stamp: 'int',
    body: 'Deduction: T = int. The compiler stamps out a real function int twice(int). That copy is what the linker sees.',
  },
  {
    title: 'Call twice(2.5)',
    stamp: 'double',
    body: 'A second instantiation: T = double. twice<int> and twice<double> are different functions. They do not share code.',
  },
  {
    title: 'Binary',
    stamp: 'both',
    body: 'Two copies now live in the program. Unused T’s are never generated — that is why templates belong in headers.',
  },
]

export function TemplatesViz() {
  const [i, setI] = useState(0)
  const step = steps[i]
  const hasInt = step.stamp === 'int' || step.stamp === 'both'
  const hasDouble = step.stamp === 'double' || step.stamp === 'both'

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {steps.map((s, idx) => (
            <button
              key={s.title}
              className={`chip${i === idx ? ' chip--active' : ''}`}
              onClick={() => setI(idx)}
            >
              {idx + 1}. {s.title}
            </button>
          ))}
        </div>
        <div className="tpl-board">
          <div className="tpl-card tpl-card--recipe">
            <span className="tpl-kicker">template</span>
            <pre>{`template <typename T>
T twice(T x) {
  return x + x;
}`}</pre>
          </div>
          <span className="pipe-arrow">stamp →</span>
          <div className="tpl-stamps">
            <div className={`tpl-card${hasInt ? ' tpl-card--on' : ''}`}>
              <span className="tpl-kicker">T = int</span>
              <pre>{hasInt ? `int twice(int x) {
  return x + x;
}` : 'not generated yet'}</pre>
            </div>
            <div className={`tpl-card${hasDouble ? ' tpl-card--on' : ''}`}>
              <span className="tpl-kicker">T = double</span>
              <pre>{hasDouble ? `double twice(double x) {
  return x + x;
}` : 'not generated yet'}</pre>
            </div>
          </div>
        </div>
      </div>
      <aside className="viz-detail">
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <p className="detail-note">
          Errors often appear at the call site, in the stamped-out body — not next to the recipe.
        </p>
      </aside>
    </div>
  )
}
