import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'sum' | 'sizeof' | 'index' | 'nobase'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'sum', title: 'sum', sig: 'sum(1, 2, 3)' },
  { id: 'sizeof', title: 'sizeof', sig: 'sizeof...(Ts)' },
  { id: 'index', title: 'index', sig: 'index_sequence' },
  { id: 'nobase', title: 'nobase', sig: 'print(rest...)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function VariadicViz() {
  const [id, setId] = useState<Mode>('sum')
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
  const bounce = (id === 'nobase' && i >= 2) || (id === 'sizeof' && i >= 3)
  const trapped = (id === 'nobase' && i >= 2) || (id === 'sizeof' && i >= 3)
  const won = (id === 'sum' && i >= 2) || (id === 'sizeof' && i >= 2 && i < 3) || (id === 'index' && i >= 2)

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
    id === 'sum'
      ? i === 1
        ? '1, 2, 3'
        : '(t += xs, 0)...'
      : id === 'sizeof'
        ? i === 1
          ? 'Ts...'
          : i === 2
            ? 'sizeof...'
            : 'sizeof(xs)'
        : id === 'index'
          ? i === 1
            ? 'N = 3'
            : '0, 1, 2'
          : i === 1
            ? 'head'
            : 'rest...'

  const leftName =
    id === 'sum' ? 'pack' : id === 'sizeof' ? 'pack' : id === 'index' ? 'tuple' : 'print'
  const leftVal =
    id === 'sum' ? 'Ts... xs' : id === 'sizeof' ? 'int, char' : id === 'index' ? 'get<I>' : 'head, rest...'
  const midName =
    id === 'sum' ? 'expand' : id === 'sizeof' ? 'sizeof...' : id === 'index' ? 'index_sequence' : 'recurse'
  const midVal =
    id === 'sum' && i >= 1
      ? '{ … }'
      : id === 'sizeof' && i >= 1
        ? 'length'
        : id === 'index' && i >= 1
          ? 'I...'
          : id === 'nobase' && i >= 1
            ? 'print(rest...)'
            : '—'
  const midNote =
    id === 'sum'
      ? 'C++14 foreach'
      : id === 'sizeof'
        ? 'not sizeof(xs)'
        : id === 'index'
          ? 'C++14'
          : 'needs a base'
  const rightName =
    id === 'sum' ? 't' : id === 'sizeof' ? 'count' : id === 'index' ? 'each' : 'instantiation'
  const rightVal =
    id === 'sum' && i >= 2
      ? '6'
      : id === 'sizeof' && i >= 2 && i < 3
        ? '2'
        : id === 'sizeof' && i >= 3
          ? 'ill-formed'
          : id === 'index' && i >= 2
            ? 'get<0,1,2>'
            : id === 'nobase' && i >= 2
              ? 'no stop'
              : '—'
  const rightNote =
    id === 'sum' && won
      ? 'comma in braces'
      : id === 'sum'
        ? 'int t = 0'
        : id === 'sizeof' && i >= 3
          ? 'pack, not object'
          : id === 'sizeof' && i >= 2
            ? 'compile-time'
            : id === 'sizeof'
              ? 'size_t'
              : id === 'index' && won
                ? '0 .. N-1'
                : id === 'index'
                  ? 'make_index_sequence'
                  : bounce
                    ? 'never terminates'
                    : 'empty pack ok'

  const code =
    id === 'sum'
      ? i < 2
        ? `template <typename... Ts>
int sum(Ts... xs) {
  int t = 0;
  int _[] = {0, (t += static_cast<int>(xs), 0)...};
  (void)_;
  return t;
}`
        : `int n = sum(1, 2, 3);   // t = 6
// comma-in-braces is the C++14 pack foreach
// C++17: (xs + … + 0)`
      : id === 'sizeof'
        ? i < 3
          ? `template <typename... Ts>
constexpr std::size_t n() {
  return sizeof...(Ts);   // length of the pack
}

n<int, char>();           // 2`
          : `template <typename... Ts>
void f(Ts... xs) {
  // sizeof(xs);          // ill-formed: xs is a pack
  sizeof...(xs);          // ok:  the length
}`
        : id === 'index'
          ? i < 2
            ? `template <typename Tuple, std::size_t... I>
void each_impl(Tuple& t, std::index_sequence<I...>) {
  int _[] = {0, ((void)std::get<I>(t), 0)...};
  (void)_;
}`
            : `auto t = std::make_tuple(1, 2, 3);
each_impl(t, std::make_index_sequence<3>{});
// expands get<0>, get<1>, get<2>
// C++14: make_index_sequence`
          : i < 2
            ? `template <typename T, typename... Rest>
void print(T head, Rest... rest) {
  // use head
  print(rest...);          // recurse
}`
            : `print(1, 2, 3);
print(2, 3);
print(3);
print();                  // no matching function
// need: void print() {}  // empty-pack base`

  const caption =
    i === 0
      ? id === 'sum'
        ? 'Play sum. A pack expands with Pattern... in a context that allows it. The C++14 foreach is a dummy initializer list of comma expressions.'
        : id === 'sizeof'
          ? 'Play sizeof. sizeof...(Ts) is a compile-time size_t — the length of the pack, not the size of an object. sizeof(xs) on a pack is ill-formed.'
          : id === 'index'
            ? 'Play index. std::make_index_sequence<N> plus a helper that takes index_sequence<I...> lets you expand 0..N-1. That is how you walk a tuple in C++14.'
            : 'Play nobase. A recursive variadic without a non-template (or empty-pack) overload never terminates instantiation.'
      : id === 'sum' && i === 1
        ? '1, 2, 3 hop in as Ts... xs. The pack is a list of types and a matching list of values. Empty is valid: sum() is 0.'
        : id === 'sum' && i === 2
          ? '(t += xs, 0)... expands into the braces. Each element adds, then yields 0 so the array type is int. (void)_ silences unused.'
          : id === 'sum'
            ? 'g(h(xs)...) applies h to each, then calls g. Expanding in a context that forbids expansion dumps a wall of substitution notes.'
            : id === 'sizeof' && i === 1
              ? 'int, char hop in. Two types in the pack. The length is a property of the pack, not of any one object.'
              : id === 'sizeof' && i === 2
                ? 'sizeof...(Ts) lands as 2. Compile-time. There is no object whose sizeof is “the pack.”'
                : id === 'sizeof'
                  ? 'sizeof(xs) bounces — xs is a pack, not an expression. Write sizeof...(xs). Same trap as sizeof...(xs) vs sizeof(xs).'
                  : id === 'index' && i === 1
                    ? 'N = 3 hops into make_index_sequence<3>. The helper receives index_sequence<0, 1, 2>.'
                    : id === 'index' && i === 2
                      ? 'I... expands as get<0>(t), get<1>(t), get<2>(t). Same dummy-array foreach as sum. C++17 folds replace most of this.'
                      : id === 'index'
                        ? 'You cannot write get<0, 1, 2> as a pack in the tuple itself. The index pack is the adapter.'
                        : i === 1
                          ? 'head hops off. rest... is the remaining pack. Recursion peels one argument per instantiation.'
                          : i === 2
                            ? 'print() with an empty pack has no overload. Instantiation does not stop. Add void print() {} as the base case.'
                            : 'An empty pack is a valid call if a matching overload exists. Watch the base: the recursive case must not also match zero args.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'va-stage--reject' : won ? 'va-stage--win' : ''

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
          Play pack
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage va-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="va-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">pack</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">expand</span>
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
            className={`ptr-pulse va-flyer${trapped || bounce ? ' va-flyer--trap' : ''}`}
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
