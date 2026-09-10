import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'plus' | 'implicit' | 'postfix' | 'andop'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'plus', title: '2 + v', sig: '2 + v' },
  { id: 'implicit', title: 'implicit', sig: 'v + 1' },
  { id: 'postfix', title: 'postfix', sig: 'i++' },
  { id: 'andop', title: 'operator&&', sig: 'a && b' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function OpOverloadViz() {
  const [id, setId] = useState<Mode>('plus')
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
  const bounce = id === 'plus' && i === 2
  const trapped = (id === 'implicit' && i >= 2) || (id === 'andop' && i >= 2)
  const won = (id === 'plus' && i >= 3) || (id === 'postfix' && i >= 3)

  const useRight =
    (id === 'plus' && i >= 3) ||
    (id === 'implicit' && i >= 2) ||
    (id === 'postfix' && i !== 1) ||
    (id === 'andop' && i >= 2)

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
    id === 'plus'
      ? i === 1
        ? '2'
        : i === 2
          ? 'miss'
          : 'Vec(2)'
      : id === 'implicit'
        ? i === 1
          ? 'bool'
          : 'int 1'
        : id === 'postfix'
          ? i === 1
            ? 'copy 3'
            : '++'
          : i === 1
            ? 'a'
            : 'b anyway'

  const leftName = id === 'plus' ? 'int' : id === 'implicit' ? 'Flag v' : id === 'postfix' ? 'i' : 'a'
  const leftVal = id === 'plus' ? '2' : id === 'implicit' ? 'true' : id === 'postfix' ? (i >= 2 ? '4' : '3') : 'false'
  const midName =
    id === 'plus' ? 'Vec::operator+' : id === 'implicit' ? 'operator bool' : id === 'postfix' ? 'old' : 'operator&&'
  const midNote =
    id === 'plus' && i >= 1 && i < 3
      ? 'int is not this'
      : id === 'plus'
        ? 'member, left must be Vec'
        : id === 'implicit'
          ? 'converts'
          : id === 'postfix'
            ? i >= 1
              ? '3  (the result)'
              : 'copy first'
            : i >= 2
              ? 'both args already eval'
              : 'no short-circuit'
  const rightName =
    id === 'plus' ? 'operator+(Vec, Vec)' : id === 'implicit' ? 'v + 1' : id === 'postfix' ? '++*this' : 'b'
  const rightVal =
    id === 'plus' && won
      ? 'Vec'
      : id === 'implicit' && trapped
        ? '2'
        : id === 'postfix' && i >= 2
          ? '4'
          : id === 'andop' && trapped
            ? 'ran'
            : '—'
  const rightNote =
    id === 'plus' && won
      ? '2 converts, then +'
      : id === 'plus'
        ? 'free: either side converts'
        : id === 'implicit' && trapped
          ? 'bool → int  (oops)'
          : id === 'implicit'
            ? 'accidental arithmetic'
            : id === 'postfix'
              ? 'then return old'
              : 'would skip if built-in'

  const code =
    id === 'plus'
      ? i < 3
        ? `class Vec {
public:
  Vec(int n);
  Vec& operator+=(const Vec& o);
};
inline Vec operator+(Vec a, const Vec& b) {
  a += b;
  return a;
}`
        : `2 + v;   // Vec(2) then free operator+
// v.operator+(2) is not this call`
      : id === 'implicit'
        ? i < 2
          ? `struct Flag {
  operator bool() const { return on_; }
};
if (v) { }     // ok
int n = v + 1; // bool → int`
          : `int n = v + 1;  // 1 + 1
// explicit operator bool() would refuse`
        : id === 'postfix'
          ? `T operator++(int) {  // dummy int
  T old = *this;
  ++*this;
  return old;
}
i++;  // copy 3, then i is 4`
          : i < 2
            ? `bool operator&&(const Flag&, const Flag&);
if (a && b) { }`
            : `a && b;  // both evaluated
// built-in && would skip b when a is false`

  const caption =
    i === 0
      ? id === 'plus'
        ? 'Play 2 + v. A member operator+ needs *this on the left. A free operator+ lets either operand convert — that is why + is usually a non-member.'
        : id === 'implicit'
          ? 'Play v + 1. Implicit operator bool() also converts to int. if (v) works; so does v + 1, which is rarely what you meant.'
          : id === 'postfix'
            ? 'Play i++. The dummy int overload is postfix. Copy the old value, prefix-increment, return the copy — by value, not a reference to a local.'
            : 'Play a && b. Overloaded && || and comma lose short-circuit and sequencing. Prefer named functions if you must combine two Flags.'
      : id === 'plus' && i === 1
        ? '2 is int. Lookup for a member call would need a Vec on the left. The int does not grow a Vec::operator+.'
        : id === 'plus' && i === 2
          ? 'Miss. Member operators never convert the left operand. That is why 2 + v is a different design from v + 2.'
          : id === 'plus'
            ? 'Free operator+(Vec, Vec). 2 converts via Vec(int), then +=. Either side may convert. Keep + unsurprising: it should not mutate its operands.'
            : id === 'implicit' && i === 1
              ? 'v converts to bool. Contextual conversions (if, &&, !) are the intended use.'
              : id === 'implicit' && i === 2
                ? 'bool promotes to int. v + 1 is 2. The type now does arithmetic it never declared.'
                : id === 'implicit'
                  ? 'Mark it explicit operator bool() (C++11). if (v) still works; v + 1 does not. That is the whole point of explicit.'
                  : id === 'postfix' && i === 1
                    ? 'Copy the current value. The result of i++ is that snapshot, not the incremented object.'
                    : id === 'postfix' && i === 2
                      ? '++*this. Implement postfix in terms of prefix so there is one increment to maintain.'
                      : id === 'postfix'
                        ? 'Return old by value. Returning a reference to the local copy is a dangling-ref bug.'
                        : i === 1
                          ? 'a is false. Built-in && would not evaluate b. The overloaded call is an ordinary function call.'
                          : i === 2
                            ? 'b runs anyway. Side effects, throws, work — all happen. That is why overloading && is a footgun.'
                            : 'Write a named all() / both(). Keep && for bool. Same story for operator, (comma) and overloaded ||.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'oo-stage--reject' : won ? 'oo-stage--win' : ''

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
          Play operator
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage oo-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="oo-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">lhs</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">call site</span>
          </div>
          <div
            ref={midRef}
            className={`own-card${id === 'postfix' && i >= 1 ? ' own-card--unique' : ''}${id === 'plus' && i >= 1 && i < 3 ? ' own-ctrl--ghost' : ''}`}
          >
            <span className="lf-tag">{id === 'plus' ? 'member' : id === 'postfix' ? 'result' : 'op'}</span>
            <span className="own-name">{midName}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">{id === 'plus' ? 'free' : id === 'implicit' ? 'arith' : id === 'postfix' ? 'object' : 'rhs'}</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse oo-flyer${bounce || trapped ? ' oo-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
