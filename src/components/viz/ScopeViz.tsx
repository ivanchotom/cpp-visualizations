import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'block' | 'stat' | 'dangle' | 'using'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'block', title: 'block', sig: '{ int n = 1; }' },
  { id: 'stat', title: 'static local', sig: 'static int n = 0' },
  { id: 'dangle', title: 'dangling', sig: 'int& r = local' },
  { id: 'using', title: 'using ns', sig: 'using namespace std' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ScopeViz() {
  const [id, setId] = useState<Mode>('block')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const alive = (id === 'block' && i >= 1 && i < 3) || (id === 'stat' && i >= 1) || (id === 'dangle' && i >= 1 && i < 2)
  const gone = (id === 'block' && i >= 3) || (id === 'dangle' && i >= 2)
  const nVal = id === 'stat' ? (i >= 3 ? 2 : i >= 2 ? 1 : i >= 1 ? 0 : '—') : id === 'block' && alive ? '1' : id === 'dangle' && i === 1 ? '7' : '—'
  const polluted = id === 'using' && i >= 2

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    const bounce = id === 'block' && i >= 3
    const src = { x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 }
    const dst = { x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 }
    if (bounce) {
      setFrom(dst)
      setTo(src)
    } else {
      setFrom(src)
      setTo(dst)
    }
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
    id === 'block'
      ? i >= 3
        ? '~n'
        : 'n'
      : id === 'stat'
        ? i === 1
          ? 'init'
          : '++n'
        : id === 'dangle'
          ? i === 1
            ? 'bind'
            : i === 2
              ? '~local'
              : 'UB'
          : i === 1
            ? 'using'
            : 'cout'

  const code =
    id === 'block'
      ? i < 3
        ? `{
  int n = 1;   // automatic
}  // n destroyed here`
        : `// n is gone. The name is not in scope.
// A pointer to n would dangle.`
      : id === 'stat'
        ? i < 2
          ? `int counter() {
  static int n = 0;
  return ++n;
}`
          : `counter();  // 1
counter();  // 2  same n, no re-init`
        : id === 'dangle'
          ? i < 2
            ? `int& leak() {
  int local = 7;
  return local;  // binds, then dies
}`
            : `int& r = leak();  // r dangles
// using r is UB`
          : i < 2
            ? `// header.hpp — don't
using namespace std;`
            : `// every TU that includes this
// sees cout, vector, … in global`

  const caption =
    i === 0
      ? id === 'block'
        ? 'Play the block. Scope is who can see the name. Lifetime is how long the object exists. For a local they end together.'
        : id === 'stat'
          ? 'Play static local. Initialized the first time control passes the declaration. Destroyed at program end — one n for the program.'
          : id === 'dangle'
            ? 'Play a returned reference. The name r is in scope in the caller. The object it bound died with the callee’s block.'
            : 'Play using namespace. A using-directive dumps names into the enclosing scope. In a header that is every TU.'
      : id === 'block' && i === 1
        ? 'n is constructed in the block. The name n is only visible here. Outer code cannot say n.'
        : id === 'block' && i === 2
          ? 'Still in the block. Reverse destruction: last constructed, first destroyed, when the closing brace runs.'
          : id === 'block'
            ? 'Brace closed. n is gone. Scope and lifetime lined up. Heap and static are the cases where they don’t.'
            : id === 'stat' && i === 1
              ? 'First call. n is initialized to 0, once. Not each call. Thread-safety of that init is later (C++11 magic statics).'
              : id === 'stat' && i === 2
                ? '++n → 1. The initializer does not run again. That is why a Meyers singleton works.'
                : id === 'stat'
                  ? 'Second call. Same object, now 2. Destroyed at program end, not when counter returns.'
                  : id === 'dangle' && i === 1
                    ? 'r binds to local. The reference is just another name. It does not extend local’s lifetime (except temporary binding, not this).'
                    : id === 'dangle' && i === 2
                      ? 'local’s block ended. The object is gone. r still exists in the caller — a name with no object.'
                      : id === 'dangle'
                        ? 'Using r is UB. Scope (r is visible) and lifetime (local is dead) split. That is the whole lesson.'
                        : i === 1
                          ? 'using namespace std; makes std’s names visible as if they were here. Fine in a .cpp, poison in a header.'
                          : i === 2
                            ? 'cout hops into the global soup. Every include of this header injects that lookup into another TU.'
                            : 'Prefer using std::cout; at function scope, or just std::. Named namespaces beat static at namespace scope.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = gone ? 'sc-stage--dead' : polluted ? 'sc-stage--pollute' : id === 'stat' && i >= 1 ? 'sc-stage--static' : ''

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
          Play scope
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage sc-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="sc-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}${gone && id === 'block' ? ' own-ctrl--ghost' : ''}`}>
            <span className="lf-tag">
              {id === 'block' ? 'block' : id === 'stat' ? 'call' : id === 'dangle' ? 'callee' : 'std'}
            </span>
            <span className="own-name">
              {id === 'block' ? (gone ? '{ }' : '{ n }') : id === 'stat' ? (i >= 3 ? '2nd call' : '1st call') : id === 'dangle' ? (gone ? 'local dead' : 'local') : 'namespace std'}
            </span>
            <span className="mem-val">{id === 'dangle' ? (i >= 1 && i < 2 ? '7' : gone ? '∅' : '7') : id === 'using' ? 'cout' : nVal}</span>
            <span className="mem-note">{id === 'stat' && i >= 1 ? 'same n' : id === 'using' ? 'named scope' : 'automatic'}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${id === 'dangle' && i >= 1 ? ' own-card--shared' : ''}${id === 'dangle' && gone ? ' nd-card--ub' : ''}${polluted ? ' nd-card--ub' : ''}${id === 'stat' && i >= 1 ? ' own-card--unique' : ''}${alive ? ' own-card--unique' : ''}`}
          >
            <span className="lf-tag">
              {id === 'block' ? 'n' : id === 'stat' ? 'n' : id === 'dangle' ? 'r' : 'global'}
            </span>
            <span className="own-name">
              {id === 'block'
                ? gone
                  ? 'destroyed'
                  : alive
                    ? '1'
                    : '—'
                : id === 'stat'
                  ? String(nVal)
                  : id === 'dangle'
                    ? gone
                      ? 'dangling'
                      : i >= 1
                        ? 'alias'
                        : '—'
                    : polluted
                      ? 'cout visible'
                      : '—'}
            </span>
            <span className="mem-note">
              {id === 'dangle' && gone
                ? 'name lives, object dead'
                : id === 'stat' && i >= 3
                  ? 'no re-init'
                  : id === 'using' && polluted
                    ? 'header pollution'
                    : gone
                      ? 'out of scope'
                      : 'waiting'}
            </span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse sc-flyer${gone || polluted ? ' sc-flyer--trap' : id === 'dangle' && i === 1 ? ' sc-flyer--weld' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
