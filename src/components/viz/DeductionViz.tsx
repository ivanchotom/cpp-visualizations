import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'decay' | 'fwd' | 'clash' | 'lambda'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'decay', title: 'decay', sig: 'f(T) · const int&' },
  { id: 'fwd', title: 'fwd', sig: 'f(T&&) · x' },
  { id: 'clash', title: 'clash', sig: 'add(1, 2.0)' },
  { id: 'lambda', title: 'lambda', sig: '[](auto x)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function DeductionViz() {
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
  const bounce = id === 'clash' && i >= 2
  const trapped = id === 'clash' && i >= 2
  const won = (id === 'decay' && i >= 2) || (id === 'fwd' && i >= 2) || (id === 'lambda' && i >= 2)

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
    id === 'decay'
      ? i === 1
        ? 'const int&'
        : 'T = int'
      : id === 'fwd'
        ? i === 1
          ? 'x lvalue'
          : 'T = int&'
        : id === 'clash'
          ? i === 1
            ? '1 → int'
            : '2.0'
          : i === 1
            ? '42'
            : 'auto → int'

  const leftName =
    id === 'decay' ? 'argument' : id === 'fwd' ? 'lvalue x' : id === 'clash' ? 'add(T, T)' : 'generic λ'
  const leftVal =
    id === 'decay' ? 'const int& x' : id === 'fwd' ? 'int x' : id === 'clash' ? '1, 2.0' : '[](auto x)'
  const midName =
    id === 'decay' ? 'param T' : id === 'fwd' ? 'param T&&' : id === 'clash' ? 'T from 1' : 'operator()'
  const midVal =
    id === 'decay' && i >= 1
      ? 'by value'
      : id === 'fwd' && i >= 1
        ? 'forwarding ref'
        : id === 'clash' && i >= 1
          ? 'T = int'
          : id === 'lambda' && i >= 1
            ? 'template'
            : '—'
  const midNote =
    id === 'decay'
      ? 'cv and & drop'
      : id === 'fwd'
        ? 'T deduced'
        : id === 'clash'
          ? 'first argument'
          : 'C++14'
  const rightName =
    id === 'decay' ? 'T' : id === 'fwd' ? 'T' : id === 'clash' ? 'T from 2.0' : 'T'
  const rightVal =
    id === 'decay' && i >= 2
      ? 'int'
      : id === 'fwd' && i >= 2
        ? 'int&'
        : id === 'clash' && i >= 2
          ? 'double ≠ int'
          : id === 'lambda' && i >= 2
            ? 'int'
            : '—'
  const rightNote =
    id === 'decay' && won
      ? 'decayed'
      : id === 'decay'
        ? 'not const int&'
        : id === 'fwd' && won
          ? 'keeps lvalue'
          : id === 'fwd'
            ? 'collapsing'
            : bounce
              ? 'ill-formed'
              : id === 'clash'
                ? 'must agree'
                : won
                  ? 'call operator'
                  : 'one T per auto'

  const code =
    id === 'decay'
      ? i < 2
        ? `template <typename T>
void f(T);          // by value

const int& x = 1;
f(x);               // T = int`
        : `template <typename T>
void f(T);          // by value

const int& x = 1;
f(x);               // T = int  (cv and & decay)
// arrays and functions decay to pointers`
      : id === 'fwd'
        ? i < 2
          ? `template <typename T>
void f(T&&);        // forwarding ref

int x = 1;
f(x);               // T = int&`
          : `template <typename T>
void f(T&&);

int x = 1;
f(x);               // T = int&  (lvalue)
f(1);               // T = int   (rvalue)
// T&& is a forwarding ref only if T is deduced`
        : id === 'clash'
          ? i < 2
            ? `template <typename T>
T add(T a, T b) { return a + b; }

add(1, 2);          // T = int  ok`
            : `template <typename T>
T add(T a, T b) { return a + b; }

// add(1, 2.0);     // ill-formed: T is int and double
add<double>(1, 2);  // T given; 1 and 2 convert`
          : i < 2
            ? `auto id = [](auto x) { return x; };

id(42);             // C++14 generic lambda`
            : `auto id = [](auto x) { return x; };
// equivalent to
// template <typename T>
// auto operator()(T x) const { return x; }

id(42);             // T = int`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play decay. f(T) by value decays: refs and top-level cv go. f(x) with const int& x still stamps T = int.'
        : id === 'fwd'
          ? 'Play fwd. A deduced T&& is a forwarding reference. The same lvalue x that decayed to int now keeps T = int&.'
          : id === 'clash'
            ? 'Play clash. Two parameters both named T must deduce the same type. add(1, 2.0) is ill-formed, not “the common type.”'
            : 'Play lambda. [](auto x) is a C++14 generic lambda — an operator() template. Each auto is its own T.'
      : id === 'decay' && i === 1
        ? 'const int& hops into a by-value parameter. The argument expression is an lvalue, but T itself is not a reference.'
        : id === 'decay' && i === 2
          ? 'T lands as int. Top-level const and the reference are stripped. Arrays and functions decay to pointers the same way.'
          : id === 'decay'
            ? 'auto x = expr decays like T by value. decltype(auto) keeps references — returning a local that way is a dangling-ref factory.'
            : id === 'fwd' && i === 1
              ? 'x hops as an lvalue into T&&. T is deduced, so this is a forwarding reference, not “rvalue only.”'
              : id === 'fwd' && i === 2
                ? 'T = int&. Collapsing: int& && → int&. f(1) would deduce T = int. See Forwarding for std::forward.'
                : id === 'fwd'
                  ? 'void f(Widget&&); is just an rvalue ref. Only a deduced T&& (or auto&&) forwards.'
                  : id === 'clash' && i === 1
                    ? '1 hops in. First parameter deduces T = int. The second parameter is the same T, not a second independent type.'
                    : id === 'clash' && i === 2
                      ? '2.0 bounces. T from 2.0 would be double. Two deductions for one T must agree. The call is ill-formed.'
                      : id === 'clash'
                        ? 'add<double>(1, 2) skips deduction: T is given, and 1 converts. That is not “pick the common type.”'
                        : i === 1
                          ? '42 hops into auto x. Each auto parameter is a separate template parameter on the call operator.'
                          : i === 2
                            ? 'The compiler stamps operator()<int>. id("hi") stamps a second copy. Unused autos are never generated.'
                            : 'auto f() { return 1; } is the C++14 deduced return type. Every return must agree, or the function is ill-formed.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'td-stage--reject' : won ? 'td-stage--win' : ''

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
          Play deduction
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage td-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="td-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">call</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">param</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">T</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse td-flyer${trapped || bounce ? ' td-flyer--trap' : ''}`}
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
