import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'move' | 'term' | 'query' | 'ec'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'move', title: 'vector move', sig: 'move_if_noexcept' },
  { id: 'term', title: 'terminate', sig: 'f() noexcept' },
  { id: 'query', title: 'query', sig: 'noexcept(f())' },
  { id: 'ec', title: 'error_code', sig: 'open(path, ec)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function NoexceptViz() {
  const [id, setId] = useState<Mode>('move')
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
  const bounce = id === 'ec' && i === 2
  const trapped = (id === 'term' && i >= 2) || (id === 'ec' && i >= 2 && i < 3)
  const won = (id === 'move' && i >= 3) || (id === 'query' && i >= 2) || (id === 'ec' && i >= 3)

  const useRight =
    (id === 'move' && i >= 3) ||
    (id === 'term' && i >= 2) ||
    (id === 'query' && i >= 2) ||
    (id === 'ec' && i !== 1)

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
    id === 'move'
      ? i === 1
        ? 'grow'
        : i === 2
          ? 'throws?'
          : 'copy'
      : id === 'term'
        ? i === 1
          ? 'g()'
          : 'throw'
        : id === 'query'
          ? i === 1
            ? 'f()'
            : 'true'
          : i === 1
            ? 'ec'
            : i === 2
              ? 'ignore'
              : 'if (ec)'

  const leftName = id === 'move' ? 'T' : id === 'term' ? 'f() noexcept' : id === 'query' ? 'f()' : 'path'
  const leftVal =
    id === 'move' ? 'throwing move' : id === 'term' ? 'must not throw' : id === 'query' ? 'noexcept' : '"file"'
  const midName =
    id === 'move'
      ? 'vector::resize'
      : id === 'term'
        ? 'g()'
        : id === 'query'
          ? 'noexcept(f())'
          : 'open(path, ec)'
  const midNote =
    id === 'move'
      ? 'needs a bigger buffer'
      : id === 'term'
        ? 'may throw'
        : id === 'query'
          ? 'compile-time bool'
          : 'writes the code, no throw'
  const rightName =
    id === 'move'
      ? 'relocate'
      : id === 'term'
        ? 'std::terminate'
        : id === 'query'
          ? 'static_assert'
          : i >= 3
            ? 'handle'
            : 'ignored'
  const rightVal =
    id === 'move' && i >= 3
      ? 'copy'
      : id === 'term' && i >= 2
        ? 'abort'
        : id === 'query' && i >= 2
          ? 'true'
          : id === 'ec' && i >= 3
            ? 'checked'
            : '—'
  const rightNote =
    id === 'move' && i >= 3
      ? 'move_if_noexcept → copy'
      : id === 'move'
        ? 'move only if nothrow'
        : id === 'term' && i >= 2
          ? 'no catch, no unwind'
          : id === 'term'
            ? 'violation is fatal'
            : id === 'query'
              ? 'C++14: ::value, not _v'
              : id === 'ec' && i >= 3
                ? 'the actual policy'
                : 'easy to skip'

  const code =
    id === 'move'
      ? i < 3
        ? `template <typename T>
void relocate(T* d, T* s)
    noexcept(std::is_nothrow_move_constructible<T>::value) {
  new (d) T(std::move(*s));
}`
        : `// vector resize uses move_if_noexcept
// throwing move → copy the old buffer
// noexcept move → steal (magenta)`
      : id === 'term'
        ? i < 2
          ? `void f() noexcept {
  g();  // if g throws…
}`
          : `void f() noexcept {
  g();
}  // throw → std::terminate
// no catch. Unwind is not allowed.`
        : id === 'query'
          ? `void f() noexcept;
static_assert(noexcept(f()), "f must not throw");
// noexcept(expr) is a bool, not a flow`
          : i < 3
            ? `std::error_code ec;
open(path, ec);  // no throw
// ignoring ec is the whole hazard`
            : `if (ec) {
  log(ec.message());
}`

  const caption =
    i === 0
      ? id === 'move'
        ? 'Play vector move. vector will not use a throwing move on resize — it copies instead (move_if_noexcept). Mark moves noexcept or you pay copies.'
        : id === 'term'
          ? 'Play terminate. noexcept is a contract. If anything throws out of that function, there is no catch: std::terminate runs.'
          : id === 'query'
            ? 'Play query. noexcept(expr) is a compile-time bool. Templates use it to pick copy vs move. C++14 spells is_nothrow_move_constructible<T>::value.'
            : 'Play error_code. No unwind. The error sits in a value that is trivial to ignore. Pick a policy and stick to it — do not mix with exceptions without a boundary.'
      : id === 'move' && i === 1
        ? 'The vector is full. Resize must relocate every element into a new buffer.'
        : id === 'move' && i === 2
          ? 'is_nothrow_move_constructible<T>::value is false. A throwing move during this loop would strand the container. So it will not move.'
          : id === 'move'
            ? 'Copy. The old objects stay valid if a later copy throws. That is the safety. The cost is why people write noexcept moves.'
            : id === 'term' && i === 1
              ? 'f may only call things that truly cannot throw, or catch inside. g() is an ordinary call.'
              : id === 'term' && i === 2
                ? 'g throws. noexcept on f forbids leaving via that exception. There is no handler to try.'
                : id === 'term'
                  ? 'std::terminate. Destructors of other threads are not your cleanup. Never throw from a destructor either — same end during unwind.'
                  : id === 'query' && i === 1
                    ? 'noexcept(f()) inspects the exception specification, not a runtime try.'
                    : id === 'query' && i === 2
                      ? 'true. static_assert can demand it. vector does the same check for T’s move ctor.'
                      : id === 'query'
                        ? 'A function marked noexcept that then throws still compiles — the violation is at run time. The specifier is not a static guarantee of the body.'
                        : i === 1
                          ? 'open writes into ec. Success or failure, you get a code. Nothing unwinds.'
                          : i === 2
                            ? 'Ignore it and the program continues in a lie. That is the error-code footgun — silent, cheap, and wrong.'
                            : 'Check. Translate at a boundary if the rest of the program uses exceptions. Half-and-half APIs with no layer are unusable.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped || (id === 'term' && i >= 2) ? 'eh-stage--reject' : won ? 'eh-stage--win' : ''
  const steal = id === 'move' && i >= 3

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
          Play noexcept
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage eh-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="eh-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">src</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">call site</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && i < 2 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">step</span>
            <span className="own-name">{midName}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${id === 'term' && i >= 2 ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse eh-flyer${trapped || bounce ? ' eh-flyer--trap' : ''}${steal ? ' eh-flyer--copy' : ''}`}
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
