import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Kind = 'vector' | 'list'

const STEP_MS = 1400
const HOP_MS = 700

export function InvalidationViz() {
  const [kind, setKind] = useState<Kind>('vector')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 40, y: 40 })
  const [to, setTo] = useState<Point>({ x: 220, y: 80 })

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

  const cells =
    kind === 'vector'
      ? i === 0
        ? ['a', 'b', 'c']
        : i === 1
          ? ['a', 'b', 'c', 'd']
          : i === 2
            ? ['a', 'b', 'c', 'd', 'e']
            : ['a', 'c']
      : i === 0
        ? ['a', 'b', 'c']
        : i === 1
          ? ['a', 'b', 'c', 'd']
          : i === 2
            ? ['a', 'b', 'c', 'd', 'e']
            : ['a', 'c']

  const cap = kind === 'vector' ? (i === 2 ? 8 : 4) : 0
  const itDangling = kind === 'vector' ? i >= 2 : i >= 3
  const itIndex = itDangling ? -1 : cells.indexOf('b')
  const flyer = hopT < 1 && i >= 1 && i < 3 ? hop(from, to, hopT) : null

  const code =
    kind === 'vector'
      ? i === 0
        ? `auto it = v.begin() + 1;  // → b\n// size 3, capacity 4`
        : i === 1
          ? `v.push_back('d');  // fits, it still → b`
          : i === 2
            ? `v.push_back('e');  // realloc\n// it is dangling`
            : `v.erase(v.begin() + 1);\n// it still dangling`
      : i < 3
        ? `auto it = std::next(L.begin());  // → b\nL.push_back('d');  // it still → b`
        : `L.erase(it);  // only that iterator dies`

  const caption =
    kind === 'vector'
      ? i === 0
        ? 'it names b in a contiguous buffer. Play the mutations that keep or kill it.'
        : i === 1
          ? 'push_back used spare capacity. No realloc. it, pointers, and references to b stay valid.'
          : i === 2
            ? 'Growth allocated a new buffer and released the old one. Every iterator into the old storage is dangling.'
            : 'erase shifts the tail. Iterators at and after the erase point are invalid. a is fine; it is not.'
      : i === 0
        ? 'list nodes live on the heap. it points at b. Insert elsewhere does not move b.'
        : i === 1
          ? 'push_back allocates a new node. it still names b. Only an erased element’s iterators die.'
          : i === 2
            ? 'Another insert at the end. Still no invalidation of it. There is no realloc of a contiguous buffer.'
            : 'erase(it) destroys node b. That one iterator is invalid. Iterators to a and c remain valid.'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className={`chip${kind === 'vector' ? ' chip--active' : ''}`} onClick={() => select('vector')} disabled={playing}>
          vector
        </button>
        <button className={`chip${kind === 'list' ? ' chip--active' : ''}`} onClick={() => select('list')} disabled={playing}>
          list
        </button>
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play it through grow / erase
        </button>
        <button className="chip chip--ghost" onClick={() => select(kind)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage inv-stage viz-stage--live${itDangling ? ' inv-stage--dang' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · it {itDangling ? 'dangling' : '→ b'}
          {kind === 'vector' ? ` · size ${cells.length} · cap ${cap}` : ` · nodes ${cells.length}`}
        </p>
        <div className="lf-beats" aria-hidden>
          {Array.from({ length: stepCount }, (_, n) => (
            <span
              key={n}
              className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${n >= 2 ? ' lf-beat--dtor' : ''}`}
            />
          ))}
        </div>

        {kind === 'vector' ? (
          <div className="algo-row">
            {Array.from({ length: Math.max(cap, cells.length) }, (_, n) => {
              const c = cells[n] ?? ''
              const points = itIndex === n
              return (
                <div
                  key={n}
                  ref={n === cells.length - 1 && i >= 1 && i < 3 ? dstRef : undefined}
                  className={`algo-cell${c ? '' : ' algo-cell--empty'}${points ? ' algo-cell--it' : ''}${i === 3 && n === 1 ? ' algo-cell--gone' : ''}`}
                >
                  <span className="algo-val">{c || '∅'}</span>
                  <span className="algo-idx">{points ? 'it' : n}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="list-row">
            {cells.map((n, idx) => (
              <div key={`${n}-${idx}`} className="list-node-wrap">
                <div
                  ref={idx === cells.length - 1 && i >= 1 && i < 3 ? dstRef : undefined}
                  className={`list-node${itIndex === idx ? ' list-node--it' : ''}`}
                >
                  {n}
                  {itIndex === idx ? <span className="algo-idx">it</span> : null}
                </div>
                {idx < cells.length - 1 && <span className="pipe-arrow">→</span>}
              </div>
            ))}
          </div>
        )}

        <div ref={srcRef} className="ct-incoming">
          {i === 1 ? 'd' : i === 2 ? 'e' : i === 3 ? 'erase' : 'it'}
        </div>
        {flyer && (
          <span className={`ptr-pulse${i === 2 && kind === 'vector' ? ' ptr-pulse--throw' : ' ptr-pulse--p'}`} style={{ left: flyer.x, top: flyer.y }} />
        )}
        {itDangling && <span className="inv-flag">it dangling</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
