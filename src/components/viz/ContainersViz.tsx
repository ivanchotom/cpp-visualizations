import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Kind = 'vector' | 'list' | 'umap'

const MODES: { id: Kind; title: string }[] = [
  { id: 'vector', title: 'vector' },
  { id: 'list', title: 'list' },
  { id: 'umap', title: 'unordered_map' },
]

function Cells({
  slots,
  fill,
  hot,
  gone,
}: {
  slots: number
  fill: readonly string[]
  hot?: number
  gone?: boolean
}) {
  return (
    <div className="fx-buf-row">
      {Array.from({ length: slots }, (_, n) => {
        const ch = fill[n]
        const empty = !ch
        return (
          <span
            key={n}
            className={`fx-letter${gone ? ' fx-letter--empty' : empty ? ' fx-letter--empty' : n === hot ? ' fx-letter--move' : ' fx-letter--on'}`}
          >
            {ch || '·'}
          </span>
        )
      })}
    </div>
  )
}

export function ContainersViz() {
  const [kind, setKind] = useState<Kind>('vector')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setKind(next as Kind)
  }

  const stepped = i >= 1
  const grew = i >= 2
  const recap = i >= 3
  const vectorFit = kind === 'vector' && i === 1
  const vectorRealloc = kind === 'vector' && grew
  const listStable = kind === 'list' && stepped
  const umapFit = kind === 'umap' && i === 1
  const umapRehash = kind === 'umap' && grew

  const vOld = i === 0 ? ['a', 'b', 'c'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd']
  const vNew = vectorRealloc ? ['a', 'b', 'c', 'd', 'e'] : []
  const listNodes = i === 0 ? ['a', 'b', 'c'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd', 'e']
  const mapOld = i === 0 ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd']
  const mapNew = umapRehash ? ['a', 'b', 'c', 'd', 'e'] : []

  const code =
    kind === 'vector'
      ? grew
        ? `v.push_back('e');  // realloc, new buffer
// iterators / references into v die`
        : `std::vector<char> v{'a', 'b', 'c'};
v.reserve(4);
v.push_back('d');  // fits`
      : kind === 'list'
        ? `std::list<char> L{'a', 'b', 'c'};
L.push_back('d');  // new node, others stay
L.push_back('e');`
        : grew
          ? `m.emplace('e', 1);  // rehash possible
// iterators die; references to elements stay`
          : `std::unordered_map<char, int> m;
m.emplace('d', 1);  // may still fit`

  const caption =
    i === 0
      ? kind === 'vector'
        ? 'Play push_back. vector is the default container: contiguous buffer, spare capacity, occasional realloc.'
        : kind === 'list'
          ? 'Play list push_back. Heap nodes, linked. Insert given an iterator is O(1). Walking there was O(n).'
          : 'Play emplace. Hash buckets. Average O(1) lookup if the hash is decent. No order.'
      : kind === 'vector' && i === 1
        ? 'd fills the spare slot in place. Amortized O(1). Nothing else moved. Iterators stay valid.'
        : kind === 'vector' && i === 2
          ? 'e does not fit. The old four-slot buffer empties; a larger one lights with every live element. That is realloc — not a hop of one cell.'
          : kind === 'vector'
            ? 'New capacity 8. Old storage is gone. This is why vector is fast — and why iterators die on grow. reserve if you know the bound.'
            : kind === 'list' && i === 1
              ? 'A new node lights at the tail. a, b, c never moved. Cache-unfriendly, but references stay.'
              : kind === 'list' && i === 2
                ? 'Another node. Insert given an iterator is O(1). Getting that iterator by walking from begin is still O(n).'
                : kind === 'list'
                  ? 'Almost never faster than vector on real data. Measure before you reach for list because you “insert in the middle”.'
                  : i === 1
                    ? 'Insert hashes into a bucket. Average O(1) until load factor trips a rehash. Cells fill in place.'
                    : i === 2
                      ? 'Rehash: the old bucket row empties; a larger table lights. Iterators are invalid. References to elements stay (C++11+).'
                      : 'Worst case O(n). Needs a hash. No order. That is the trade for average O(1).'

  const tone = vectorRealloc || umapRehash ? 'warn' : vectorFit || listStable || umapFit ? 'ok' : 'idle'
  const playLabel = kind === 'umap' ? 'Play emplace' : kind === 'list' ? 'Play list push_back' : 'Play push_back'

  const verdict =
    vectorFit
      ? 'push_back · spare slot'
      : vectorRealloc
        ? 'realloc · iterators die'
        : kind === 'list' && i === 1
          ? 'new node · others stay'
          : kind === 'list' && grew
            ? 'stable refs · poor cache'
            : umapFit
              ? 'hash · bucket filled'
              : umapRehash
                ? 'rehash · iterators die'
                : ''

  const vCap = vectorRealloc ? 8 : 4
  const buckets = umapRehash ? 8 : 4

  return (
    <SceneShell
      modes={MODES}
      mode={kind}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setKind(kind)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={
        kind === 'vector'
          ? `size ${vectorRealloc ? 5 : vOld.length} · cap ${vCap}`
          : kind === 'list'
            ? `nodes ${listNodes.length}`
            : `buckets ${buckets}`
      }
      caption={caption}
      code={code}
      tone={tone}
    >
      {kind === 'vector' && (
        <div className="fx-obj-row">
          <div className={`fx-pane${stepped && !vectorRealloc ? ' fx-pane--focus' : ''}${vectorRealloc ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">buffer · cap 4</span>
            <Cells slots={4} fill={vOld} hot={vectorFit ? 3 : undefined} gone={vectorRealloc} />
            <span className="fx-note">{vectorRealloc ? 'freed' : 'contiguous'}</span>
          </div>
          <div className={`fx-pane${vectorRealloc ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">buffer · cap 8</span>
            <Cells slots={8} fill={vNew} hot={vectorRealloc && !recap ? 4 : undefined} />
            <span className="fx-note">{vectorRealloc ? 'new storage' : 'not yet'}</span>
          </div>
        </div>
      )}
      {kind === 'list' && (
        <div className={`fx-pane${listStable ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">heap nodes</span>
          <Cells slots={listNodes.length} fill={listNodes} hot={stepped ? listNodes.length - 1 : undefined} />
          <span className="fx-note">{stepped ? 'tail grew · a,b,c unmoved' : 'linked, not contiguous'}</span>
        </div>
      )}
      {kind === 'umap' && (
        <div className="fx-obj-row">
          <div className={`fx-pane${stepped && !umapRehash ? ' fx-pane--focus' : ''}${umapRehash ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">buckets · 4</span>
            <Cells slots={4} fill={mapOld} hot={umapFit ? 3 : undefined} gone={umapRehash} />
            <span className="fx-note">{umapRehash ? 'old table' : 'hash into a slot'}</span>
          </div>
          <div className={`fx-pane${umapRehash ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">buckets · 8</span>
            <Cells slots={8} fill={mapNew} hot={umapRehash && !recap ? 4 : undefined} />
            <span className="fx-note">{umapRehash ? 'rehashed' : 'waiting'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          vectorRealloc || umapRehash ? 'fx-verdict--warn' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
