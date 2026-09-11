import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Kind = 'vector' | 'list' | 'map' | 'end'

const MODES: { id: Kind; title: string }[] = [
  { id: 'vector', title: 'vector' },
  { id: 'list', title: 'list' },
  { id: 'map', title: 'map erase' },
  { id: 'end', title: 'end()' },
]

function Letters({
  chars,
  itAt,
  dangling,
  goneAt,
}: {
  chars: readonly string[]
  itAt?: number
  dangling?: boolean
  goneAt?: number
}) {
  return (
    <div className="fx-buf-row">
      {chars.map((ch, n) => {
        const gone = n === goneAt
        const isIt = itAt === n && !dangling && !gone
        const empty = gone || !ch || ch === '·'
        return (
          <span
            key={n}
            className={`fx-letter${
              dangling && n === itAt
                ? ' fx-letter--dead'
                : isIt
                  ? ' fx-letter--it'
                  : empty
                    ? ' fx-letter--empty'
                    : ' fx-letter--on'
            }`}
          >
            {gone ? '·' : ch || '·'}
          </span>
        )
      })}
    </div>
  )
}

export function InvalidationViz() {
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
  const vectorDangle = kind === 'vector' && grew
  const listLive = kind === 'list' && i >= 1 && i < 3
  const listErase = kind === 'list' && recap
  const mapLive = kind === 'map' && i === 1
  const mapDangle = kind === 'map' && i === 2
  const mapFix = kind === 'map' && recap
  const atEnd = kind === 'end' && i === 2
  const derefEnd = kind === 'end' && recap
  const itValid =
    (kind === 'vector' && i < 2) || (kind === 'list' && i < 3) || (kind === 'end' && i === 1) || mapLive || mapFix
  const dangling = vectorDangle || listErase || derefEnd || mapDangle

  const vOld = i === 0 ? ['a', 'b', 'c', '·'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd']
  const vNew = vectorDangle ? ['a', 'b', 'c', 'd', 'e', '·', '·', '·'] : ['·', '·', '·', '·', '·', '·', '·', '·']
  const listNodes = listErase
    ? ['a', '·', 'c', 'd', 'e']
    : i === 0
      ? ['a', 'b', 'c']
      : i === 1
        ? ['a', 'b', 'c', 'd']
        : ['a', 'b', 'c', 'd', 'e']
  const mapNodes = mapDangle || mapFix ? ['a', '·', 'c'] : ['a', 'b', 'c']
  const endCells = ['a', 'b', 'c', '·']

  const code =
    kind === 'vector'
      ? i < 2
        ? `auto it = v.begin() + 1;  // → b
v.push_back('d');  // fits, it still → b`
        : `v.push_back('e');  // realloc
// it is dangling`
      : kind === 'list'
        ? recap
          ? `L.erase(it);  // only that iterator dies
// iterators to a and c stay`
          : `auto it = std::next(L.begin());  // → b
L.push_back('d');  // it still → b`
        : kind === 'map'
          ? recap
            ? `it = m.erase(it);  // C++11: next
// a and c stay`
            : mapDangle
              ? `m.erase(it);
++it;  // UB — it is dangling`
              : `auto it = m.find('b');
// insert would not invalidate it`
          : i < 2
            ? `auto first = v.begin();
auto last = v.end();  // one-past-last
// [first, last)  never *last`
            : recap
              ? `*v.end();  // UB
// end() is not the last element`
              : `auto it = v.end();
// it == last, not dereferenceable`

  const caption =
    i === 0
      ? kind === 'vector'
        ? 'Play push_back. it names b in a contiguous buffer. Growth that reallocates kills every iterator into that storage.'
        : kind === 'list'
          ? 'Play list then erase. Node-based containers: insert does not move b. Only erase of that node kills it.'
          : kind === 'map'
            ? 'Play m.erase. map/set: insert does not invalidate. erase invalidates only erased iterators. C++11 erase returns the next iterator — use it.'
            : 'Play *end(). A range is half-open [begin, end). end() is one-past-last. Never dereference it.'
      : kind === 'vector' && i === 1
        ? 'push_back used spare capacity. No realloc. it, pointers, and references to b stay valid. The green ring is the weld.'
        : kind === 'vector' && i === 2
          ? 'Growth allocated a new buffer and released the old one. The weld dies. Every iterator into the old storage is dangling.'
          : kind === 'vector'
            ? 'Old storage is gone. Every iterator into it is dangling. erase is a different rule — list and map show that.'
            : kind === 'list' && i === 1
              ? 'push_back allocates a new node. it still names b. Only an erased element’s iterators die.'
              : kind === 'list' && i === 2
                ? 'Another insert at the end. Still no invalidation of it. There is no realloc of a contiguous buffer.'
                : kind === 'list'
                  ? 'erase(it) destroys node b. That one iterator is invalid. Iterators to a and c remain valid. C++11 erase returns the next iterator — use it.'
                  : kind === 'map' && i === 1
                    ? 'it names node b. Insert elsewhere would not touch it. Node containers do not realloc a buffer.'
                    : kind === 'map' && i === 2
                      ? 'erase(it) destroys b. ++it after that is undefined. The weld is dead. a and c are still live nodes.'
                      : kind === 'map'
                        ? 'it = m.erase(it). it now names c. That is the erase-while-iterating loop. Do not ++ the old iterator.'
                        : i === 1
                          ? 'it = begin(). *it is a. The last live element is the one before end(), not end() itself.'
                          : i === 2
                            ? 'it = end(). It names one-past-last. Comparing it to end() is the loop test. Dereferencing it is not.'
                            : '*end() is undefined behavior. reverse_iterator’s base() is also one off from *rit — same class of off-by-one.'

  const tone = dangling ? 'trap' : vectorFit || listLive || mapLive || mapFix || itValid ? 'ok' : 'idle'
  const playLabel =
    kind === 'vector'
      ? 'Play push_back'
      : kind === 'list'
        ? 'Play list then erase'
        : kind === 'map'
          ? 'Play m.erase(it)'
          : 'Play *end()'

  const itVal = mapFix
    ? '→ c'
    : dangling
      ? 'dangling'
      : kind === 'end' && atEnd
        ? 'end()'
        : kind === 'end' && i === 1
          ? '→ a'
          : itValid || i === 0
            ? '→ b'
            : '→ b'
  const itNote = mapFix
    ? 'returned next'
    : dangling
      ? kind === 'end'
        ? 'never dereference'
        : 'do not use'
      : kind === 'end' && i === 0
        ? 'half-open range'
        : kind === 'end' && atEnd
          ? 'one-past-last'
          : 'names b'

  const linkKind = dangling ? 'dead' : itValid ? 'weld' : kind === 'end' && atEnd ? 'on' : mapFix ? 'weld' : ''
  const itAtOld = kind === 'vector' ? 1 : undefined
  const itAtList = kind === 'list' ? 1 : undefined
  const itAtMap = kind === 'map' ? (mapFix ? 2 : 1) : undefined
  const itAtEnd = kind === 'end' ? (i === 1 ? 0 : i >= 2 ? 3 : undefined) : undefined

  const verdict =
    vectorFit
      ? 'fits · it still → b'
      : vectorDangle
        ? 'realloc · it dangling'
        : listLive && i === 1
          ? 'insert · it still → b'
          : listErase
            ? 'erase(it) · only b dies'
            : mapLive
              ? 'it → b · insert would keep it'
              : mapDangle
                ? 'erase(it) · ++it is UB'
                : mapFix
                  ? 'it = erase(it) · now → c'
                  : kind === 'end' && i === 1
                    ? '*begin() · first element'
                    : atEnd
                      ? 'end() · one-past-last'
                      : derefEnd
                        ? '*end() · UB'
                        : ''

  const showVerdict = Boolean(verdict)

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
          ? vectorDangle
            ? 'it dangling'
            : 'it → b'
          : kind === 'list'
            ? listErase
              ? 'it dangling'
              : 'it → b'
            : kind === 'map'
              ? mapFix
                ? 'it → c'
                : mapDangle
                  ? 'it dangling'
                  : 'it → b'
              : ' [begin, end)'
      }
      caption={caption}
      code={code}
      tone={tone}
    >
      {kind === 'vector' ? (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !vectorDangle ? ' fx-pane--focus' : ''}${vectorDangle ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">buffer · cap 4</span>
            <Letters chars={vOld} itAt={itAtOld} dangling={vectorDangle} />
            <span className="fx-note">{vectorDangle ? 'freed · it not here' : 'contiguous'}</span>
          </div>
          <div className={`fx-link${vectorDangle ? ' fx-link--dead' : itValid ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${vectorDangle ? ' fx-pane--focus' : ''}${vectorDangle ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">buffer · cap 8</span>
            <Letters chars={vNew} />
            <span className="fx-note">{vectorDangle ? 'new storage · it dangling' : 'not yet'}</span>
          </div>
        </div>
      ) : (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{kind === 'list' ? 'heap nodes' : kind === 'map' ? 'map nodes' : '[begin, end)'}</span>
            <Letters
              chars={kind === 'list' ? listNodes : kind === 'map' ? mapNodes : endCells}
              itAt={kind === 'list' ? itAtList : kind === 'map' ? itAtMap : itAtEnd}
              dangling={dangling}
              goneAt={listErase || mapDangle || mapFix ? 1 : undefined}
            />
            <span className="fx-note">
              {kind === 'list'
                ? listErase
                  ? 'b destroyed · a,c stay'
                  : 'insert does not move b'
                : kind === 'map'
                  ? mapFix
                    ? 'b gone · a,c stay'
                    : mapDangle
                      ? 'b destroyed · a,c stay'
                      : 'node map · no realloc'
                  : derefEnd
                    ? 'end is not the last element'
                    : 'last live is c, then end'}
            </span>
          </div>
          <div
            className={`fx-link${linkKind === 'weld' ? ' fx-link--weld' : ''}${linkKind === 'dead' ? ' fx-link--dead' : ''}${
              linkKind === 'on' ? ' fx-link--on' : ''
            }`}
          />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${dangling ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">iterator</span>
            <div
              className={`fx-slot${
                dangling ? ' fx-slot--trap' : itValid ? ' fx-slot--weld' : atEnd ? ' fx-slot--focus' : ' fx-slot--dim'
              }`}
            >
              <span className="fx-kicker">it</span>
              <span className="fx-value">{kind === 'end' ? (i === 1 ? '→ a' : atEnd || derefEnd ? 'end()' : '—') : itVal}</span>
              <span className="fx-note">{itNote}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${showVerdict ? ' fx-verdict--show' : ''} ${
          dangling ? 'fx-verdict--trap' : atEnd ? 'fx-verdict--warn' : showVerdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
