import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'observer' | 'find' | 'byval' | 'lie'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'observer', title: 'observer', sig: 'empty() const' },
  { id: 'find', title: 'find', sig: 'find(Id) const' },
  { id: 'byval', title: 'by value', sig: 'const T f()' },
  { id: 'lie', title: 'lie', sig: '++g_hits' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ConstCorrectViz() {
  const [id, setId] = useState<Mode>('observer')
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
  const bounce = (id === 'observer' && i >= 2) || (id === 'byval' && i >= 2)
  const trapped = (id === 'lie' && i >= 2) || (id === 'byval' && i >= 2)
  const won = (id === 'observer' && i >= 1 && i < 2) || (id === 'find' && i >= 2)

  const useRight =
    (id === 'observer' && i >= 2) ||
    (id === 'find' && i >= 2) ||
    (id === 'byval' && i >= 2) ||
    (id === 'lie' && i >= 2)

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
    id === 'observer'
      ? i === 1
        ? 'empty()'
        : 'clear()'
      : id === 'find'
        ? i === 1
          ? 'const&'
          : 'Bag&'
        : id === 'byval'
          ? i === 1
            ? 'const T'
            : 'move'
          : i === 1
            ? 'const fn'
            : '++g'

  const leftName =
    id === 'observer' ? 'const Bag&' : id === 'find' ? 'caller' : id === 'byval' ? 'return' : 'this const'
  const leftVal =
    id === 'observer'
      ? 'read-only this'
      : id === 'find'
        ? i >= 2
          ? 'non-const Bag'
          : 'const Bag'
        : id === 'byval'
          ? 'const string'
          : 'empty() const'
  const midName =
    id === 'observer' ? 'items_' : id === 'find' ? 'find(id)' : id === 'byval' ? 'temporary' : 'g_hits'
  const midVal =
    id === 'observer' && i >= 1
      ? i >= 2
        ? 'this is const'
        : 'size() == 0'
      : id === 'find' && i >= 1
        ? i >= 2
          ? 'Item*'
          : 'const Item*'
        : id === 'byval' && i >= 1
          ? 'const-qualified'
          : id === 'lie' && i >= 1
            ? i >= 2
              ? 'mutated'
              : 'global'
            : '—'
  const midNote =
    id === 'observer'
      ? 'member'
      : id === 'find'
        ? 'overload set'
        : id === 'byval'
          ? 'by value'
          : 'not a member'
  const rightName =
    id === 'observer' ? 'write' : id === 'find' ? 'mutate *p' : id === 'byval' ? 'std::move' : 'thread safety'
  const rightVal =
    id === 'observer' && i >= 2
      ? 'ill-formed'
      : id === 'find' && i >= 2
        ? 'ok'
        : id === 'byval' && i >= 2
          ? 'blocked'
          : id === 'lie' && i >= 2
            ? 'lie'
            : '—'
  const rightNote =
    id === 'observer' && bounce
      ? 'need a non-const method'
      : id === 'observer'
        ? 'const documents the contract'
        : id === 'find' && won
          ? 'two overloads, one object'
          : id === 'find'
            ? 'const view first'
            : id === 'byval' && trapped
              ? 'return T, not const T'
              : id === 'byval'
                ? 'const on a value is a speed bump'
                : trapped
                  ? 'const does not mean thread-safe'
                  : 'mutable only for a cache'

  const code =
    id === 'observer'
      ? i < 2
        ? `class Bag {
public:
  bool empty() const { return items_.empty(); }
private:
  std::vector<Item> items_;
};`
        : `bool Bag::empty() const {
  items_.clear();   // ill-formed: this is const
  return items_.empty();
}`
      : id === 'find'
        ? `class Bag {
public:
  const Item* find(Id id) const;
  Item* find(Id id);
};
void show(const Bag& b) { b.find(id); }  // const*
void edit(Bag& b) { b.find(id)->n = 1; }`
        : id === 'byval'
          ? i < 2
            ? `const std::string name() {
  return std::string("Ada");
}`
            : `const std::string name();
std::string s = std::move(name());
// const return blocks move from the temporary
// return std::string; not const std::string`
          : i < 2
            ? `int g_hits = 0;
class Bag {
public:
  bool empty() const;
};`
            : `bool Bag::empty() const {
  ++g_hits;        // compiles. not const in spirit.
  return items_.empty();
}`

  const caption =
    i === 0
      ? id === 'observer'
        ? 'Play observer. A const method can read members. Writing them is a compile error — that is the point of the annotation, not a style hint.'
        : id === 'find'
          ? 'Play find. Pair a const overload that returns const T* with a non-const one that returns T*. The const Bag& caller cannot reach the mutator.'
          : id === 'byval'
            ? 'Play by value. Returning const T by value is usually pointless: it blocks moving from the temporary. Return T. Return const T& when you mean a borrow.'
            : 'Play lie. A const method that mutates a global still compiles. Const is not thread-safety. It is a contract about *this, not the whole process.'
      : id === 'observer' && i === 1
        ? 'empty() hops into items_. Read is fine. this is const Bag*. Callers with a const Bag& can use it.'
        : id === 'observer' && i === 2
          ? 'clear() hops at items_ and bounces. The member function is const. You wanted a non-const mutator, or you wanted this call not to exist.'
          : id === 'observer'
            ? 'Mark observers const. Then a const Bag& is actually usable, and you notice accidental writes at compile time.'
            : id === 'find' && i === 1
              ? 'const Bag& picks find(Id) const. The pointer you get is const Item*. You cannot write through it.'
              : id === 'find' && i === 2
                ? 'Bag& picks the non-const overload. Item* lets you mutate. Same object, two contracts. Do not implement one in terms of const_cast of the other without care.'
                : id === 'find'
                  ? 'This is the usual pair. cv-qualifiers on the pointer are a different page; here the const is on the method / the handle.'
                  : id === 'byval' && i === 1
                    ? 'const std::string comes back. The temporary is const-qualified. C++14 will not move from it; it copies.'
                    : id === 'byval' && i === 2
                      ? 'std::move bounces off the const temporary. Returning const T by value is a pessimization. Return T. const T& is a borrow, not a value.'
                      : id === 'byval'
                        ? 'const on a parameter (const T&) is a gift. const on a returned value is usually a footgun. C++17 prvalues change the story slightly; this page is C++14.'
                        : i === 1
                          ? 'empty() const. this is const. Members of *this are safe. Globals are not in that contract.'
                          : i === 2
                            ? '++g_hits hops into a global. Compiles. Two threads calling empty() now race. Const-correctness is not a mutex.'
                            : 'mutable is for a logical-const cache inside the object. A global counter is neither. Protect shared mutable data or do not share it.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped || bounce ? 'cr-stage--reject' : won ? 'cr-stage--win' : ''
  const trapFlyer = bounce || trapped

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
          Play const
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage cr-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="cr-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">this</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">handle</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">body</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped || bounce ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse cr-flyer${trapFlyer ? ' cr-flyer--trap' : ''}`}
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
