import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'access' | 'inv' | 'thisc' | 'virtctor'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'access', title: 'private', sig: 'r.den_' },
  { id: 'inv', title: 'invariant', sig: 'Ratio(1, 0)' },
  { id: 'thisc', title: 'this const', sig: 'num() const' },
  { id: 'virtctor', title: 'virt in ctor', sig: 'Base() { speak(); }' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ClassesViz() {
  const [id, setId] = useState<Mode>('access')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const bounced = (id === 'access' && i >= 2) || (id === 'thisc' && i >= 2)
  const threw = id === 'inv' && i >= 2
  const wrongSpeak = id === 'virtctor' && i >= 2

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    const src = { x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 }
    const dst = { x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 }
    if (bounced) {
      setFrom(dst)
      setTo(src)
    } else {
      setFrom(src)
      setTo(dst)
    }
  }, [id, i, bounced])

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
    id === 'access'
      ? bounced
        ? 'private'
        : 'den_'
      : id === 'inv'
        ? threw
          ? 'throw'
          : '0'
        : id === 'thisc'
          ? bounced
            ? 'const'
            : 'this'
          : i === 1
            ? 'speak()'
            : 'Base::'

  const code =
    id === 'access'
      ? i < 2
        ? `class Ratio {
  int num_, den_;  // private
public:
  int den() const;
};`
        : `// r.den_   // error
r.den();           // the API`
      : id === 'inv'
        ? i < 2
          ? `Ratio(int n, int d) : num_(n), den_(d) {
  if (den_ == 0) throw std::invalid_argument("den");
}`
          : `Ratio(1, 0);  // throws
// no object. The invariant held.`
        : id === 'thisc'
          ? `int num() const {
  // this has type const Ratio*
  return num_;
}`
          : i < 2
            ? `struct Base {
  Base() { speak(); }
  virtual void speak();
};
struct D : Base { void speak(); };`
            : `Base() { speak(); }
// D’s part is not constructed.
// Base::speak runs, not D::speak.`

  const caption =
    i === 0
      ? id === 'access'
        ? 'Play private. struct vs class is default access. Keep data private and put the invariant in the constructor — that is a type, not a bag of fields.'
        : id === 'inv'
          ? 'Play Ratio(1, 0). If construction throws, there is no object. Callers never see a Ratio with den_ == 0.'
          : id === 'thisc'
            ? 'Play a const member. Inside num() const, this is const Ratio*. You may not assign num_. That is how const-correct APIs compose.'
            : 'Play a virtual call in a constructor. The derived part is not there yet. The call binds as if the type were the class under construction.'
      : id === 'access' && i === 1
        ? 'den_ is a data member. Outside the class, the name is not accessible. That bounce is the encapsulation, not a suggestion.'
        : id === 'access' && i === 2
          ? 'Ill-formed. Friendship punches a hole — use sparingly. The public API is den().'
          : id === 'access'
            ? 'r.den() is the read. In-class initializers (int n = 0) fill members a constructor forgets to mention, still in declaration order.'
            : id === 'inv' && i === 1
              ? '0 hops into den_. The mem-initializer already wrote it. The body is the last chance to reject the value.'
              : id === 'inv' && i === 2
                ? 'throw. Construction fails. Already-constructed members are destroyed in reverse. No Ratio exists for the caller.'
                : id === 'inv'
                  ? 'Public data with no check is a DTO. An invariant lives in the constructor (and in every mutating member).'
                  : id === 'thisc' && i === 1
                    ? 'this is const Ratio*. Reading num_ is fine. The cv of the member function is the cv of *this.'
                    : id === 'thisc' && i === 2
                      ? 'A write through this would not compile. mutable is the deliberate hole for caches — not for the invariant.'
                      : id === 'thisc'
                        ? 'Callers with a const Ratio& may only call const members. That is the whole point of marking them.'
                        : i === 1
                          ? 'Base() runs first. speak() is virtual. Lookup still finds the final overrider — but only among classes whose construction has started and not yet finished? No: during Base(), the type is Base.'
                          : i === 2
                            ? 'Base::speak. D’s vtable slot is not active. Calling a pure virtual here is UB. Don’t virtual-dispatch in ctor/dtor.'
                            : 'D() body has not run. Members of D are not constructed. This is why factories after full construction exist.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = threw || bounced ? 'cl-stage--reject' : wrongSpeak ? 'cl-stage--virt' : ''

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
          Play class
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage cl-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="cl-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">
              {id === 'access' ? 'caller' : id === 'inv' ? 'ctor args' : id === 'thisc' ? 'obj' : 'Base()'}
            </span>
            <span className="own-name">
              {id === 'access' ? 'r' : id === 'inv' ? 'Ratio(1, 0)' : id === 'thisc' ? 'const Ratio' : 'construct'}
            </span>
            <span className="mem-note">{id === 'virtctor' ? 'body runs last' : 'outside'}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${i >= 1 && !bounced && !threw ? ' own-card--unique' : ''}${bounced || threw ? ' nd-card--ub' : ''}${id === 'access' && bounced ? ' own-ctrl--ghost' : ''}`}
          >
            <span className="lf-tag">
              {id === 'access' ? 'private' : id === 'inv' ? 'den_' : id === 'thisc' ? 'this' : 'speak()'}
            </span>
            <span className="own-name">
              {id === 'access'
                ? bounced
                  ? 'inaccessible'
                  : 'den_'
                : id === 'inv'
                  ? threw
                    ? 'no object'
                    : '0'
                  : id === 'thisc'
                    ? bounced
                      ? 'const Ratio*'
                      : 'this'
                    : wrongSpeak
                      ? 'Base::speak'
                      : 'D::speak?'}
            </span>
            <span className="mem-note">
              {id === 'access' && bounced
                ? 'use den()'
                : threw
                  ? 'invariant held'
                  : id === 'thisc' && bounced
                    ? 'no write'
                    : wrongSpeak
                      ? 'D not constructed'
                      : 'waiting'}
            </span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse cl-flyer${bounced || threw ? ' cl-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
