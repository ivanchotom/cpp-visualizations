import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'vector' | 'list' | 'map' | 'end'

const MODES: { id: Mode; title: string }[] = [
  { id: 'vector', title: 'vector' },
  { id: 'list', title: 'list' },
  { id: 'map', title: 'map erase' },
  { id: 'end', title: 'end()' },
]

export function InvalidationViz() {
  const [id, setId] = useState<Mode>('vector')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const vectorDangle = id === 'vector' && decided
  const listErase = id === 'list' && recap
  const mapDangle = id === 'map' && decided && !recap
  const mapFix = id === 'map' && recap
  const derefEnd = id === 'end' && recap
  const trap = vectorDangle || listErase || mapDangle || derefEnd
  const ok = (id === 'list' && decided && !recap) || (id === 'map' && recap) || (id === 'vector' && stepped && !decided)

  const code =
    id === 'vector'
      ? recap
        ? `v.push_back('e');  // realloc
// it is dangling`
        : `auto it = v.begin() + 1;  // → b
v.push_back('d');  // fits, it still → b`
      : id === 'list'
        ? recap
          ? `L.erase(it);  // only that iterator dies
// iterators to a and c stay`
          : `auto it = std::next(L.begin());  // → b
L.push_back('d');  // it still → b`
        : id === 'map'
          ? recap
            ? `it = m.erase(it);  // C++11: next
// a and c stay`
            : `m.erase(it);
++it;  // UB — it is dangling`
          : recap
            ? `*v.end();  // UB
// end() is not the last element`
            : `auto first = v.begin();
auto last = v.end();  // one-past-last
// [first, last)  never *last`

  const caption =
    i === 0
      ? id === 'vector'
        ? 'Play push_back. it names b in a contiguous buffer. Growth that reallocates kills every iterator into that storage.'
        : id === 'list'
          ? 'Play list then erase. Node-based containers: insert does not move b. Only erase of that node kills it.'
          : id === 'map'
            ? 'Play m.erase(it). map/set: insert does not invalidate. erase invalidates only erased iterators. C++11 erase returns the next iterator — use it.'
            : 'Play *end(). A range is half-open [begin, end). end() is one-past-last. Never dereference it.'
      : id === 'vector' && i === 1
        ? 'push_back used spare capacity. No realloc. it still names b. Stations light in place.'
        : id === 'vector' && i === 2
          ? 'Growth allocated a new buffer and released the old one. Every iterator into the old storage is dangling.'
          : id === 'vector'
            ? 'Old storage is gone. Every iterator into it is dangling. erase is a different rule — list and map show that.'
            : id === 'list' && i === 1
              ? 'push_back allocates a new node. it still names b. Only an erased element’s iterators die.'
              : id === 'list' && i === 2
                ? 'Another insert at the end. Still no invalidation of it. There is no realloc of a contiguous buffer.'
                : id === 'list'
                  ? 'erase(it) destroys node b. That one iterator is invalid. Iterators to a and c remain valid. C++11 erase returns the next iterator — use it.'
                  : id === 'map' && i === 1
                    ? 'it names node b. Insert elsewhere would not touch it. Node containers do not realloc a buffer.'
                    : id === 'map' && i === 2
                      ? 'erase(it) destroys b. ++it after that is undefined. a and c are still live nodes.'
                      : id === 'map'
                        ? 'it = m.erase(it). it now names c. That is the erase-while-iterating loop. Do not ++ the old iterator.'
                        : i === 1
                          ? 'it = begin(). *it is a. The last live element is the one before end(), not end() itself.'
                          : i === 2
                            ? 'it = end(). It names one-past-last. Comparing it to end() is the loop test. Dereferencing it is not.'
                            : '*end() is undefined behavior. reverse_iterator’s base() is also one off from *rit — same class of off-by-one.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'vector'
      ? 'Play push_back'
      : id === 'list'
        ? 'Play list then erase'
        : id === 'map'
          ? 'Play m.erase(it)'
          : 'Play *end()'

  const verdict =
    id === 'vector' && recap
      ? 'realloc · it dangling'
      : vectorDangle
        ? 'new buffer · it ub'
        : id === 'vector' && stepped
          ? 'fits · it still → b'
          : listErase
            ? 'erase(it) · only b dies'
            : id === 'list' && decided
              ? 'insert · it still → b'
              : id === 'list' && stepped
                ? 'it → b'
                : mapFix
                  ? 'it = erase(it) · → c'
                  : mapDangle
                    ? '++it · UB'
                    : id === 'map' && stepped
                      ? 'it → b'
                      : derefEnd
                        ? '*end() · UB'
                        : id === 'end' && decided
                          ? 'end() · one-past-last'
                          : id === 'end' && stepped
                            ? '*begin() · first'
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
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${vectorDangle ? ' fx-rank--trap' : recap ? ' fx-rank--done' : ''}`}>
            <code>it</code>
            <span className="fx-note">→ b</span>
            <span className="fx-note">{vectorDangle ? 'ub' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${vectorDangle ? ' fx-rank--trap' : ''}`}>
            <code>v</code>
            <span className="fx-note">grow</span>
            <span className="fx-note">{vectorDangle ? 'new' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'list' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${listErase ? ' fx-rank--trap' : recap ? ' fx-rank--done' : ''}`}>
            <code>it</code>
            <span className="fx-note">→ b</span>
            <span className="fx-note">{listErase ? 'ub' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${listErase ? ' fx-rank--trap' : decided ? ' fx-rank--on' : ''}`}>
            <code>b</code>
            <span className="fx-note">del</span>
            <span className="fx-note">{listErase ? 'gone' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'map' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${mapDangle ? ' fx-rank--trap' : mapFix ? ' fx-rank--done' : ''}`}>
            <code>it</code>
            <span className="fx-note">node</span>
            <span className="fx-note">{mapFix ? 'c' : mapDangle ? 'ub' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${mapDangle ? ' fx-rank--trap' : mapFix ? ' fx-rank--done' : ''}`}>
            <code>er</code>
            <span className="fx-note">del</span>
            <span className="fx-note">{mapFix ? 'ok' : mapDangle ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'end' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>beg</code>
            <span className="fx-note">*beg</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${derefEnd ? ' fx-rank--trap' : ''}`}>
            <code>end</code>
            <span className="fx-note">*end</span>
            <span className="fx-note">{derefEnd ? 'ub' : decided ? 'past' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
