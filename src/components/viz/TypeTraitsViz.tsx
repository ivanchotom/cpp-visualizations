import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'decay' | 'query' | 'parens' | 'cond'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'decay', title: 'decay_t', sig: 'decay_t<int&>' },
  { id: 'query', title: 'is_integral', sig: 'is_integral<T>' },
  { id: 'parens', title: 'decltype', sig: 'decltype((x))' },
  { id: 'cond', title: 'conditional', sig: 'conditional_t<…>' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function TypeTraitsViz() {
  const [id, setId] = useState<Mode>('decay')
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
  const trap = id === 'parens' && i >= 2
  const won = (id === 'decay' && i >= 2) || (id === 'cond' && i >= 2) || (id === 'query' && i === 1)

  const useRight =
    (id === 'decay' && i >= 2) ||
    (id === 'query' && i >= 2) ||
    (id === 'parens' && i >= 2) ||
    (id === 'cond' && i >= 2)

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
    setFrom(src)
    setTo(dst)
  }, [id, i, useRight])

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
    id === 'decay'
      ? i === 1
        ? 'int&'
        : 'int'
      : id === 'query'
        ? i === 1
          ? 'int'
          : 'int*'
        : id === 'parens'
          ? i === 1
            ? 'x'
            : '(x)'
          : i === 1
            ? 'sizeof==8'
            : 'long'

  const leftName =
    id === 'decay' ? 'int&' : id === 'query' ? (i >= 2 ? 'int*' : 'int') : id === 'parens' ? 'int x' : 'pred'
  const leftVal =
    id === 'decay' ? 'x' : id === 'query' ? (i >= 2 ? 'ptr' : '42') : id === 'parens' ? '1' : 'sizeof(void*)'
  const midName =
    id === 'decay'
      ? 'remove_reference_t'
      : id === 'query'
        ? 'is_integral<T>'
        : id === 'parens'
          ? 'decltype(x)'
          : 'conditional_t'
  const midVal = id === 'decay' && i >= 1 ? 'int' : id === 'parens' && i >= 1 ? 'int' : id === 'query' && i === 1 ? 'true' : '—'
  const midNote =
    id === 'decay'
      ? 'strip &'
      : id === 'query'
        ? '::value  (not _v)'
        : id === 'parens'
          ? 'the type of the name'
          : 'C++14 alias of ::type'
  const rightName =
    id === 'decay'
      ? 'decay_t<int&>'
      : id === 'query'
        ? i >= 2
          ? 'false_type'
          : 'true_type'
        : id === 'parens'
          ? 'decltype((x))'
          : 'then / else'
  const rightVal =
    id === 'decay' && i >= 2
      ? 'int'
      : id === 'query' && i >= 2
        ? 'false'
        : id === 'parens' && i >= 2
          ? 'int&'
          : id === 'cond' && i >= 2
            ? 'long'
            : '—'
  const rightNote =
    id === 'decay' && won
      ? 'is_same with int'
      : id === 'decay'
        ? 'also arrays → pointers'
        : id === 'query' && i >= 2
          ? 'pointers are not integral'
          : id === 'query'
            ? '::value is a bool'
            : id === 'parens' && i >= 2
              ? 'extra parens → lvalue'
              : id === 'parens'
                ? 'decltype of an expression'
                : 'LP64: pointer is 8'

  const code =
    id === 'decay'
      ? i < 2
        ? `static_assert(
  std::is_same<std::decay_t<int&>, int>::value,
  "");`
        : `using U = std::decay_t<int&>;  // int
// remove_reference, then array/fn decay`
      : id === 'query'
        ? i < 2
          ? `static_assert(std::is_integral<int>::value, "");`
          : `static_assert(!std::is_integral<int*>::value, "");
// C++14: ::value, not std::is_integral_v`
        : id === 'parens'
          ? i < 2
            ? `int x = 1;
using A = decltype(x);     // int`
            : `using B = decltype((x));  // int&
// extra parens make an lvalue expression`
          : i < 2
            ? `using W = std::conditional_t<
  sizeof(void*) == 8, long, int>;`
            : `using W = long;  // LP64
// std::conditional_t is C++14; ::type is C++11`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play decay_t<int&>. Traits are metafunctions: types in, types or bools out. decay is what function arguments do — strip refs, decay arrays.'
        : id === 'query'
          ? 'Play is_integral. Query traits answer yes/no at compile time. C++14 still spells ::value — _v aliases are C++17.'
          : id === 'parens'
            ? 'Play decltype((x)). decltype(x) is the declared type. Extra parens make an lvalue expression, so you get a reference.'
            : 'Play conditional_t. It picks a type from a bool. C++14 adds the _t aliases so you can drop ::type.'
      : id === 'decay' && i === 1
        ? 'int& goes into remove_reference_t. The reference is gone. decay does this first, then array-to-pointer and function-to-pointer.'
        : id === 'decay' && i === 2
          ? 'decay_t<int&> is int. static_assert(is_same<…, int>) holds. This is how you talk about “the value type” of a forwarding reference.'
          : id === 'decay'
            ? 'decltype(expr) keeps references; decay_t usually does not. Pick the one that matches the question you are asking.'
            : id === 'query' && i === 1
              ? 'is_integral<int>::value is true. true_type / false_type are the tag types; ::value is the bool you static_assert.'
              : id === 'query' && i === 2
                ? 'int* hops in. A pointer is not an integral type. The same trait, a different answer — no runtime branch.'
                : id === 'query'
                  ? 'Incomplete types are often ill-formed here. Test the operation you will actually perform, not a nearby trait name.'
                  : id === 'parens' && i === 1
                    ? 'decltype(x) names the type of the declaration: int. No extra reference.'
                    : id === 'parens' && i === 2
                      ? '(x) is an lvalue expression. decltype((x)) is int&. That extra pair of parens is a famous quiz question.'
                      : id === 'parens'
                        ? 'Need a reference? decltype((x)) or declval<T&>(). Need a value? decay_t or remove_reference_t.'
                        : i === 1
                          ? 'sizeof(void*) == 8 on LP64. The predicate is a compile-time bool, not an if.'
                          : i === 2
                            ? 'conditional_t<true, long, int> is long. The unused branch is not instantiated in a way that has to be valid… except it still must be a valid type name.'
                            : 'C++14: decay_t, enable_if_t, remove_reference_t, conditional_t. C++17 adds if constexpr for the body; this page is the type-level if.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trap ? 'tt-stage--reject' : won ? 'tt-stage--win' : ''

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
          Play trait
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage tt-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="tt-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">type argument</span>
          </div>
          <div
            ref={midRef}
            className={`own-card${id !== 'cond' && i >= 1 && i < 2 ? ' own-card--unique' : ''}`}
          >
            <span className="lf-tag">trait</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trap ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse tt-flyer${trap ? ' tt-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
