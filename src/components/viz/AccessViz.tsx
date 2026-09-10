import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'priv' | 'friend' | 'prot' | 'st'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'priv', title: 'private', sig: 'Token{id}' },
  { id: 'friend', title: 'friend', sig: 'makeToken' },
  { id: 'prot', title: 'protected', sig: 'derived.n_' },
  { id: 'st', title: 'struct', sig: 'class vs struct' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function AccessViz() {
  const [id, setId] = useState<Mode>('priv')
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
  const bounce = (id === 'priv' && i >= 2) || (id === 'st' && i >= 2)
  const trapped = (id === 'priv' && i >= 2) || (id === 'prot' && i >= 2) || (id === 'st' && i >= 2)
  const won = id === 'friend' && i >= 2

  const useRight = i >= 2

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
    id === 'priv'
      ? i === 1
        ? 'main'
        : 'Token{'
      : id === 'friend'
        ? i === 1
          ? 'friend'
          : 'Token{'
        : id === 'prot'
          ? i === 1
            ? 'Derived'
            : 'n_ ='
          : i === 1
            ? 'struct'
            : 'class'

  const leftName =
    id === 'priv' ? 'caller' : id === 'friend' ? 'makeToken' : id === 'prot' ? 'Derived' : 'default'
  const leftVal =
    id === 'priv' ? 'not a member' : id === 'friend' ? 'one function' : id === 'prot' ? 'is-a Base' : 'access'
  const midName =
    id === 'priv' ? 'Token' : id === 'friend' ? 'ctor' : id === 'prot' ? 'protected n_' : 'class C'
  const midVal =
    id === 'priv' && i >= 1
      ? 'private ctor'
      : id === 'friend' && i >= 1
        ? 'hole punched'
        : id === 'prot' && i >= 1
          ? 'visible here'
          : id === 'st' && i >= 1
            ? 'private default'
            : '—'
  const midNote =
    id === 'priv' ? 'compile-time' : id === 'friend' ? 'not inherited' : id === 'prot' ? 'tight coupling' : 'struct is public'
  const rightName =
    id === 'priv' ? 'Token{1}' : id === 'friend' ? 'Token{id}' : id === 'prot' ? 'invariant' : 'DTO fields'
  const rightVal =
    id === 'priv' && i >= 2
      ? 'ill-formed'
      : id === 'friend' && i >= 2
        ? 'ok'
        : id === 'prot' && i >= 2
          ? 'broken'
          : id === 'st' && i >= 2
            ? 'hidden'
            : '—'
  const rightNote =
    id === 'priv' && bounce
      ? 'use id() / factory'
      : id === 'priv'
        ? 'names, not a sandbox'
        : won
          ? 'friend is a scalpel'
          : id === 'friend'
            ? 'not a whole class'
            : id === 'prot' && trapped
              ? 'private data instead'
              : id === 'prot'
                ? 'protected functions'
                : bounce
                  ? 'only the default differs'
                  : 'public struct is a fine DTO'

  const code =
    id === 'priv'
      ? i < 2
        ? `class Token {
public:
  int id() const { return id_; }
private:
  explicit Token(int id);
  int id_;
};`
        : `Token t{1};          // ill-formed
int n = t.id();      // the public name
// access is a name check, not a sandbox`
      : id === 'friend'
        ? `class Token {
  explicit Token(int id);
  friend Token makeToken(int);
};
Token makeToken(int id) { return Token{id}; }
// friend is not inherited, not transitive`
        : id === 'prot'
          ? i < 2
            ? `class Base {
protected:
  int n_;
};`
            : `class Derived : public Base {
  void bump() { n_ = 1; }   // compiles
};
// derived classes couple to n_.
// prefer private data + protected functions`
          : i < 2
            ? `struct Dto { int id; };     // public
class Token { int id_; };  // private`
            : `// the only language difference:
// default access (and default inheritance)
// public struct = DTO
// class with public knobs + broken invariant ≠ DTO`

  const caption =
    i === 0
      ? id === 'priv'
        ? 'Play private. Access is a compile-time check on names, not a runtime sandbox. class defaults to private. Token{1} from main is ill-formed; id() is the public name.'
        : id === 'friend'
          ? 'Play friend. friend Token makeToken(int); punches a hole for one function. Not inherited, not transitive. Prefer a single function over friend class Factory.'
          : id === 'prot'
            ? 'Play protected. Derived can write n_. That compiles and couples every derived class to the layout. Prefer private data and protected functions.'
            : 'Play struct. The only language difference vs class is default access (and default inheritance: public vs private). A public struct is a fine DTO.'
      : id === 'priv' && i === 1
        ? 'main hops toward Token. The constructor is a private name. Access control does not hide the layout from the ABI — only the names from other TUs’ source.'
        : id === 'priv' && i === 2
          ? 'Token{1} bounces. ill-formed. Invariants belong in the private section, not in a comment. Use the factory or a public named constructor.'
          : id === 'priv'
            ? 'private does not mean secret. Anyone with the header can read the members’ types. It only means other code cannot name them.'
            : id === 'friend' && i === 1
              ? 'friend hops onto the ctor. makeToken is now allowed to name Token’s private constructor. No one else is.'
              : id === 'friend' && i === 2
                ? 'Token{id} hops through. The factory returns a Token. Friendship is not inherited by Derived, and Factory’s friends do not become Token’s friends.'
                : id === 'friend'
                  ? 'friend-ing a whole class when a single function would do makes a wide hole. Keep the friend list short and next to the invariant it upholds.'
                  : id === 'prot' && i === 1
                    ? 'Derived hops in. protected n_ is visible. The language allows the write. The design now has N places that can break the invariant.'
                    : id === 'prot' && i === 2
                      ? 'n_ = 1 hops. Compiles. The coupling is the bug. Protected functions that maintain the invariant, private data underneath.'
                      : id === 'prot'
                        ? 'protected is for “derived classes may call this.” It is not a second public. Data almost never belongs there.'
                        : i === 1
                          ? 'struct Dto hops as public fields. Fine for a bag of values with no invariant. class Token defaults private.'
                          : i === 2
                            ? 'class C { int id_; } hides the name. Same layout as a struct with that member. Default inheritance is private for class, public for struct.'
                            : 'Pick struct when the type is a public aggregate. Pick class when you have an invariant. The keyword is a signal, not a performance hint.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'ac-stage--reject' : won ? 'ac-stage--win' : ''

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
          Play access
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ac-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ac-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">who</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">class</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse ac-flyer${trapped || bounce ? ' ac-flyer--trap' : ''}`}
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
