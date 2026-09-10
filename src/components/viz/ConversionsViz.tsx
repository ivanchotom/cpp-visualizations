import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'assign' | 'brace' | 'named' | 'dynamic'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'assign', title: 'int n = d', sig: 'int n = 3.9' },
  { id: 'brace', title: 'int n{d}', sig: 'int n{3.9}' },
  { id: 'named', title: 'static_cast', sig: 'static_cast<int>(d)' },
  { id: 'dynamic', title: 'dynamic_cast', sig: 'dynamic_cast<D*>(p)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ConversionsViz() {
  const [id, setId] = useState<Mode>('assign')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const arrived = i >= 1
  const done = i >= 3
  const silent = id === 'assign' && arrived
  const rejected = id === 'brace' && i >= 2
  const named = id === 'named' && arrived
  const dynTry = id === 'dynamic' && i === 1
  const dynFail = id === 'dynamic' && i >= 2
  const bounce = rejected || dynFail

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    const src = { x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 }
    const dst = { x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 }
    if (bounce) {
      setFrom(dst)
      setTo(src)
    } else {
      setFrom(src)
      setTo(dst)
    }
  }, [id, i, bounce])

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
    id === 'dynamic'
      ? dynFail
        ? 'nullptr'
        : 'D*?'
      : i === 1
        ? '3.9'
        : id === 'brace'
          ? 'error'
          : '3'

  const dstVal =
    id === 'brace'
      ? rejected
        ? 'ill-formed'
        : '—'
      : id === 'named'
        ? named
          ? '3'
          : '—'
        : id === 'assign'
          ? silent
            ? '3'
            : '—'
          : dynFail
            ? 'nullptr'
            : dynTry
              ? 'trying D*'
              : '—'

  const code =
    id === 'assign'
      ? i === 0
        ? `double d = 3.9;\nint n;`
        : i === 1
          ? `int n = d;  // implicit`
          : i === 2
            ? `int n = d;  // 3, fraction dropped`
            : `// compiles. The 0.9 is gone. Prefer braces.`
      : id === 'brace'
        ? i === 0
          ? `double d = 3.9;`
          : i === 1
            ? `int n{d};  // list-init`
            : i === 2
              ? `int n{d};  // error: narrowing`
              : `// braces refuse silent truncation.`
        : id === 'named'
          ? i === 0
            ? `double d = 3.9;`
            : i === 1
              ? `auto n = static_cast<int>(d);`
              : i === 2
                ? `auto n = static_cast<int>(d);  // 3`
                : `// named, related, documented.`
          : i === 0
            ? `struct B { virtual ~B() {} };
struct D : B { void only(); };
B b;
B* p = &b;`
            : i === 1
              ? `D* q = dynamic_cast<D*>(p);`
              : i === 2
                ? `// p points at a B, not a D`
                : `q == nullptr;  // pointer form does not throw`

  const caption =
    i === 0
      ? id === 'assign'
        ? 'Play the assignment. C++ converts more eagerly than you might like. = will silently narrow.'
        : id === 'brace'
          ? 'Play brace init. int n{3.9} is an error. That is why braces are the modern default.'
          : id === 'named'
            ? 'Play static_cast. Named casts document intent. Related conversions only — numeric, void*, upcast.'
            : 'Play dynamic_cast. Safe downcast of a polymorphic type. Pointer failure is nullptr; a reference would throw.'
      : id === 'assign' && i === 1
        ? '3.9 hops into an int. The conversion is implicit. No cast in the source, so readers miss the truncation.'
        : id === 'assign' && i === 2
          ? 'n is 3. The 0.9 is gone. This compiles. Signed/unsigned mixes in arithmetic are the same family of surprise.'
          : id === 'assign'
            ? 'Prefer int n{d} (ill-formed) or static_cast<int>(d) when you mean it. C-style (int)d can mix several cast kinds — avoid it.'
            : id === 'brace' && i === 1
              ? 'List-initialization is the narrowing gate. The compiler must reject a floating-to-int drop here.'
              : id === 'brace' && i === 2
                ? 'Ill-formed. No object n. That bounce is the whole point of uniform initialization.'
                : id === 'brace'
                  ? 'Use braces at variable declarations. C-style (int)d and = both stay silent. Name a static_cast when you must truncate.'
                  : id === 'named' && i === 1
                    ? 'static_cast<int>(d) is a well-defined related conversion. The name is the documentation.'
                    : id === 'named' && i === 2
                      ? '3, on purpose. Not reinterpret, not const_cast. One job.'
                      : id === 'named'
                        ? 'C-style (int)d can act like static, const, or reinterpret depending on the types. Don’t give it that range.'
                        : i === 1
                          ? 'dynamic_cast needs a virtual function (here ~B). RTTI walks the real type. p points at a plain B.'
                          : i === 2
                            ? 'The source is not a D. The pointer form returns nullptr. A D& cast would throw std::bad_cast.'
                            : 'Check the pointer. No new in the lesson — Base b; B* p = &b is enough to fail the downcast.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const trap = silent && done
  const stageKind = rejected ? 'cvn-stage--reject' : trap ? 'cvn-stage--narrow' : dynFail ? 'cvn-stage--null' : ''

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
          Play cast
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage cvn-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="cvn-row">
          <div ref={srcRef} className={`own-card${arrived ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">{id === 'dynamic' ? 'static type B*' : 'source'}</span>
            <span className="own-name">{id === 'dynamic' ? 'p' : 'd'}</span>
            <span className="mem-val">{id === 'dynamic' ? '&b' : '3.9'}</span>
            <span className="mem-note">{id === 'dynamic' ? 'points at B, not D' : 'double'}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${arrived && !rejected && !dynFail ? (id === 'named' ? ' own-card--unique' : silent ? ' nd-card--ub' : ' own-card--shared') : ''}${rejected ? ' own-ctrl--ghost' : ''}${dynFail ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">{id === 'dynamic' ? 'D*' : 'int'}</span>
            <span className="own-name">{id === 'dynamic' ? 'q' : 'n'}</span>
            <span className="mem-val">{dstVal}</span>
            <span className="mem-note">
              {id === 'assign' && silent
                ? 'silent narrow'
                : id === 'brace' && rejected
                  ? 'narrowing error'
                  : id === 'named' && named
                    ? 'named, related'
                    : dynFail
                      ? 'pointer form'
                      : dynTry
                        ? 'needs virtual'
                        : 'waiting'}
            </span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse cvn-flyer${rejected || trap || dynFail ? ' cvn-flyer--trap' : id === 'named' ? ' cx-flyer--gold' : ''}`}
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
