import { useState } from 'react'

interface Container {
  id: string
  name: string
  shape: string
  lookup: string
  insertEnd: string
  insertMid: string
  iter: string
  notes: string
}

const containers: Container[] = [
  {
    id: 'vector',
    name: 'vector<T>',
    shape: '████████  contiguous',
    lookup: 'O(1) index',
    insertEnd: 'amortized O(1)',
    insertMid: 'O(n)',
    iter: 'random access',
    notes: 'The default. Realloc invalidates all iterators/pointers/references.',
  },
  {
    id: 'deque',
    name: 'deque<T>',
    shape: '[■■][■■][■■]  blocks',
    lookup: 'O(1) index',
    insertEnd: 'O(1) front & back',
    insertMid: 'O(n)',
    iter: 'random access',
    notes: 'Not one contiguous buffer. Pointers to elements stay valid on end insert (not iterators, in practice don’t rely).',
  },
  {
    id: 'list',
    name: 'list<T>',
    shape: '●→●→●→●  nodes',
    lookup: 'O(n)',
    insertEnd: 'O(1)',
    insertMid: 'O(1) given iterator',
    iter: 'bidirectional',
    notes: 'Stable iterators. Poor cache. Almost never faster than vector in real data.',
  },
  {
    id: 'map',
    name: 'map<K,V>',
    shape: '  ▲  ordered tree',
    lookup: 'O(log n)',
    insertEnd: 'O(log n)',
    insertMid: 'O(log n)',
    iter: 'bidirectional, sorted',
    notes: 'Unique keys, operator<. Node handles stay valid across insert.',
  },
  {
    id: 'umap',
    name: 'unordered_map<K,V>',
    shape: '[#][#][#]  buckets',
    lookup: 'avg O(1)',
    insertEnd: 'avg O(1)',
    insertMid: 'avg O(1)',
    iter: 'forward, unordered',
    notes: 'Needs a hash. Worst case O(n). Rehash invalidates iterators.',
  },
  {
    id: 'set',
    name: 'set<T> / unordered_set',
    shape: 'keys only',
    lookup: 'log n / avg O(1)',
    insertEnd: 'log n / avg O(1)',
    insertMid: 'same',
    iter: 'as map / umap',
    notes: 'set is just map without the mapped value. Same node vs hash tradeoff.',
  },
]

export function ContainersViz() {
  const [id, setId] = useState('vector')
  const c = containers.find((x) => x.id === id) ?? containers[0]

  return (
    <div className="viz">
      <div>
        <div className="stepper">
          {containers.map((x) => (
            <button
              key={x.id}
              className={`chip${id === x.id ? ' chip--active' : ''}`}
              onClick={() => setId(x.id)}
            >
              <code>{x.name.split('<')[0]}</code>
            </button>
          ))}
        </div>
        <div className="cont-shape">{c.shape}</div>
        <dl className="detail-list">
          <div>
            <dt>Lookup</dt>
            <dd>{c.lookup}</dd>
          </div>
          <div>
            <dt>Insert end</dt>
            <dd>{c.insertEnd}</dd>
          </div>
          <div>
            <dt>Insert middle</dt>
            <dd>{c.insertMid}</dd>
          </div>
          <div>
            <dt>Iterators</dt>
            <dd>{c.iter}</dd>
          </div>
        </dl>
      </div>
      <aside className="viz-detail">
        <h3>
          <code>{c.name}</code>
        </h3>
        <p>{c.notes}</p>
        <p className="detail-note">Start with vector. Measure before you reach for list.</p>
      </aside>
    </div>
  )
}
