import { useState } from 'react'

interface Frame {
  cells: (number | 'junk')[]
  write: number | null
  read: number | null
  newEnd: number | null
  erased: boolean
  hint: string
}

// std::remove_if on {4,-1,7,0,2} keeping x > 0, then erase
const frames: Frame[] = [
  {
    cells: [4, -1, 7, 0, 2],
    write: 0,
    read: 0,
    newEnd: null,
    erased: false,
    hint: 'remove_if walks with a read pointer and a write pointer. Predicate: keep if x > 0.',
  },
  {
    cells: [4, -1, 7, 0, 2],
    write: 1,
    read: 1,
    newEnd: null,
    erased: false,
    hint: '4 is kept. Write advances. The value stays put.',
  },
  {
    cells: [4, -1, 7, 0, 2],
    write: 1,
    read: 2,
    newEnd: null,
    erased: false,
    hint: '−1 fails the predicate. Write stays. Read moves on. Nothing is erased yet.',
  },
  {
    cells: [4, 7, 7, 0, 2],
    write: 2,
    read: 3,
    newEnd: null,
    erased: false,
    hint: '7 is assigned into the write hole. The old 7 is still later in the buffer — that is fine.',
  },
  {
    cells: [4, 7, 7, 0, 2],
    write: 2,
    read: 4,
    newEnd: null,
    erased: false,
    hint: '0 is dropped. Write still points at the hole after the kept prefix.',
  },
  {
    cells: [4, 7, 2, 0, 2],
    write: 3,
    read: 5,
    newEnd: 3,
    erased: false,
    hint: '2 is kept. remove_if returns new_end (index 3). Tail is unspecified junk — size is still 5.',
  },
  {
    cells: [4, 7, 2],
    write: null,
    read: null,
    newEnd: 3,
    erased: true,
    hint: 'v.erase(new_end, v.end()) actually shortens the vector. That second step is the “erase” in erase-remove.',
  },
]

export function AlgorithmsViz() {
  const [i, setI] = useState(0)
  const f = frames[i]

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
          ← back
        </button>
        {frames.map((_, idx) => (
          <button
            key={idx}
            className={`chip${i === idx ? ' chip--active' : ''}`}
            onClick={() => setI(idx)}
          >
            {idx === frames.length - 1 ? 'erase' : `step ${idx}`}
          </button>
        ))}
        <button
          className="chip"
          onClick={() => setI((n) => Math.min(frames.length - 1, n + 1))}
          disabled={i === frames.length - 1}
        >
          next →
        </button>
      </div>
      <div className="algo-row">
        {f.cells.map((c, idx) => {
          const isJunk = f.newEnd !== null && !f.erased && idx >= f.newEnd
          const isWrite = f.write === idx
          const isRead = f.read === idx
          return (
            <div
              key={idx}
              className={`algo-cell${isJunk ? ' algo-cell--junk' : ''}${isWrite ? ' algo-cell--write' : ''}${isRead ? ' algo-cell--read' : ''}`}
            >
              <span className="algo-val">{c}</span>
              <span className="algo-idx">
                {isWrite && isRead ? 'r/w' : isWrite ? 'write' : isRead ? 'read' : idx}
              </span>
            </div>
          )
        })}
      </div>
      <p className="layout-hint">{f.hint}</p>
    </div>
  )
}
