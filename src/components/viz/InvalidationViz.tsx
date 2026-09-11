import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Kind = 'vector' | 'list' | 'end'

const MODES: { id: Kind; title: string }[] = [
  { id: 'vector', title: 'vector' },
  { id: 'list', title: 'list' },
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
  const atEnd = kind === 'end' && i === 2
  const derefEnd = kind === 'end' && recap
  const itValid = (kind === 'vector' && i < 2) || (kind === 'list' && i < 3) || (kind === 'end' && i === 1)
  const dangling = vectorDangle || listErase || derefEnd

  const vOld = i === 0 ? ['a', 'b', 'c', '·'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd']
  const vNew = vectorDangle ? ['a', 'b', 'c', 'd', 'e', '·', '·', '·'] : ['·', '·', '·', '·', '·', '·', '·', '·']
  const listNodes = listErase
    ? ['a', '·', 'c', 'd', 'e']
    : i === 0
      ? ['a', 'b', 'c']
      : i === 1
        ? ['a', 'b', 'c', 'd']
        : ['a', 'b', 'c', 'd', 'e']
  const endCells = ['a', 'b', 'c', '·']

  const code =
    kind === 'vector'
      ? i < 2
        ? `auto it = v.begin() + 1;  // → b
v.push_back('d');  // fits, it still → b`
        : grew && !recap
          ? `v.push_back('e');  // realloc
// it is dangling`
          : `v.erase(v.begin() + 1);
// iterators at/after the erase die too`
      : kind === 'list'
        ? recap
          ? `L.erase(it);  // only that iterator dies
// iterators to a and c stay`
          : `auto it = std::next(L.begin());  // → b
L.push_back('d');  // it still → b`
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
          : 'Play *end(). A range is half-open [begin, end). end() is one-past-last. Never dereference it.'
      : kind === 'vector' && i === 1
        ? 'push_back used spare capacity. No realloc. it, pointers, and references to b stay valid. The green ring is the weld.'
        : kind === 'vector' && i === 2
          ? 'Growth allocated a new buffer and released the old one. The weld dies. Every iterator into the old storage is dangling.'
          : kind === 'vector'
            ? 'erase shifts the tail. Iterators at and after the erase point are invalid even without realloc. a would still be fine; it is not.'
            : kind === 'list' && i === 1
              ? 'push_back allocates a new node. it still names b. Only an erased element’s iterators die.'
              : kind === 'list' && i === 2
                ? 'Another insert at the end. Still no invalidation of it. There is no realloc of a contiguous buffer.'
                : kind === 'list'
                  ? 'erase(it) destroys node b. That one iterator is invalid. Iterators to a and c remain valid. C++11 erase returns the next iterator — use it.'
                  : i === 1
                    ? 'it = begin(). *it is a. The last live element is the one before end(), not end() itself.'
                    : i === 2
                      ? 'it = end(). It names one-past-last. Comparing it to end() is the loop test. Dereferencing it is not.'
                      : '*end() is undefined behavior. reverse_iterator’s base() is also one off from *rit — same class of off-by-one.'

  const tone = dangling ? 'trap' : vectorFit || listLive || itValid ? 'ok' : 'idle'
  const playLabel =
    kind === 'vector' ? 'Play push_back' : kind === 'list' ? 'Play list then erase' : 'Play *end()'

  const itVal = dangling ? 'dangling' : kind === 'end' && atEnd ? 'end()' : itValid || i === 0 ? '→ b' : kind === 'end' && i === 0 ? '—' : '→ b'
  const itNote = dangling
    ? kind === 'end'
      ? 'never dereference'
      : 'do not use'
    : kind === 'end' && i === 0
      ? 'half-open range'
      : kind === 'end' && atEnd
        ? 'one-past-last'
        : 'names b'

  const linkKind = dangling ? 'dead' : itValid ? 'weld' : kind === 'end' && atEnd ? 'on' : ''
  const itAtOld = kind === 'vector' && i < 2 ? 1 : undefined
  const itAtList = kind === 'list' ? 1 : undefined
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
      sig={kind === 'vector' ? (vectorDangle ? 'it dangling' : 'it → b') : kind === 'list' ? (listErase ? 'it dangling' : 'it → b') : ' [begin, end)'}
      caption={caption}
      code={code}
      tone={tone}
    >
      {kind === 'vector' ? (
        <div className="fx-own">
          <div className={`fx-pane${stepped && !vectorDangle ? ' fx-pane--focus' : ''}${vectorDangle ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">buffer · cap 4</span>
            <Letters chars={vOld} itAt={itAtOld} dangling={false} />
            <span className="fx-note">{vectorDangle ? 'freed' : 'contiguous'}</span>
          </div>
          <div className={`fx-link${vectorDangle ? ' fx-link--dead' : itValid ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${vectorDangle ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">buffer · cap 8</span>
            <Letters chars={vNew} />
            <span className="fx-note">{vectorDangle ? 'new storage · it not here' : 'not yet'}</span>
          </div>
          <div className={`fx-link${vectorDangle ? ' fx-link--dead' : itValid ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${dangling ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">iterator</span>
            <div className={`fx-slot${dangling ? ' fx-slot--trap' : itValid ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">it</span>
              <span className="fx-value">{itVal}</span>
              <span className="fx-note">{itNote}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{kind === 'list' ? 'heap nodes' : '[begin, end)'}</span>
            <Letters
              chars={kind === 'list' ? listNodes : endCells}
              itAt={kind === 'list' ? itAtList : itAtEnd}
              dangling={dangling}
              goneAt={listErase ? 1 : undefined}
            />
            <span className="fx-note">
              {kind === 'list'
                ? listErase
                  ? 'b destroyed · a,c stay'
                  : 'insert does not move b'
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
            <div className={`fx-slot${dangling ? ' fx-slot--trap' : itValid ? ' fx-slot--weld' : atEnd ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
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
