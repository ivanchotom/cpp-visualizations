import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'vector' | 'deque' | 'list' | 'umap'

const MODES: { id: Mode; title: string }[] = [
  { id: 'vector', title: 'vector' },
  { id: 'deque', title: 'deque' },
  { id: 'list', title: 'list' },
  { id: 'umap', title: 'unordered_map' },
]

export function ContainersViz() {
  const [id, setId] = useState<Mode>('vector')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const vectorRealloc = id === 'vector' && decided
  const umapRehash = id === 'umap' && decided
  const trap = vectorRealloc || umapRehash
  const ok =
    (id === 'deque' && recap) || (id === 'list' && recap) || (id === 'vector' && stepped && !decided) || (id === 'umap' && recap)

  const code =
    id === 'vector'
      ? recap
        ? `v.push_back('e');  // realloc, new buffer
// iterators / references into v die`
        : `std::vector<char> v{'a', 'b', 'c'};
v.reserve(4);
v.push_back('d');  // fits`
      : id === 'deque'
        ? recap
          ? `// not one contiguous buffer
// random access still O(1)`
          : `std::deque<char> d{'a', 'b', 'c'};
d.push_back('d');
d.push_front('z');`
        : id === 'list'
          ? recap
            ? `L.push_back('e');
// insert given an iterator is O(1)`
            : `std::list<char> L{'a', 'b', 'c'};
L.push_back('d');  // new node, others stay`
          : recap
            ? `m.emplace('e', 1);  // rehash possible
// iterators die; references to elements stay`
            : `std::unordered_map<char, int> m;
m.emplace('d', 1);  // may still fit`

  const caption =
    i === 0
      ? id === 'vector'
        ? 'Play push_back. vector is the default container: contiguous buffer, spare capacity, occasional realloc.'
        : id === 'deque'
          ? 'Play push_front. deque is a block map: fast push/pop at both ends. Not one contiguous array like vector.'
          : id === 'list'
            ? 'Play list push_back. Heap nodes, linked. Insert given an iterator is O(1). Walking there was O(n).'
            : 'Play emplace. Hash buckets. Average O(1) lookup if the hash is decent. No order.'
      : id === 'vector' && i === 1
        ? 'd fills the spare slot in place. Amortized O(1). Nothing else moved. Iterators stay valid. Stations light in place.'
        : id === 'vector' && i === 2
          ? 'e does not fit. The old buffer is released; a larger one holds every live element. That is realloc — not a hop of one cell.'
          : id === 'vector'
            ? 'Old storage is gone. This is why vector is fast — and why iterators die on grow. reserve if you know the bound.'
            : id === 'deque' && i === 1
              ? 'd fills a spare slot in the back block. a, b, c never moved. Push/pop back is cheap, like vector’s end.'
              : id === 'deque' && i === 2
                ? 'z lights in the front block. That is the deque trick: a new cell at the other end, no slide of the whole buffer.'
                : id === 'deque'
                  ? 'Two blocks, not one array. Random access is still O(1) through the map. Prefer vector unless you need push_front.'
                  : id === 'list' && i === 1
                    ? 'A new node lights at the tail. a, b, c never moved. Cache-unfriendly, but references stay.'
                    : id === 'list' && i === 2
                      ? 'Another node. Insert given an iterator is O(1). Getting that iterator by walking from begin is still O(n).'
                      : id === 'list'
                        ? 'Almost never faster than vector on real data. Measure before you reach for list because you “insert in the middle”.'
                        : i === 1
                          ? 'Insert hashes into a bucket. Average O(1) until load factor trips a rehash.'
                          : i === 2
                            ? 'Rehash: iterators are invalid. References to elements stay (C++11+).'
                            : 'Worst case O(n). Needs a hash. No order. That is the trade for average O(1).'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'umap' ? 'Play emplace' : id === 'list' ? 'Play list push_back' : id === 'deque' ? 'Play push_front' : 'Play push_back'

  const verdict =
    id === 'vector' && recap
      ? 'realloc · iterators die'
      : vectorRealloc
        ? 'new buffer · it ub'
        : id === 'vector' && stepped
          ? 'push_back · spare slot'
          : id === 'deque' && recap
            ? 'block map · not contiguous'
            : id === 'deque' && decided
              ? 'push_front · front block'
              : id === 'deque' && stepped
                ? 'push_back · back block'
                : id === 'list' && recap
                  ? 'stable refs · poor cache'
                  : id === 'list' && decided
                    ? 'tail grew · others stay'
                    : id === 'list' && stepped
                      ? 'new node'
                      : id === 'umap' && recap
                        ? 'rehash · refs stay'
                        : umapRehash
                          ? 'rehash · iterators die'
                          : id === 'umap' && stepped
                            ? 'hash · bucket filled'
                            : ''

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setId(id)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {id === 'vector' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${vectorRealloc ? ' fx-rank--trap' : recap ? ' fx-rank--done' : ''}`}>
            <code>cp</code>
            <span className="fx-note">fit</span>
            <span className="fx-note">{vectorRealloc ? 'no' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${vectorRealloc ? ' fx-rank--trap' : ''}`}>
            <code>it</code>
            <span className="fx-note">all</span>
            <span className="fx-note">{vectorRealloc ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'deque' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>bk</code>
            <span className="fx-note">end</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>fr</code>
            <span className="fx-note">fr</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'list' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">nd</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>tl</code>
            <span className="fx-note">ins</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'umap' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${umapRehash ? ' fx-rank--trap' : ''}`}>
            <code>it</code>
            <span className="fx-note">all</span>
            <span className="fx-note">{umapRehash ? 'ub' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>rf</code>
            <span className="fx-note">el</span>
            <span className="fx-note">{umapRehash ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
