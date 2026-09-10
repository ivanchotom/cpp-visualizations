import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Kind = 'vector' | 'list' | 'umap'

const STEP_MS = 1300
const HOP_MS = 700

export function ContainersViz() {
  const [kind, setKind] = useState<Kind>('vector')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 40, y: 40 })
  const [to, setTo] = useState<Point>({ x: 200, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    setFrom({ x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 })
    setTo({ x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 })
  }, [kind, i])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stop = waitNextBeat(STEP_MS, () => {
      if (i >= stepCount - 1) {
        setPlaying(false)
        setHopT(1)
        return
      }
      setI(i + 1)
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stop()
    }
  }, [playing, i, stepCount])

  function select(next: Kind) {
    setPlaying(false)
    setKind(next)
    setI(0)
    setHopT(1)
  }

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const flyer = hopT < 1 && i >= 1 && i < 3 ? hop(from, to, hopT) : null
  const letter = i === 1 ? 'd' : 'e'

  const vCells = i === 0 ? ['a', 'b', 'c'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd', 'e']
  const vCap = i >= 2 ? 8 : 4
  const listNodes = i === 0 ? ['a', 'b', 'c'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd', 'e']
  const buckets = i >= 2 ? 8 : 4
  const umapItems = i === 0 ? ['a', 'b', 'c'] : i === 1 ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c', 'd', 'e']

  const code =
    kind === 'vector'
      ? i < 2
        ? `std::vector<char> v{'a','b','c'};\nv.reserve(4);\nv.push_back('d');  // fits`
        : `v.push_back('e');  // realloc, new buffer`
      : kind === 'list'
        ? `std::list<char> L{'a','b','c'};\nL.push_back('d');  // new node, others stay`
        : i < 2
          ? `std::unordered_map<char,int> m;\nm.emplace('d', 1);  // may still fit`
          : `m.emplace('e', 1);  // rehash possible`

  const caption =
    kind === 'vector'
      ? i === 0
        ? 'Contiguous buffer, spare capacity. Play push_back — the default container.'
        : i === 1
          ? 'd hops into the spare slot. Amortized O(1). No one moved.'
          : i === 2
            ? 'e does not fit. Every live element hops into a new, larger buffer. That is realloc.'
            : 'New capacity 8. Old storage is gone. This is why vector is fast — and why iterators die on grow.'
      : kind === 'list'
        ? i === 0
          ? 'Heap nodes, linked. Play push_back — nothing else relocates.'
          : i === 1
            ? 'A new node hops onto the tail. a, b, c never moved. Cache-unfriendly, but stable.'
            : i === 2
              ? 'Another node. Insert given an iterator is O(1). Walking to that iterator was O(n).'
              : 'Almost never faster than vector on real data. Measure before you reach for list.'
        : i === 0
          ? 'Hash buckets. Average O(1) lookup if the hash is decent.'
          : i === 1
            ? 'Insert hashes into a bucket. Average O(1) until load factor trips a rehash.'
            : i === 2
              ? 'Rehash: every key hops into a new bucket array. Iterators are invalid. References to elements stay (C++11+).'
              : 'Worst case O(n). Needs a hash. No order. That is the trade for average O(1).'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className={`chip${kind === 'vector' ? ' chip--active' : ''}`} onClick={() => select('vector')} disabled={playing}>
          vector
        </button>
        <button className={`chip${kind === 'list' ? ' chip--active' : ''}`} onClick={() => select('list')} disabled={playing}>
          list
        </button>
        <button className={`chip${kind === 'umap' ? ' chip--active' : ''}`} onClick={() => select('umap')} disabled={playing}>
          unordered_map
        </button>
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play push_back
        </button>
        <button className="chip chip--ghost" onClick={() => select(kind)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage ct-stage viz-stage--live${kind === 'vector' && i >= 2 ? ' ct-stage--grow' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount}
          {kind === 'vector' ? ` · size ${vCells.length} · cap ${vCap}` : ''}
          {kind === 'list' ? ` · nodes ${listNodes.length}` : ''}
          {kind === 'umap' ? ` · buckets ${buckets}` : ''}
        </p>
        <div className="lf-beats" aria-hidden>
          {Array.from({ length: stepCount }, (_, n) => (
            <span key={n} className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${i >= 2 && kind !== 'list' ? ' lf-beat--dtor' : ''}`} />
          ))}
        </div>

        {kind === 'vector' && (
          <div className="algo-row ct-row">
            {Array.from({ length: vCap }, (_, n) => {
              const c = vCells[n] ?? ''
              return (
                <div
                  key={n}
                  ref={n === vCells.length - 1 && i >= 1 ? dstRef : undefined}
                  className={`algo-cell${c ? '' : ' algo-cell--empty'}${c && n === vCells.length - 1 && i >= 1 ? ' algo-cell--hot' : ''}`}
                >
                  <span className="algo-val">{c || '∅'}</span>
                  <span className="algo-idx">{n}</span>
                </div>
              )
            })}
          </div>
        )}

        {kind === 'list' && (
          <div className="list-row">
            {listNodes.map((n, idx) => (
              <div key={`${n}-${idx}`} className="list-node-wrap">
                <div
                  ref={idx === listNodes.length - 1 && i >= 1 ? dstRef : undefined}
                  className={`list-node${idx === listNodes.length - 1 && i >= 1 ? ' list-node--hot' : ''}`}
                >
                  {n}
                </div>
                {idx < listNodes.length - 1 && <span className="pipe-arrow">→</span>}
              </div>
            ))}
          </div>
        )}

        {kind === 'umap' && (
          <div className="ct-buckets">
            {Array.from({ length: buckets }, (_, n) => {
              const item = umapItems[n]
              return (
                <div
                  key={n}
                  ref={item && n === umapItems.length - 1 && i >= 1 ? dstRef : undefined}
                  className={`ct-bucket${item ? ' ct-bucket--on' : ''}${item && n === umapItems.length - 1 && i >= 1 ? ' algo-cell--hot' : ''}`}
                >
                  <span className="algo-idx">#{n}</span>
                  <span className="algo-val">{item ?? '—'}</span>
                </div>
              )
            })}
          </div>
        )}

        <div ref={srcRef} className="ct-incoming">
          {i >= 1 && i < 3 ? letter : i === 0 ? 'push' : ''}
        </div>
        {flyer && <span className="ptr-pulse ptr-pulse--p" style={{ left: flyer.x, top: flyer.y }} />}
        {kind === 'vector' && i >= 2 && <span className="ct-flag">realloc</span>}
        {kind === 'umap' && i >= 2 && <span className="ct-flag ct-flag--hash">rehash</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
