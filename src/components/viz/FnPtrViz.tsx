import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'fp' | 'mem' | 'fun' | 'cap'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'fp', title: 'fp', sig: 'int (*fp)(int,int)' },
  { id: 'mem', title: 'member', sig: 'int (W::*pm)()' },
  { id: 'fun', title: 'function', sig: 'std::function' },
  { id: 'cap', title: 'capture', sig: '[&] into function' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function FnPtrViz() {
  const [id, setId] = useState<Mode>('fp')
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
  const bounce = id === 'mem' && i >= 2
  const trapped = (id === 'fun' && i >= 2) || (id === 'cap' && i >= 2) || bounce
  const won = id === 'fp' && i >= 2

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
    id === 'fp'
      ? i === 1
        ? 'add'
        : 'fp(1,2)'
      : id === 'mem'
        ? i === 1
          ? '&W::get'
          : 'pm()'
        : id === 'fun'
          ? i === 1
            ? 'empty'
            : 'f()'
          : i === 1
            ? '[&]n'
            : 'call'

  const leftName =
    id === 'fp' ? 'int add' : id === 'mem' ? 'W::get' : id === 'fun' ? 'std::function' : 'local n'
  const leftVal =
    id === 'fp' ? '(int,int)' : id === 'mem' ? 'needs W' : id === 'fun' ? 'no target' : 'stack'
  const midName =
    id === 'fp' ? 'fp' : id === 'mem' ? 'int (W::*pm)()' : id === 'fun' ? 'f' : 'std::function'
  const midVal =
    id === 'fp' && i >= 1
      ? '&add'
      : id === 'mem' && i >= 1
        ? 'offset / thunk'
        : id === 'fun' && i >= 1
          ? 'empty'
          : id === 'cap' && i >= 1
            ? 'holds [&]'
            : '—'
  const midNote =
    id === 'fp' ? '& optional' : id === 'mem' ? 'not a fp' : id === 'fun' ? 'type erasure' : 'outlives n?'
  const rightName =
    id === 'fp' ? 'call' : id === 'mem' ? 'without W' : id === 'fun' ? 'operator()' : 'n after return'
  const rightVal =
    id === 'fp' && i >= 2
      ? '3'
      : id === 'mem' && i >= 2
        ? 'ill-formed'
        : id === 'fun' && i >= 2
          ? 'throw'
          : id === 'cap' && i >= 2
            ? 'dangle'
            : '—'
  const rightNote =
    id === 'fp' && won
      ? 'fp(1, 2)'
      : id === 'fp'
        ? 'functions decay'
        : bounce
          ? '(w.*pm)()'
          : id === 'mem'
            ? 'needs an object'
            : id === 'fun' && trapped
              ? 'bad_function_call'
              : id === 'fun'
                ? 'assign first'
                : trapped
                  ? 'capture by value'
                  : 'or don’t store it'

  const code =
    id === 'fp'
      ? i < 2
        ? `int add(int a, int b) { return a + b; }
int (*fp)(int, int) = add;   // & optional`
        : `int s = fp(1, 2);   // 3
// a captureless lambda also converts
// to a function pointer`
      : id === 'mem'
        ? i < 2
          ? `struct W { int n; int get() const { return n; } };
int (W::*pm)() const = &W::get;`
          : `pm();                 // ill-formed
W w{7};
int g = (w.*pm)();    // 7
int h = ((&w)->*pm)();`
        : id === 'fun'
          ? i < 2
            ? `std::function<int(int, int)> f;
// empty — no target`
            : `f();   // throws std::bad_function_call
f = add;
int s = f(1, 2);`
          : i < 2
            ? `std::function<int()> f;
{
  int n = 7;
  f = [&] { return n; };
}`
            : `f();   // n is gone — dangling capture
// capture [n] by value, or do not
// store a lambda that outlives the frame`

  const caption =
    i === 0
      ? id === 'fp'
        ? 'Play fp. A function pointer stores the address of a function with that signature. Functions decay to pointers; & is optional. Captureless lambdas convert too.'
        : id === 'mem'
          ? 'Play member. Pointers to members are a different, fat type. They need an object: (obj.*pm)() or (ptr->*pm)(). They do not convert to free function pointers.'
          : id === 'fun'
            ? 'Play function. std::function<Sig> type-erases any callable matching Sig. Empty function throws std::bad_function_call. Prefer a template parameter when you can inline.'
            : 'Play capture. Storing a lambda that captured locals into a std::function that outlives them is a dangling reference. Same class of bug as returning [&] from a function.'
      : id === 'fp' && i === 1
        ? 'add hops into fp. The pointer is just an address. No object, no captures. The call is an indirect jump.'
        : id === 'fp' && i === 2
          ? 'fp(1, 2) hops to 3. C++14 has no std::invoke; the call syntax is fp(1, 2). A template Callable parameter would have inlined add.'
          : id === 'fp'
            ? 'Use a function pointer when the set of targets is known and you must store one type. Mixed lambdas with state need std::function (or a hand-rolled vtable).'
            : id === 'mem' && i === 1
              ? '&W::get hops into pm. This is not a void*. It encodes which member, and it still needs a W to apply to.'
              : id === 'mem' && i === 2
                ? 'pm() bounces. There is no this. (w.*pm)() is the call. std::mem_fn(pm) makes a callable that takes W& as the first argument.'
                : id === 'mem'
                  ? 'A pointer-to-member cannot be assigned to a free function pointer. The types do not convert. That is not a cast you should force.'
                  : id === 'fun' && i === 1
                    ? 'std::function f; starts empty. operator bool is false. The type can later hold add, a lambda, or a bind-expression — possibly on the heap.'
                    : id === 'fun' && i === 2
                      ? 'f() hops and throws std::bad_function_call. Assign a target first. Check if (f) when the empty state is part of your protocol.'
                      : id === 'fun'
                        ? 'A template <class F> void call(F f) inlines. std::function is for when you must store mixed callables in one container or member.'
                        : i === 1
                          ? '[&] captures n by reference. The std::function now holds a callable that refers to a stack slot.'
                          : i === 2
                            ? 'The frame is gone. f() hops into a dangling n. UB. Capture [n] by value, or keep the std::function inside the same scope as n.'
                            : 'This is the same lesson as a lambda returned from a function with [&]. std::function does not extend the lifetime of captures.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'fp-stage--reject' : won ? 'fp-stage--win' : ''

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
          Play call
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage fp-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="fp-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">callable</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">store</span>
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
            className={`ptr-pulse fp-flyer${trapped || bounce ? ' fp-flyer--trap' : ''}`}
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
