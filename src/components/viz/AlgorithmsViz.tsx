import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { centerOf, hop, waitNextBeat, type Point } from './motion.ts'

interface Frame {
  cells: number[]
  write: number | null
  read: number | null
  newEnd: number | null
  erased: boolean
  hint: string
  code: string
}

const FRAMES: Frame[] = [
  {
    cells: [4, -1, 7, 0, 2],
    write: 0,
    read: 0,
    newEnd: null,
    erased: false,
    hint: 'remove_if walks with a read pointer and a write pointer. Predicate: keep if x > 0.',
    code: `std::vector<int> v{4, -1, 7, 0, 2};
auto pred = [](int x) { return x <= 0; };`,
  },
  {
    cells: [4, -1, 7, 0, 2],
    write: 1,
    read: 1,
    newEnd: null,
    erased: false,
    hint: '4 is kept. Write advances. The value stays put — no copy needed.',
    code: `// 4 > 0 → keep, ++write`,
  },
  {
    cells: [4, -1, 7, 0, 2],
    write: 1,
    read: 2,
    newEnd: null,
    erased: false,
    hint: '−1 fails. Write stays on the hole. Read is on 7, about to hop into that hole.',
    code: `// -1 <= 0 → drop, write stays`,
  },
  {
    cells: [4, 7, 7, 0, 2],
    write: 2,
    read: 3,
    newEnd: null,
    erased: false,
    hint: '7 landed in the write hole. The old 7 is still later in the buffer — that is fine.',
    code: `*write = *read;  // 7 hops into the hole`,
  },
  {
    cells: [4, 7, 7, 0, 2],
    write: 2,
    read: 4,
    newEnd: null,
    erased: false,
    hint: '0 is dropped. Write still points at the hole. Read is on 2, about to hop left.',
    code: `// 0 <= 0 → drop`,
  },
  {
    cells: [4, 7, 2, 0, 2],
    write: 3,
    read: null,
    newEnd: 3,
    erased: false,
    hint: '2 is kept. remove_if returns new_end. Tail is unspecified junk — size is still 5.',
    code: `auto new_end = std::remove_if(v.begin(), v.end(), pred);`,
  },
  {
    cells: [4, 7, 2],
    write: null,
    read: null,
    newEnd: 3,
    erased: true,
    hint: 'v.erase(new_end, v.end()) actually shortens. That second step is the “erase” in erase-remove.',
    code: `v.erase(new_end, v.end());`,
  },
]

const STEP_MS = 1200
const HOP_MS = 620

export function AlgorithmsViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 40, y: 80 })
  const [to, setTo] = useState<Point>({ x: 120, y: 80 })

  const stageRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])

  const f = FRAMES[Math.min(i, FRAMES.length - 1)]
  const copies = i === 2 || i === 4
  const flyerVal = copies && f.read !== null ? f.cells[f.read] : null

  useLayoutEffect(() => {
    const stage = stageRef.current
    const readEl = f.read !== null ? cellRefs.current[f.read] : null
    const writeEl = f.write !== null ? cellRefs.current[f.write] : null
    if (!stage || !readEl || !writeEl) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(readEl, origin))
    setTo(centerOf(writeEl, origin))
  }, [i, f.read, f.write])

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
      if (i >= FRAMES.length - 1) {
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
  }, [playing, i])

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = copies && hopT < 1 ? hop(from, to, hopT) : null

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play erase-remove
        </button>
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={playing || i === 0}>
          ◂ prev
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(FRAMES.length - 1, n + 1))} disabled={playing || i === FRAMES.length - 1}>
          next ▸
        </button>
        <button
          className="chip chip--ghost"
          onClick={() => {
            setPlaying(false)
            setI(0)
            setHopT(1)
          }}
        >
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage algo-stage viz-stage--live${f.erased ? ' algo-stage--erased' : ''}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{FRAMES.length}
          {f.erased ? ' · erased' : f.newEnd !== null ? ' · new_end' : ' · remove_if'}
        </p>
        <div className="lf-beats" aria-hidden>
          {FRAMES.map((_, n) => (
            <span
              key={n}
              className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${n === FRAMES.length - 1 ? ' lf-beat--dtor' : ''}`}
            />
          ))}
        </div>
        <div className="algo-row">
          {f.cells.map((c, idx) => {
            const isJunk = f.newEnd !== null && !f.erased && idx >= f.newEnd
            const isWrite = f.write === idx
            const isRead = f.read === idx
            const isHot = copies && hopT < 1 && isWrite
            const isNewEnd = f.newEnd === idx && !f.erased
            return (
              <div
                key={idx}
                ref={(el) => {
                  cellRefs.current[idx] = el
                }}
                className={`algo-cell${isJunk ? ' algo-cell--junk' : ''}${isWrite ? ' algo-cell--write' : ''}${isRead ? ' algo-cell--read' : ''}${isHot ? ' algo-cell--hot' : ''}${f.erased ? ' algo-cell--kept' : ''}`}
              >
                <span className="algo-val">{c}</span>
                <span className="algo-idx">
                  {isNewEnd ? 'new_end' : isWrite && isRead ? 'r/w' : isWrite ? 'write' : isRead ? 'read' : idx}
                </span>
              </div>
            )
          })}
        </div>
        {pos && flyerVal !== null && (
          <span className="algo-flyer" style={{ left: pos.x, top: pos.y }}>
            {flyerVal}
          </span>
        )}
        {f.erased && <span className="ct-flag">erase</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{f.code}</code>
      </pre>
      <p className="layout-hint">{f.hint}</p>
    </div>
  )
}
