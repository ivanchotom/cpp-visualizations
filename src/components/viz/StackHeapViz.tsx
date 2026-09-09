import { useState } from 'react'

interface Cell {
  place: 'stack' | 'heap'
  name: string
  value: string
  note?: string
  ghost?: boolean
}

interface Scene {
  title: string
  code: string
  stack: Cell[]
  heap: Cell[]
  hint: string
}

const scenes: Scene[] = [
  {
    title: 'Automatic local',
    code: `void f() {
  int x = 7;
}`,
    stack: [{ place: 'stack', name: 'x', value: '7' }],
    heap: [],
    hint: 'x lives in f’s stack frame. Returning from f destroys it — no delete, no leak.',
  },
  {
    title: 'Bare new',
    code: `void f() {
  int x = 7;
  int* p = new int{42};
}`,
    stack: [
      { place: 'stack', name: 'x', value: '7' },
      { place: 'stack', name: 'p', value: '→ heap' },
    ],
    heap: [{ place: 'heap', name: '*p', value: '42', note: 'until delete' }],
    hint: 'p is on the stack (the address). The int 42 is on the free store. Forget delete and it leaks.',
  },
  {
    title: 'Owner on the stack',
    code: `void f() {
  auto p = std::make_unique<int>(42);
}`,
    stack: [{ place: 'stack', name: 'p', value: 'unique_ptr' }],
    heap: [{ place: 'heap', name: '*p', value: '42', note: 'owned' }],
    hint: 'The unique_ptr is automatic. Its destructor delete’s the heap int when f returns — even if f throws.',
  },
  {
    title: 'After return (leak)',
    code: `void f() {
  int* p = new int{42};
} // p dies, *p does not`,
    stack: [],
    heap: [{ place: 'heap', name: 'orphaned', value: '42', ghost: true, note: 'leaked' }],
    hint: 'The stack frame is gone. The heap object has no name. That is a leak — still reachable from nowhere.',
  },
]

export function StackHeapViz() {
  const [i, setI] = useState(0)
  const s = scenes[i]

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {scenes.map((sc, idx) => (
          <button
            key={sc.title}
            className={`chip${i === idx ? ' chip--active' : ''}`}
            onClick={() => setI(idx)}
          >
            {idx + 1}. {sc.title}
          </button>
        ))}
      </div>
      <div className="mem-split">
        <pre className="code-block">
          <code>{s.code}</code>
        </pre>
        <div className="mem-cols">
          <MemColumn title="Stack (automatic)" cells={s.stack} empty="frame empty" />
          <MemColumn title="Heap (free store)" cells={s.heap} empty="no allocations" />
        </div>
      </div>
      <p className="layout-hint">{s.hint}</p>
    </div>
  )
}

function MemColumn({
  title,
  cells,
  empty,
}: {
  title: string
  cells: Cell[]
  empty: string
}) {
  return (
    <div className="mem-col">
      <h3>{title}</h3>
      {cells.length === 0 && <p className="mem-empty">{empty}</p>}
      {cells.map((c) => (
        <div
          key={c.name}
          className={`mem-cell mem-cell--${c.place}${c.ghost ? ' mem-cell--ghost' : ''}`}
        >
          <span className="mem-name">{c.name}</span>
          <span className="mem-val">{c.value}</span>
          {c.note && <span className="mem-note">{c.note}</span>}
        </div>
      ))}
    </div>
  )
}
