import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'pointee' | 'ptr' | 'mutable' | 'cast'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'pointee', title: 'const T*', sig: 'const int* pc' },
  { id: 'ptr', title: 'T* const', sig: 'int* const cp' },
  { id: 'mutable', title: 'mutable', sig: 'get() const' },
  { id: 'cast', title: 'const_cast', sig: 'const_cast<int*>' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function CvQualViz() {
  const [id, setId] = useState<Mode>('pointee')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [arrow, setArrow] = useState('')
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const bound = i >= 1
  const tried = i >= 2
  const done = i >= 3
  const lockPointee = (id === 'pointee' || id === 'cast') && bound
  const lockPtr = id === 'ptr' && bound
  const writeOk = id === 'ptr' && done
  const hits = id === 'mutable' && i >= 2 ? 1 : 0
  const xVal = id === 'ptr' && writeOk ? 2 : id === 'cast' && done ? 'UB' : 1
  const ub = id === 'cast' && done
  const rejected = (id === 'pointee' && tried) || (id === 'ptr' && tried && !done) || (id === 'cast' && tried)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) {
      setArrow('')
      return
    }
    const origin = stage.getBoundingClientRect()
    const a = edge(srcRef.current, origin, 'right')
    const b = edge(dstRef.current, origin, 'left')
    setFrom(a)
    setTo(b)
    if (bound) setArrow(curve(a, b, 22))
    else setArrow('')
  }, [id, i, bound])

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
  const pulseKind = ub ? 'throw' : id === 'mutable' && i >= 2 ? 'p' : rejected && i === 2 ? 'throw' : 'r'
  const flyerText =
    i === 1
      ? id === 'mutable'
        ? 'get()'
        : id === 'cast'
          ? 'cast'
          : '&x'
      : i === 2
        ? id === 'pointee'
          ? '*pc=2'
          : id === 'ptr'
            ? 'cp=&y'
            : id === 'mutable'
              ? '++hits'
              : '*p=0'
        : id === 'ptr'
          ? '*cp=2'
          : id === 'mutable'
            ? 'hits'
            : ub
              ? 'UB'
              : 'blocked'

  const code =
    id === 'pointee'
      ? i === 0
        ? `int x = 1;\nconst int* pc;`
        : i === 1
          ? `const int* pc = &x;  // lock on *pc`
          : i === 2
            ? `*pc = 2;  // error: pointee is const`
            : `// x is still 1. The lock is on this name.`
      : id === 'ptr'
        ? i === 0
          ? `int x = 1;\nint* const cp;`
          : i === 1
            ? `int* const cp = &x;  // lock on cp`
            : i === 2
              ? `cp = &y;  // error: pointer is const`
              : `*cp = 2;  // OK: pointee is not const`
        : id === 'mutable'
          ? i < 2
            ? `struct Counter {
  int value = 0;
  mutable int hits = 0;
  int get() const { ++hits; return value; }
};`
            : `int get() const { ++hits; return value; }\n// hits is mutable. value is not.`
          : i === 0
            ? `const int k = 7;`
            : i === 1
              ? `int* p = const_cast<int*>(&k);`
              : i === 2
                ? `*p = 0;  // object was defined const`
                : `// UB. const_cast does not make mutation legal.`

  const caption =
    i === 0
      ? id === 'pointee'
        ? 'Play the lock. Read right-to-left: pc is a pointer to const int. You cannot write through this name.'
        : id === 'ptr'
          ? 'Play T* const. The * sits to the left of const — the pointer itself cannot reseat. The pointee still can.'
          : id === 'mutable'
            ? 'Play get() const. mutable is a hole in the const object: caches and mutexes, not an excuse to mutate the model.'
            : 'Play const_cast. Removing const from a name is legal. Mutating an object that was defined const is UB.'
      : id === 'pointee' && i === 1
        ? 'Green weld to x. The lock is on *pc, not on x. Another int* could still write x.'
        : id === 'pointee' && i === 2
          ? 'Write pulse bounces. *pc = 2 does not compile. That is the API contract const is for.'
          : id === 'pointee'
            ? 'x is still 1. const is a compile-time promise through this name — the backbone of APIs you can reason about.'
            : id === 'ptr' && i === 1
              ? 'Lock on the handle. cp will always name x. This is how unique_ptr’s pointer is “stuck” to one object.'
              : id === 'ptr' && i === 2
                ? 'Reseat bounces. cp = &y is an error. The pointer is const; the int is not.'
                : id === 'ptr'
                  ? '*cp = 2 writes x. Read the * position: const T* vs T* const is the whole lesson.'
                  : id === 'mutable' && i === 1
                    ? 'get() is a const member: *this is const. value is locked. hits is declared mutable.'
                    : id === 'mutable' && i === 2
                      ? '++hits is allowed in a const member. The object’s “logical” state (value) stays put.'
                      : id === 'mutable'
                        ? 'hits is 1, value is 0. Use mutable for caches and mutexes. Do not use it to lie about the model.'
                        : i === 1
                          ? 'const_cast produces an int*. The type system is quiet. The object k was born const.'
                          : i === 2
                            ? 'Write through the stripped pointer. The language allows the syntax. The object’s lifetime was const.'
                            : 'UB. Casting away const and mutating a truly const object is undefined. Do not “just this once.”'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const leftName = id === 'mutable' ? 'value' : id === 'cast' ? 'k' : 'x'
  const rightName = id === 'pointee' ? 'pc' : id === 'ptr' ? 'cp' : id === 'mutable' ? 'hits' : 'p'

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
          Play lock
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage cv-stage viz-stage--live${ub ? ' cv-stage--ub' : lockPointee || lockPtr ? ' cv-stage--lock' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="cv-row">
          <div
            ref={srcRef}
            className={`own-card${bound ? ' own-card--unique' : ''}${lockPointee ? ' cv-lock-obj' : ''}${writeOk ? ' pb-hot' : ''}`}
          >
            <span className="lf-tag">{id === 'mutable' ? 'const object' : 'object'}</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{id === 'mutable' ? 0 : xVal}</span>
            {lockPointee && <span className="cv-lock">const</span>}
            {id === 'mutable' && <span className="mem-note">logical state</span>}
          </div>
          <div
            ref={dstRef}
            className={`own-card${bound ? (lockPtr ? ' cv-lock-obj' : id === 'mutable' ? ' own-card--shared' : ' own-card--weak') : ''}${ub ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">{id === 'mutable' ? 'mutable member' : 'handle'}</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">
              {id === 'mutable' ? hits : id === 'cast' && bound ? 'int*' : bound ? '&x' : 'unset'}
            </span>
            {lockPtr && <span className="cv-lock">* const</span>}
            {id === 'pointee' && bound && <span className="mem-note">pointer to const</span>}
            {id === 'ptr' && bound && <span className="mem-note">const pointer</span>}
            {ub && <span className="mem-note">defined const</span>}
          </div>
        </div>
        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="cv-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={ub ? '#e06c75' : '#7dce82'} />
              <stop offset="100%" stopColor={ub ? '#f0883e' : '#7dce82'} />
            </linearGradient>
            <marker id="cv-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={ub ? '#e06c75' : '#7dce82'} />
            </marker>
          </defs>
          {arrow && (
            <path
              d={arrow}
              className={`own-arc own-arc--weak${ub ? ' lm-arc--dead' : ''}`}
              fill="none"
              style={{ stroke: 'url(#cv-grad)' }}
              markerEnd="url(#cv-head)"
            />
          )}
        </svg>
        {pos && (
          <span className={`ptr-pulse ptr-pulse--${pulseKind} cv-flyer`} style={{ left: pos.x, top: pos.y }}>
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
