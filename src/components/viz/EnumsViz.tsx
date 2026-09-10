import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'scoped' | 'legacy' | 'width' | 'mask'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'scoped', title: 'enum class', sig: 'Color::red' },
  { id: 'legacy', title: 'unscoped', sig: 'FLAG_ON' },
  { id: 'width', title: 'underlying', sig: 'enum class : uint8_t' },
  { id: 'mask', title: 'bitmask', sig: 'Color::red | green' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function EnumsViz() {
  const [id, setId] = useState<Mode>('scoped')
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
  const bounce = (id === 'scoped' && i >= 2) || (id === 'mask' && i >= 2)
  const trapped = (id === 'legacy' && i >= 2) || (id === 'mask' && i >= 2) || (id === 'scoped' && i >= 2)
  const won = id === 'width' && i >= 2

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
    id === 'scoped'
      ? i === 1
        ? '::red'
        : 'to int'
      : id === 'legacy'
        ? i === 1
          ? 'FLAG_ON'
          : 'as int'
        : id === 'width'
          ? i === 1
            ? 'uint8_t'
            : 'sizeof'
          : i === 1
            ? 'red'
            : '|'

  const leftName =
    id === 'scoped' ? 'enumerators' : id === 'legacy' ? 'enum Legacy' : id === 'width' ? 'Color' : 'Color::red'
  const leftVal =
    id === 'scoped' ? 'Color::red' : id === 'legacy' ? 'leaks A, B' : id === 'width' ? ': uint8_t' : 'scoped'
  const midName =
    id === 'scoped' ? 'Color c' : id === 'legacy' ? 'enclosing scope' : id === 'width' ? 'underlying' : 'operator|'
  const midVal =
    id === 'scoped' && i >= 1
      ? 'Color'
      : id === 'legacy' && i >= 1
        ? 'FLAG_ON here'
        : id === 'width' && i >= 1
          ? 'uint8_t'
          : id === 'mask' && i >= 1
            ? 'not defined'
            : '—'
  const midNote =
    id === 'scoped' ? 'no leak' : id === 'legacy' ? 'C habit' : id === 'width' ? 'specify it' : 'ill-formed'
  const rightName =
    id === 'scoped' ? 'int n =' : id === 'legacy' ? 'int x =' : id === 'width' ? 'sizeof' : 'bitmask'
  const rightVal =
    id === 'scoped' && i >= 2
      ? 'ill-formed'
      : id === 'legacy' && i >= 2
        ? '1'
        : id === 'width' && i >= 2
          ? '1'
          : id === 'mask' && i >= 2
            ? 'no |'
            : '—'
  const rightNote =
    id === 'scoped' && bounce
      ? 'static_cast<int>(c)'
      : id === 'scoped'
        ? 'no implicit convert'
        : id === 'legacy' && trapped
          ? 'too easy to mix'
          : id === 'legacy'
            ? 'implicit to int'
            : id === 'width' && won
              ? 'not “always int”'
              : id === 'width'
                ? 'impl-defined unless set'
                : bounce
                  ? 'define operator| or don’t'
                  : 'that is the point'

  const code =
    id === 'scoped'
      ? i < 2
        ? `enum class Color : int { red, green, blue };
Color c = Color::red;`
        : `Color c = Color::red;
int n = c;                      // ill-formed
int n = static_cast<int>(c);    // explicit`
      : id === 'legacy'
        ? i < 2
          ? `enum Legacy { FLAG_ON = 1 };
// FLAG_ON is in this scope`
          : `enum Legacy { FLAG_ON = 1 };
int x = FLAG_ON;     // implicit
// collides with macros and other enums`
        : id === 'width'
          ? `enum class Color : std::uint8_t { red, green };
// sizeof(Color) is 1 here
// without : T the underlying type is
// implementation-defined (often int)`
          : i < 2
            ? `enum class Color { red = 1, green = 2 };
Color a = Color::red;`
            : `Color a = Color::red;
Color b = Color::green;
auto x = a | b;     // ill-formed
// enum class is not a bitmask unless you
// write operator| — that is the point`

  const caption =
    i === 0
      ? id === 'scoped'
        ? 'Play enum class. Color::red, not red. No implicit conversion to int. That is why it is the default choice in C++11 onward (this page is C++14).'
        : id === 'legacy'
          ? 'Play unscoped. enum Legacy { FLAG_ON } dumps FLAG_ON into the surrounding scope and converts to int without asking. C headers still do this.'
          : id === 'width'
            ? 'Play underlying. The underlying type is implementation-defined unless you write it. Specify : std::uint8_t when width or signedness matters.'
            : 'Play bitmask. enum class does not get operator| for free. If you wanted a mask, define the operators (or use a dedicated flags type). The compile error is the feature.'
      : id === 'scoped' && i === 1
        ? 'Color::red hops into Color c. The name is scoped. Nothing named red appears in the enclosing namespace.'
        : id === 'scoped' && i === 2
          ? 'int n = c bounces. No implicit conversion. static_cast<int>(c) is the explicit door. Comparisons to raw ints also refuse.'
          : id === 'scoped'
            ? 'switch (c) with Color::red cases is the usual dispatch. A default (or -Werror=switch) catches a new enumerator.'
            : id === 'legacy' && i === 1
              ? 'FLAG_ON hops into this scope. Another enum with FLAG_ON, or a Windows.h macro, now collides.'
              : id === 'legacy' && i === 2
                ? 'int x = FLAG_ON succeeds. The value is 1. You just mixed a flag with arithmetic. Prefer enum class unless you are matching a C API.'
                : id === 'legacy'
                  ? 'Unscoped enumerators also convert in overload resolution, which is how bool and int overloads get surprising callers.'
                  : id === 'width' && i === 1
                    ? ': std::uint8_t hops onto Color. The enumerators still convert (explicitly) to that integer type.'
                    : id === 'width' && i === 2
                      ? 'sizeof(Color) is 1. Packed arrays of flags stay small. Without an underlying type, do not assume int — it is impl-defined.'
                      : id === 'width'
                        ? 'Need a documented ABI or a wire format? Spell the type. Signed underlying types can hold negative enumerators; unsigned cannot wrap into a valid enumerator by accident as easily.'
                        : i === 1
                          ? 'Color::red hops in. It is a Color, not an int, so it will not silently OR with an integer mask.'
                          : i === 2
                            ? '| bounces. There is no Color operator|. If you truly want flags, define constexpr operator| that returns Color (C++11).'
                            : 'C++14 has no std::to_underlying (C++23). static_cast<std::underlying_type<Color>::type>(c) is the long spelling; C++14 also has underlying_type_t.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'en-stage--reject' : won ? 'en-stage--win' : ''
  const trapFlyer = bounce || (id === 'legacy' && i >= 2)

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
          Play enum
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage en-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="en-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">name</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">type</span>
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
            className={`ptr-pulse en-flyer${trapFlyer ? ' en-flyer--trap' : ''}`}
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
