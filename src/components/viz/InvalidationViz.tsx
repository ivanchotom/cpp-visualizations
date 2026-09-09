import { useState } from 'react'

type Kind = 'vector' | 'list'
type Act = 'start' | 'fit' | 'grow' | 'erase'

const vectorScenes: Record<
  Act,
  { cells: string[]; cap: number; it: number | 'dangling'; note: string }
> = {
  start: {
    cells: ['a', 'b', 'c'],
    cap: 4,
    it: 1,
    note: 'vector size 3, capacity 4. it points at b. One more push_back can fit without moving the buffer.',
  },
  fit: {
    cells: ['a', 'b', 'c', 'd'],
    cap: 4,
    it: 1,
    note: 'push_back(d) used the spare slot. No reallocation. it still points at b. Pointers/references stay valid too.',
  },
  grow: {
    cells: ['a', 'b', 'c', 'd', 'e'],
    cap: 8,
    it: 'dangling',
    note: 'push_back(e) needed a bigger buffer. Old storage is released. Every iterator, pointer, and reference into the old buffer is dangling.',
  },
  erase: {
    cells: ['a', 'c'],
    cap: 4,
    it: 'dangling',
    note: 'erase(begin()+1) shifts the tail. Iterators at/after the erase point are invalid. a is fine; it (which named b) is not.',
  },
}

const listScenes: Record<Act, { nodes: string[]; it: number | 'dangling'; note: string }> = {
  start: {
    nodes: ['a', 'b', 'c'],
    it: 1,
    note: 'list nodes live on the heap, linked. it points at b. Insert and erase elsewhere do not move b.',
  },
  fit: {
    nodes: ['a', 'b', 'c', 'd'],
    it: 1,
    note: 'push_back allocates a new node. it still names b. Only iterators to an erased element become invalid.',
  },
  grow: {
    nodes: ['a', 'b', 'c', 'd', 'e'],
    it: 1,
    note: 'Another insert at the end. Still no invalidation of it. list has no reallocation of a contiguous buffer.',
  },
  erase: {
    nodes: ['a', 'c'],
    it: 'dangling',
    note: 'erase(it) destroys node b. That one iterator is invalid. Iterators to a and c remain valid.',
  },
}

export function InvalidationViz() {
  const [kind, setKind] = useState<Kind>('vector')
  const [act, setAct] = useState<Act>('start')

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button
          className={`chip${kind === 'vector' ? ' chip--active' : ''}`}
          onClick={() => {
            setKind('vector')
            setAct('start')
          }}
        >
          vector
        </button>
        <button
          className={`chip${kind === 'list' ? ' chip--active' : ''}`}
          onClick={() => {
            setKind('list')
            setAct('start')
          }}
        >
          list
        </button>
        {(['start', 'fit', 'grow', 'erase'] as const).map((a) => (
          <button
            key={a}
            className={`chip${act === a ? ' chip--active' : ''}`}
            onClick={() => setAct(a)}
          >
            {a === 'start' ? 'start' : a === 'fit' ? 'push (fits)' : a === 'grow' ? 'push (grows)' : 'erase middle'}
          </button>
        ))}
      </div>
      {kind === 'vector' ? <VectorScene act={act} /> : <ListScene act={act} />}
    </div>
  )
}

function VectorScene({ act }: { act: Act }) {
  const s = vectorScenes[act]
  const slots = s.cells.concat(Array.from({ length: Math.max(0, s.cap - s.cells.length) }, () => ''))
  return (
    <>
      <div className="inv-meta">
        size {s.cells.length} · capacity {s.cap} · it{' '}
        {s.it === 'dangling' ? <span className="inv-dang">dangling</span> : '→ b'}
      </div>
      <div className="algo-row">
        {slots.map((c, i) => {
          const points = s.it === i
          return (
            <div
              key={i}
              className={`algo-cell${c ? '' : ' algo-cell--empty'}${points ? ' algo-cell--it' : ''}`}
            >
              <span className="algo-val">{c || '∅'}</span>
              <span className="algo-idx">{points ? 'it' : i}</span>
            </div>
          )
        })}
      </div>
      <p className="layout-hint">{s.note}</p>
    </>
  )
}

function ListScene({ act }: { act: Act }) {
  const s = listScenes[act]
  return (
    <>
      <div className="inv-meta">
        nodes {s.nodes.length} · it {s.it === 'dangling' ? <span className="inv-dang">dangling</span> : '→ b'}
      </div>
      <div className="list-row">
        {s.nodes.map((n, i) => (
          <div key={`${n}-${i}`} className="list-node-wrap">
            <div
              className={`list-node${s.it === i ? ' list-node--it' : ''}`}
            >
              {n}
              {s.it === i ? <span className="algo-idx">it</span> : null}
            </div>
            {i < s.nodes.length - 1 && <span className="pipe-arrow">→</span>}
          </div>
        ))}
      </div>
      <p className="layout-hint">{s.note}</p>
    </>
  )
}
