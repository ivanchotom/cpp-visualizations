import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'pair' | 'get' | 'tie' | 'dangle'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'pair', title: 'pair', sig: 'make_pair(1, "n")' },
  { id: 'get', title: 'get', sig: 'get<1>(t)' },
  { id: 'tie', title: 'tie', sig: 'tie(ignore, name)' },
  { id: 'dangle', title: 'dangle', sig: 'forward_as_tuple' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function PairViz() {
  const [id, setId] = useState<Mode>('pair')
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
  const bounce = id === 'dangle' && i >= 2
  const trapped = id === 'dangle' && i >= 2
  const won = (id === 'pair' && i >= 2) || (id === 'get' && i >= 2) || (id === 'tie' && i >= 2)

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
    id === 'pair'
      ? i === 1
        ? '1, "n"'
        : 'first/second'
      : id === 'get'
        ? i === 1
          ? 'get<1>'
          : '2.0'
        : id === 'tie'
          ? i === 1
            ? 'ignore'
            : 'name'
          : i === 1
            ? 'int&&'
            : 'dead'

  const leftName =
    id === 'pair' ? 'args' : id === 'get' ? 'tuple' : id === 'tie' ? 'pair p' : 'temporary'
  const leftVal =
    id === 'pair' ? '1, "n"' : id === 'get' ? '1, 2.0, x' : id === 'tie' ? '{1, "n"}' : '42'
  const midName =
    id === 'pair' ? 'make_pair' : id === 'get' ? 'get<I>' : id === 'tie' ? 'std::tie' : 'forward_as_tuple'
  const midVal =
    id === 'pair' && i >= 1
      ? 'decay'
      : id === 'get' && i >= 1
        ? 'index 1'
        : id === 'tie' && i >= 1
          ? 'lvalue refs'
          : id === 'dangle' && i >= 1
            ? 'tuple<int&&>'
            : '—'
  const midNote =
    id === 'pair'
      ? 'not pair<int, char[2]>'
      : id === 'get'
        ? 'compile-time I'
        : id === 'tie'
          ? 'existing names'
          : 'refs to args'
  const rightName =
    id === 'pair' ? 'pair<int, const char*>' : id === 'get' ? 'double' : id === 'tie' ? 'name' : 'stored t'
  const rightVal =
    id === 'pair' && i >= 2
      ? '{1, "n"}'
      : id === 'get' && i >= 2
        ? '2.0'
        : id === 'tie' && i >= 2
          ? '"n"'
          : id === 'dangle' && i >= 2
            ? 'dangles'
            : '—'
  const rightNote =
    id === 'pair' && won
      ? 'decayed types'
      : id === 'pair'
        ? 'first, second'
        : id === 'get' && won
          ? 'by index'
          : id === 'get'
            ? 'or get<double>'
            : id === 'tie' && won
              ? 'ignore skipped id'
              : id === 'tie'
                ? 'C++14 unpack'
                : bounce
                  ? 'full-expression ended'
                  : 'do not store'

  const code =
    id === 'pair'
      ? i < 2
        ? `auto p = std::make_pair(1, "n");
// pair<int, const char*>
// decay: array → pointer`
        : `std::pair<int, std::string> p{1, "n"};
int id = p.first;
std::string name = p.second;
// C++17: auto [id, name] = p;`
      : id === 'get'
        ? i < 2
          ? `auto t = std::make_tuple(1, 2.0, 'x');
double d = std::get<1>(t);`
          : `auto t = std::make_tuple(1, 2.0, 'x');
double d = std::get<1>(t);
// std::get<double>(t);  // ok if unique
// get<int> ill-formed if two ints
// get<3>(t);            // compile error`
        : id === 'tie'
          ? i < 2
            ? `std::pair<int, std::string> p{1, "n"};
int id;
std::string name;
std::tie(std::ignore, name) = p;`
            : `std::tie(std::ignore, name) = p;
// name is "n"; id untouched
bool operator<(const Rec& a, const Rec& b) {
  return std::tie(a.x, a.y) < std::tie(b.x, b.y);
}`
          : i < 2
            ? `auto t = std::forward_as_tuple(42);
// tuple<int&&> bound to a temporary`
            : `auto t = std::forward_as_tuple(42);
// t dangles after this statement
// same trap: tuple<int&>{tmp}`

  const caption =
    i === 0
      ? id === 'pair'
        ? 'Play pair. make_pair / make_tuple deduce with decay. make_pair(1, "n") is pair<int, const char*>, not a pair that owns a string.'
        : id === 'get'
          ? 'Play get. std::get<1>(t) is a compile-time index. Out of range is a compile error. get<T> works only if T is unique in the tuple.'
          : id === 'tie'
            ? 'Play tie. C++14 has no structured bindings. std::tie(a, b) = p unpacks into existing lvalues. std::ignore skips a slot.'
            : 'Play dangle. forward_as_tuple is a tuple of references to the arguments. Store it past the full-expression and the refs dangle.'
      : id === 'pair' && i === 1
        ? '1 and "n" hop into make_pair. Deduction decays: the string literal is const char*, not an array type inside the pair.'
        : id === 'pair' && i === 2
          ? 'The pair lands as first/second. pair is the vocabulary type for “return two things.” Prefer a named struct when the fields have meaning.'
          : id === 'pair'
            ? 'C++17 structured bindings unpack without tie. Until then, first/second, get<I>, or tie into named locals.'
            : id === 'get' && i === 1
              ? 'get<1> hops. I is part of the template. There is no runtime “get(n)” in the type system — that is a different function you write with index_sequence.'
              : id === 'get' && i === 2
                ? '2.0 lands. get<double>(t) also works here because double appears once. Two ints make get<int> ill-formed.'
                : id === 'get'
                  ? 'tuple is a heterogeneous pack with a size known at compile time. That is why algorithms on tuples go through index_sequence, not a for loop on I.'
                  : id === 'tie' && i === 1
                    ? 'std::ignore hops into the first slot. tie builds a tuple of lvalue references to the named objects you already have.'
                    : id === 'tie' && i === 2
                      ? 'name hops out as "n". id is untouched. The same tie trick implements operator< on several fields without writing each comparison.'
                      : id === 'tie'
                        ? 'tie(a.x, a.y) < tie(b.x, b.y) is lexicographic. It is not a hash, and it copies nothing — it compares through the references.'
                        : i === 1
                          ? '42 hops in as an rvalue. forward_as_tuple(42) is tuple<int&&>. The reference is bound to a temporary that dies at the semicolon.'
                          : i === 2
                            ? 'The stored tuple bounces. The temporary is gone. tuple<int&> bound to a temporary is the same trap.'
                            : 'Returning a local pair/tuple by value is fine — NRVO or a move. Returning a tuple of references to locals is not.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'pt-stage--reject' : won ? 'pt-stage--win' : ''

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
          Play tuple
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage pt-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="pt-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">values</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">op</span>
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
            className={`ptr-pulse pt-flyer${trapped || bounce ? ' pt-flyer--trap' : ''}`}
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
