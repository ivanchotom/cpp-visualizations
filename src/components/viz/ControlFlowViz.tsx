import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'copy' | 'ref' | 'fall' | 'skip'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'copy', title: 'auto x', sig: 'for (auto x : v)' },
  { id: 'ref', title: 'auto& x', sig: 'for (auto& x : v)' },
  { id: 'fall', title: 'fallthrough', sig: 'case A: case B:' },
  { id: 'skip', title: 'continue', sig: 'if (skip) continue' },
]

const VEC = ['10', '20', '30']
const ITEMS = [
  { label: 'a', skip: true },
  { label: 'b', skip: false },
  { label: 'c', skip: false },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ControlFlowViz() {
  const [id, setId] = useState<Mode>('copy')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const idx = Math.max(0, i - 1)
  const copied = id === 'copy' && i >= 1
  const welded = id === 'ref' && i >= 1
  const wrote = id === 'ref' && i >= 3
  const fell = id === 'fall' && i >= 2
  const skipped = id === 'skip' && i >= 1

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    setFrom({ x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 })
    setTo({ x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 })
  }, [id, i])

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
    id === 'copy'
      ? VEC[idx]
      : id === 'ref'
        ? i >= 3
          ? '++'
          : VEC[0]
        : id === 'fall'
          ? i === 1
            ? 'A'
            : 'fall'
          : skipped && i === 1
            ? 'skip'
            : ITEMS[Math.min(idx, 2)].label

  const xVal =
    id === 'copy'
      ? copied
        ? VEC[idx]
        : '—'
      : id === 'ref'
        ? wrote
          ? '11'
          : welded
            ? '10'
            : '—'
        : id === 'fall'
          ? fell
            ? 'handleAB()'
            : i >= 1
              ? 'case A'
              : '—'
          : i === 1
            ? 'continue'
            : i >= 2
              ? `use(${ITEMS[idx].label})`
              : '—'

  const vec0 = wrote ? '11' : '10'

  const code =
    id === 'copy'
      ? i === 0
        ? `std::vector<int> v{10, 20, 30};
for (auto x : v) { }`
        : i < 3
          ? `for (auto x : v) {  // copy
  use(x);
}`
          : `// three copies. v is unchanged.`
      : id === 'ref'
        ? i < 3
          ? `for (auto& x : v) {
  ++x;
}`
          : `// v is {11, 20, 30}. The weld writes through.`
        : id === 'fall'
          ? i < 2
            ? `switch (kind) {
  case Kind::A:
  case Kind::B:
    handleAB();
    break;
}`
            : `case Kind::A:     // no break
case Kind::B:
  handleAB();     // A falls into B
  break;`
          : i === 0
            ? `for (const auto& item : items) {
  if (item.skip) continue;
  use(item);
}`
            : i === 1
              ? `if (item.skip) continue;  // a`
              : `use(item);  // b, then c`

  const caption =
    i === 0
      ? id === 'copy'
        ? 'Play range-for with auto x. Each element is copied into the loop variable. Cheap for int; a tax for string.'
        : id === 'ref'
          ? 'Play auto&. The name x is welded to the element. ++x writes through. const auto& if you only read.'
          : id === 'fall'
            ? 'Play fallthrough. switch cases fall unless you break (or return). A missing break is a defect unless you mark it.'
            : 'Play continue. It skips the rest of this iteration. The container is not modified — only this pass is.'
      : id === 'copy' && i === 1
        ? '10 hops into x. That is a copy. Mutating x would not change v[0].'
        : id === 'copy' && i === 2
          ? '20 hops into a fresh x. Range-for is sugar over begin/end. The original cells stay.'
          : id === 'copy'
            ? '30 copied. Three copies, vector unchanged. Use auto& or const auto& unless you want the copy.'
            : id === 'ref' && i === 1
              ? 'x welds to v[0]. No clone. The cyan copy is gone; this is the green alias.'
              : id === 'ref' && i === 2
                ? 'Still the same object. Range-for with auto& is the default when you mean “each element.”'
                : id === 'ref'
                  ? '++x writes 11 into the vector. That is the point — and why modifying while iterating can invalidate.'
                  : id === 'fall' && i === 1
                    ? 'kind is A. Enter case A. There is no break. Execution does not stop at the label.'
                    : id === 'fall' && i === 2
                      ? 'Fall into case B. handleAB() runs for A and for B. That is the deliberate sharing, or the bug.'
                      : id === 'fall'
                        ? 'break. default is not required. Comment fallthrough in review; C++14 has no [[fallthrough]] yet (C++17).'
                        : i === 1
                          ? 'a.skip is true. continue hops past use(). The next item still runs. Not a break out of the loop.'
                          : i === 2
                            ? 'b is used. Range-for still holds the iterator. continue only skipped a’s body.'
                            : 'c is used. Prefer this over a boolean flag. goto stays in the museum.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = id === 'copy' && i >= 3 ? 'cf-stage--copy' : wrote ? 'cf-stage--write' : fell ? 'cf-stage--fall' : ''

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
          Play flow
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage cf-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        {(id === 'copy' || id === 'ref') && (
          <div className="cf-cells">
            {VEC.map((v, n) => (
              <div
                key={v}
                ref={id === 'copy' ? (n === idx ? srcRef : undefined) : n === 0 ? srcRef : undefined}
                className={`ar-cell${id === 'copy' && i >= 1 && n <= idx ? ' cf-cell--on' : ''}${id === 'ref' && welded && n === 0 ? ' cf-cell--on' : ''}`}
              >
                {n === 0 ? vec0 : v}
              </div>
            ))}
          </div>
        )}
        {id === 'fall' && (
          <div className="cf-cases">
            <div ref={srcRef} className={`cf-case${i >= 1 ? ' cf-case--on' : ''}`}>
              <span className="lf-tag">case A</span>
              <span className="own-name">Kind::A</span>
              <span className="mem-note">{i >= 1 ? 'no break' : 'kind'}</span>
            </div>
            <div className={`cf-case${fell ? ' cf-case--on' : ''}`}>
              <span className="lf-tag">case B</span>
              <span className="own-name">Kind::B</span>
              <span className="mem-note">{fell ? 'shared body' : 'waits'}</span>
            </div>
            <div className="cf-case">
              <span className="lf-tag">default</span>
              <span className="own-name">other</span>
              <span className="mem-note">not taken</span>
            </div>
          </div>
        )}
        {id === 'skip' && (
          <div className="cf-cells">
            {ITEMS.map((item, n) => (
              <div
                key={item.label}
                ref={n === (i <= 1 ? 0 : idx) ? srcRef : undefined}
                className={`ar-cell${item.skip && skipped ? ' nd-cell--dead' : ''}${n === idx && i >= 1 ? ' cf-cell--on' : ''}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
        <div className="cf-row">
          <div
            ref={dstRef}
            className={`own-card${copied ? ' own-card--unique' : ''}${welded ? ' own-card--shared' : ''}${fell ? ' own-card--unique' : ''}${id === 'skip' && i >= 2 ? ' own-card--unique' : ''}${id === 'skip' && i === 1 ? ' own-ctrl--ghost' : ''}`}
          >
            <span className="lf-tag">{id === 'fall' ? 'body' : id === 'skip' ? 'loop' : 'x'}</span>
            <span className="own-name">{xVal}</span>
            <span className="mem-note">
              {id === 'copy' && copied
                ? 'copy of element'
                : id === 'ref' && wrote
                  ? 'write-through'
                  : id === 'ref' && welded
                    ? 'alias, not a clone'
                    : id === 'fall' && fell
                      ? 'A and B share this'
                      : id === 'skip' && i === 1
                        ? 'body skipped'
                        : 'waiting'}
            </span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse cf-flyer${id === 'copy' ? '' : id === 'ref' ? ' cf-flyer--weld' : id === 'skip' && i === 1 ? ' cf-flyer--trap' : ''}`}
            style={{ left: pos.x, top: pos.y }}
          >
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
