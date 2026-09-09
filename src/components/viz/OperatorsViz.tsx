import { useState } from 'react'

interface OpGroup {
  level: number
  assoc: 'L→R' | 'R→L' | 'n/a'
  name: string
  ops: { tok: string; note: string }[]
}

const groups: OpGroup[] = [
  {
    level: 1,
    assoc: 'L→R',
    name: 'Scope',
    ops: [{ tok: '::', note: 'Scope resolution. Never overloaded.' }],
  },
  {
    level: 2,
    assoc: 'L→R',
    name: 'Postfix',
    ops: [
      { tok: '()', note: 'Call.' },
      { tok: '[]', note: 'Subscript.' },
      { tok: '.', note: 'Member. Not overloadable.' },
      { tok: '->', note: 'Member via pointer.' },
      { tok: '++ --', note: 'Postfix increment / decrement.' },
    ],
  },
  {
    level: 3,
    assoc: 'R→L',
    name: 'Unary',
    ops: [
      { tok: '++ --', note: 'Prefix increment / decrement.' },
      { tok: '+ -', note: 'Unary plus / minus.' },
      { tok: '! ~', note: 'Not / bitwise not.' },
      { tok: '* &', note: 'Dereference / address-of.' },
      { tok: 'sizeof', note: 'Size in bytes. Not overloaded.' },
      { tok: 'new delete', note: 'Allocation. Can be overloaded.' },
    ],
  },
  {
    level: 5,
    assoc: 'L→R',
    name: 'Multiplicative',
    ops: [
      { tok: '* / %', note: 'Multiply, divide, remainder.' },
    ],
  },
  {
    level: 6,
    assoc: 'L→R',
    name: 'Additive',
    ops: [{ tok: '+ -', note: 'Add / subtract. Pointer + integer is pointer arithmetic.' }],
  },
  {
    level: 7,
    assoc: 'L→R',
    name: 'Shift',
    ops: [{ tok: '<< >>', note: 'Bit shift — and stream insertion/extraction when overloaded.' }],
  },
  {
    level: 9,
    assoc: 'L→R',
    name: 'Equality',
    ops: [{ tok: '== !=', note: 'Equality. Lower than < — a < b == c is (a < b) == c.' }],
  },
  {
    level: 10,
    assoc: 'L→R',
    name: 'Bit AND',
    ops: [{ tok: '&', note: 'Bitwise AND. Lower than == — parenthesize with comparisons.' }],
  },
  {
    level: 13,
    assoc: 'L→R',
    name: 'Logical AND',
    ops: [{ tok: '&&', note: 'Short-circuit. Do not overload.' }],
  },
  {
    level: 14,
    assoc: 'L→R',
    name: 'Logical OR',
    ops: [{ tok: '||', note: 'Short-circuit. Do not overload.' }],
  },
  {
    level: 15,
    assoc: 'R→L',
    name: 'Conditional',
    ops: [{ tok: '?:', note: 'Ternary. Not overloadable.' }],
  },
  {
    level: 16,
    assoc: 'R→L',
    name: 'Assignment',
    ops: [{ tok: '= += …', note: 'Right-associative: a = b = 1.' }],
  },
  {
    level: 17,
    assoc: 'L→R',
    name: 'Comma',
    ops: [{ tok: ',', note: 'Evaluates left, yields right. Almost always a bug outside for().' }],
  },
]

export function OperatorsViz() {
  const [sel, setSel] = useState(`${groups[0].name}:${groups[0].ops[0].tok}`)
  const [groupName, tok] = sel.split(':')
  const group = groups.find((g) => g.name === groupName) ?? groups[0]
  const op = group.ops.find((o) => o.tok === tok) ?? group.ops[0]

  return (
    <div className="viz">
      <div className="prec-table">
        {groups.map((g) => (
          <div key={g.name} className="prec-row">
            <span className="prec-meta">
              {g.level} · {g.assoc}
            </span>
            <span className="prec-name">{g.name}</span>
            <span className="prec-ops">
              {g.ops.map((o) => {
                const key = `${g.name}:${o.tok}`
                return (
                  <button
                    key={key}
                    className={`chip${sel === key ? ' chip--active' : ''}`}
                    onClick={() => setSel(key)}
                  >
                    <code>{o.tok}</code>
                  </button>
                )
              })}
            </span>
          </div>
        ))}
      </div>
      <aside className="viz-detail">
        <div className="detail-badge">{group.name}</div>
        <h3>
          <code>{op.tok}</code>
        </h3>
        <p>{op.note}</p>
        <p className="detail-note">
          Lower number binds tighter. When two operators share a level, use associativity.
          Parentheses always win — and they read better.
        </p>
      </aside>
    </div>
  )
}
