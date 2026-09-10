import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'eof' | 'setw' | 'tie' | 'file'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'eof', title: 'eof', sig: 'while (!in.eof())' },
  { id: 'setw', title: 'setw', sig: 'setw(4) << 42' },
  { id: 'tie', title: 'tie', sig: 'cin >> x' },
  { id: 'file', title: 'fstream', sig: 'ifstream in("x")' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function IostreamsViz() {
  const [id, setId] = useState<Mode>('eof')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const bounce = (id === 'eof' && i >= 3) || (id === 'setw' && i === 2)
  const trapped = (id === 'eof' && i >= 3) || (id === 'setw' && i >= 2 && i < 3)
  const won = (id === 'tie' && i >= 2) || (id === 'file' && i >= 3) || (id === 'setw' && i >= 3)

  const useRight =
    (id === 'eof' && i >= 3) ||
    (id === 'setw' && i >= 2) ||
    (id === 'tie' && i >= 2) ||
    (id === 'file' && i >= 2)

  useLayoutEffect(() => {
    const stage = stageRef.current
    const srcEl = srcRef.current
    const dstEl = useRight ? rightRef.current : midRef.current
    if (!stage || !srcEl || !dstEl) return
    const origin = stage.getBoundingClientRect()
    const a = srcEl.getBoundingClientRect()
    const b = dstEl.getBoundingClientRect()
    const src = { x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 }
    const dst = { x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 }
    if (bounce) {
      setFrom(dst)
      setTo(src)
    } else {
      setFrom(src)
      setTo(dst)
    }
  }, [id, i, bounce, useRight])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stopBeat = waitNextBeat(STEP_MS, () => {
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
      stopBeat()
    }
  }, [playing, i, stepCount])

  function select(next: Mode) {
    setPlaying(false)
    setId(next)
    setI(0)
    setHopT(1)
  }

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = hopT < 1 && i >= 1 ? hop(from, to, hopT) : null
  const flyerText =
    id === 'eof'
      ? i === 1
        ? '"a"'
        : i === 2
          ? '"b"'
          : 'fail'
      : id === 'setw'
        ? i === 1
          ? '  42'
          : i === 2
            ? 'used'
            : '7'
        : id === 'tie'
          ? i === 1
            ? 'flush'
            : 'x'
          : i === 1
            ? 'open'
            : '~in'

  const leftName =
    id === 'eof' ? 'ifstream in' : id === 'setw' ? 'cout' : id === 'tie' ? 'cin' : 'ifstream in'
  const leftVal =
    id === 'eof'
      ? i >= 3
        ? 'failbit'
        : '"a\\nb"'
      : id === 'setw'
        ? 'stream'
        : id === 'tie'
          ? 'waiting'
          : i >= 3
            ? 'closed'
            : '"data.txt"'
  const midName =
    id === 'eof' ? 'in >> x' : id === 'setw' ? 'setw(4)' : id === 'tie' ? 'cout (tied)' : 'getline'
  const midVal =
    id === 'eof' && i === 1
      ? 'x="a"'
      : id === 'eof' && i === 2
        ? 'x="b"'
        : id === 'setw' && i >= 1
          ? i >= 2
            ? 'spent'
            : 'next field only'
          : id === 'tie' && i >= 1
            ? 'flushed'
            : id === 'file' && i >= 1
              ? 'line'
              : '—'
  const midNote =
    id === 'eof'
      ? 'eof not set yet'
      : id === 'setw'
        ? 'does not stick'
        : id === 'tie'
          ? 'flush before cin'
          : 'RAII owns the handle'
  const rightName =
    id === 'eof' ? 'eofbit' : id === 'setw' ? 'next << 7' : id === 'tie' ? 'prompt shown' : '~ifstream'
  const rightVal =
    id === 'eof' && i >= 3
      ? 'after fail'
      : id === 'setw' && i >= 2
        ? '7  (no pad)'
        : id === 'tie' && i >= 2
          ? 'then extract'
          : id === 'file' && i >= 2
            ? 'close'
            : '—'
  const rightNote =
    id === 'eof' && i >= 3
      ? 'you already used garbage'
      : id === 'eof'
        ? 'set after a failed read'
        : id === 'setw' && i >= 3
          ? 'precision would stick'
          : id === 'setw'
            ? 'setw is the exception'
            : id === 'tie'
              ? 'cerr is unbuffered-ish'
              : 'dtor always runs'

  const code =
    id === 'eof'
      ? i < 3
        ? `while (!in.eof()) {  // WRONG
  in >> x;
  use(x);
}`
        : `while (std::getline(in, line)) {
  use(line);
}  // the read IS the loop test`
      : id === 'setw'
        ? i < 2
          ? `std::cout << std::setw(4) << 42
          << '|' << 7;`
          : `// "  42|7"  — setw only once
// setprecision sticks until changed`
        : id === 'tie'
          ? `std::cout << "n? ";
std::cin >> x;  // cout flushes first
// cout is tied to cin by default`
          : i < 2
            ? `std::ifstream in("data.txt");
if (!in) throw std::runtime_error("open");`
            : `}  // ~in closes the file
// even if use() threw`

  const caption =
    i === 0
      ? id === 'eof'
        ? 'Play while (!in.eof()). eofbit is set after a failed read, not before. The loop body runs once on garbage. Test the extraction itself.'
        : id === 'setw'
          ? 'Play setw. Manipulators look like they all persist. setw applies to the next field only. setprecision sticks until you change it.'
          : id === 'tie'
            ? 'Play cin. cout is tied to cin: the prompt flushes before you extract. cerr is the unbuffered-ish diagnostic stream.'
            : 'Play fstream. The file handle is RAII: the destructor closes it on every exit path, including exceptions.'
      : id === 'eof' && i === 1
        ? 'First >> succeeds. "a" hops in. eofbit is still false — there is more, or there might not be, you have not failed yet.'
        : id === 'eof' && i === 2
          ? 'Second >> succeeds. "b" hops in. Still no eof. The file is actually empty now, but eofbit waits for the next failed attempt.'
          : id === 'eof'
            ? 'Loop checks !eof(), still true, reads again, fails, and you still called use(x) on the stale value. while (in >> x) would have stopped.'
            : id === 'setw' && i === 1
              ? 'setw(4) pads 42 to width 4. That flag is consumed by this insertion.'
              : id === 'setw' && i === 2
                ? 'The next << 7 is unpadded. People expect the width to stick. It does not.'
                : id === 'setw'
                  ? 'setprecision, hex, boolalpha stick. setw is the odd one. Reset flags when you are done, or you format the next log line as hex.'
                  : id === 'tie' && i === 1
                    ? 'cin >> waits. Tied cout flushes so the prompt actually appears before the user types.'
                    : id === 'tie' && i === 2
                      ? 'Then the extract runs. unitbuf / cerr exist so diagnostics still show if cout is fully buffered.'
                      : id === 'tie'
                        ? 'sync_with_stdio(false) speeds mixed C++/C I/O but you must then not mix FILE* and streams carelessly.'
                        : i === 1
                          ? 'open. if (!in) is the check. Failures set failbit — they do not throw unless you enable exceptions on the stream.'
                          : i === 2
                            ? 'getline hops lines while it succeeds. The file is still open; the object owns the fd.'
                            : '~ifstream. Close is the destructor. Do not fclose a FILE* you did not fopen, and do not leak an fstream you new’d.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped || (id === 'eof' && i >= 3) ? 'io-stage--reject' : won ? 'io-stage--win' : ''

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {MODES.map((x) => (
          <button
            key={x.id}
            className={`chip${id === x.id ? ' chip--active' : ''}`}
            onClick={() => select(x.id)}
            disabled={playing}
          >
            {x.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play stream
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage io-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="io-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">stream</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">state</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">op</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${id === 'eof' && i >= 3 ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse io-flyer${trapped || bounce ? ' io-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {flyerText}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
