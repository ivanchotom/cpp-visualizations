import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'steady' | 'jump' | 'cast' | 'mix'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'steady', title: 'steady', sig: 'steady_clock::now()' },
  { id: 'jump', title: 'jump', sig: 'system_clock' },
  { id: 'cast', title: 'cast', sig: 'duration_cast' },
  { id: 'mix', title: 'clocks', sig: 'tp_a - tp_b' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ChronoViz() {
  const [id, setId] = useState<Mode>('steady')
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
  const bounce = (id === 'mix' && i >= 2) || (id === 'jump' && i >= 3)
  const trapped = id === 'jump' && i >= 2
  const won = (id === 'steady' && i >= 3) || (id === 'cast' && i >= 2)

  const useRight =
    (id === 'steady' && i >= 2) ||
    (id === 'jump' && i >= 2) ||
    (id === 'cast' && i >= 2) ||
    (id === 'mix' && i >= 2)

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
    id === 'steady'
      ? i === 1
        ? 't0'
        : i === 2
          ? 'now'
          : '42 ms'
      : id === 'jump'
        ? i === 1
          ? 't0'
          : i === 2
            ? 'NTP -2s'
            : 'neg'
        : id === 'cast'
          ? i === 1
            ? '1500 ms'
            : '1 s'
          : i === 1
            ? 'steady'
            : 'no convert'

  const leftName =
    id === 'steady' ? 'steady_clock' : id === 'jump' ? 'system_clock' : id === 'cast' ? 'milliseconds' : 'steady tp'
  const leftVal =
    id === 'steady'
      ? 'monotonic'
      : id === 'jump'
        ? i >= 2
          ? 'jumped'
          : 'wall'
        : id === 'cast'
          ? '1500'
          : 'epoch A'
  const midName =
    id === 'steady' ? 'work()' : id === 'jump' ? 'work()' : id === 'cast' ? 'duration_cast<seconds>' : 'system tp'
  const midVal =
    id === 'steady' && i >= 1
      ? 'running'
      : id === 'jump' && i >= 1
        ? 'running'
        : id === 'cast' && i >= 1
          ? 'toward 0'
          : id === 'mix'
            ? 'different epoch'
            : '—'
  const midNote =
    id === 'steady'
      ? 'does not jump'
      : id === 'jump'
        ? 'NTP / user can step it'
        : id === 'cast'
          ? 'truncate, not round'
          : 'no implicit conversion'
  const rightName =
    id === 'steady' ? 'duration' : id === 'jump' ? 'now - t0' : id === 'cast' ? 'count()' : 'minus'
  const rightVal =
    id === 'steady' && i >= 3
      ? '42 ms'
      : id === 'jump' && i >= 2
        ? i >= 3
          ? '-2000 ms'
          : '??'
        : id === 'cast' && i >= 2
          ? '1'
          : '—'
  const rightNote =
    id === 'steady' && won
      ? 'elapsed, .count()'
      : id === 'steady'
        ? 'how long, not when'
        : id === 'jump' && trapped
          ? 'wall clock lied'
          : id === 'jump'
            ? 'can go backwards'
            : id === 'cast' && i >= 2
              ? '1500 ms → 1 s'
              : id === 'cast'
                ? 'you pick the unit'
                : 'ill-formed mix'

  const code =
    id === 'steady'
      ? `using clock = std::chrono::steady_clock;
auto t0 = clock::now();
work();
auto ms = std::chrono::duration_cast<
    std::chrono::milliseconds>(clock::now() - t0);
std::cout << ms.count() << " ms\\n";`
      : id === 'jump'
        ? i < 2
          ? `auto t0 = std::chrono::system_clock::now();
work();
auto dt = std::chrono::system_clock::now() - t0;`
          : `// NTP stepped the clock -2s
// dt can be negative. Not elapsed time.`
        : id === 'cast'
          ? `auto d = std::chrono::milliseconds{1500};
auto s = std::chrono::duration_cast<
    std::chrono::seconds>(d);
// s.count() == 1  — toward zero`
          : `auto a = std::chrono::steady_clock::now();
auto b = std::chrono::system_clock::now();
// a - b;  // error: different clocks`

  const caption =
    i === 0
      ? id === 'steady'
        ? 'Play steady. duration is how long, time_point is when, clock is which epoch. Measure intervals with steady_clock — it does not jump.'
        : id === 'jump'
          ? 'Play jump. system_clock is the wall. NTP and the user can step it backwards. That is a terrible stopwatch.'
          : id === 'cast'
            ? 'Play duration_cast. You pick the unit. The conversion truncates toward zero — 1500 ms becomes 1 second, not 2.'
            : 'Play clocks. time_points from different clocks do not convert. You cannot subtract them. That is a type error, not a runtime surprise.'
      : id === 'steady' && i === 1
        ? 't0 = now(). A time_point on this clock’s epoch. Not a wall-clock date.'
        : id === 'steady' && i === 2
          ? 'work() runs. now() hops forward. The difference is a duration — milliseconds here via duration_cast.'
          : id === 'steady'
            ? '.count() is the integer tick count. C++14 has no operator<< for durations — print the count and the unit yourself.'
            : id === 'jump' && i === 1
              ? 't0 from system_clock. Fine for logging “what time was it,” bad for “how long did that take.”'
              : id === 'jump' && i === 2
                ? 'The wall jumps backward (NTP). The clock did not measure your function; it measured politics and radio.'
                : id === 'jump'
                  ? 'now - t0 can be negative. Use steady_clock for elapsed time. system_clock::to_time_t for C APIs.'
                  : id === 'cast' && i === 1
                    ? '1500 milliseconds. duration<Rep, Period>. The Period is a std::ratio.'
                    : id === 'cast' && i === 2
                      ? 'duration_cast<seconds> truncates toward zero → 1. There is no rounding helper in C++14.'
                      : id === 'cast'
                        ? 'Overflow is real for a huge count with a tiny Period. Keep the unit matched to the scale you store.'
                        : i === 1
                          ? 'Two time_points. They look like “now,” but each clock has its own epoch and tick.'
                          : i === 2
                            ? 'Minus is not defined across clocks. The types do not match. That is the feature.'
                            : 'Need a wall time? system_clock. Need a duration? subtract two points from the same clock, then duration_cast.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped || (id === 'mix' && i >= 2) ? 'ch-stage--reject' : won ? 'ch-stage--win' : ''

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
          Play chrono
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ch-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ch-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">clock</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">when / how long</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">step</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped || (id === 'mix' && i >= 2) ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse ch-flyer${trapped || bounce ? ' ch-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
