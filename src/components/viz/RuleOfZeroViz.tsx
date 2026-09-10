import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'zero' | 'quiet' | 'raw' | 'virt'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'zero', title: 'Zero', sig: 'Person' },
  { id: 'quiet', title: 'empty dtor', sig: '~Person() {}' },
  { id: 'raw', title: 'raw ptr', sig: 'int* p' },
  { id: 'virt', title: 'virtual dtor', sig: 'virtual ~Base()' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function RuleOfZeroViz() {
  const [id, setId] = useState<Mode>('zero')
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
  const bounce = id === 'raw' && i >= 3
  const trapped = (id === 'quiet' && i >= 2) || (id === 'raw' && i >= 2)
  const won = (id === 'zero' && i >= 2) || (id === 'virt' && i >= 2)

  const useRight =
    (id === 'zero' && i >= 2) ||
    (id === 'quiet' && i >= 2) ||
    (id === 'raw' && i >= 2) ||
    (id === 'virt' && i >= 2)

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
    id === 'zero'
      ? i === 1
        ? 'string'
        : 'unique_ptr'
      : id === 'quiet'
        ? i === 1
          ? '~T()'
          : 'no move'
        : id === 'raw'
          ? i === 1
            ? 'new int'
            : 'copy p'
          : i === 1
            ? 'virtual'
            : '=default'

  const leftName =
    id === 'zero' ? 'members' : id === 'quiet' ? 'user dtor' : id === 'raw' ? 'int* p' : 'Base'
  const leftVal =
    id === 'zero'
      ? 'string, unique_ptr'
      : id === 'quiet'
        ? '{}'
        : id === 'raw'
          ? 'owning raw'
          : 'polymorphic'
  const midName =
    id === 'zero' ? 'Person' : id === 'quiet' ? 'implicit moves' : id === 'raw' ? 'Person' : '~Base()'
  const midVal =
    id === 'zero' && i >= 1
      ? 'no specials'
      : id === 'quiet' && i >= 1
        ? 'suppressed'
        : id === 'raw' && i >= 1
          ? 'thinks Zero'
          : id === 'virt' && i >= 1
            ? 'virtual'
            : '—'
  const midNote =
    id === 'zero'
      ? 'compiler writes them'
      : id === 'quiet'
        ? 'user dtor kills moves'
        : id === 'raw'
          ? 'double-free waiting'
          : 'deliberate Five'
  const rightName =
    id === 'zero' ? 'copy / move' : id === 'quiet' ? 'copy instead' : id === 'raw' ? 'two dtors' : 'move / copy'
  const rightVal =
    id === 'zero' && i >= 2
      ? 'memberwise'
      : id === 'quiet' && i >= 2
        ? 'copy'
        : id === 'raw' && i >= 2
          ? 'double free'
          : id === 'virt' && i >= 2
            ? '=default'
            : '—'
  const rightNote =
    id === 'zero' && won
      ? 'string copies, ptr steals'
      : id === 'zero'
        ? 'Rule of Zero'
        : id === 'quiet' && trapped
          ? 'C++14 rule'
          : id === 'quiet'
            ? 'silent pessimization'
            : id === 'raw' && trapped
              ? 'UB / crash'
              : id === 'raw'
                ? 'raw is not a member manager'
                : '=default the rest'

  const code =
    id === 'zero'
      ? `class Person {
  std::string name_;
  std::vector<int> scores_;
  std::unique_ptr<Profile> profile_;
public:
  explicit Person(std::string name)
      : name_(std::move(name)) {}
};`
      : id === 'quiet'
        ? i < 2
          ? `class Person {
  std::string name_;
public:
  ~Person() {}  // “debug”
};`
          : `// user-declared dtor
// implicit moves are not generated
// copies run instead — C++14`
        : id === 'raw'
          ? i < 2
            ? `class Bag {
  int* p;  // owning
  // no dtor, no copy, no delete
};`
            : `Bag a, b = a;
// two objects, one new
// ~Bag does nothing… until you add one`
          : `struct Base {
  virtual ~Base() = default;
  Base(const Base&) = default;
  Base& operator=(const Base&) = default;
  Base(Base&&) = default;
  Base& operator=(Base&&) = default;
};`

  const caption =
    i === 0
      ? id === 'zero'
        ? 'Play Zero. string, vector, unique_ptr already know copy/move/destroy. The class stays quiet. That is the Rule of Zero — the one you want.'
        : id === 'quiet'
          ? 'Play empty dtor. A do-nothing destructor “for debugging” is a user-declared dtor. In C++14 that suppresses implicit moves. Copies sneak back in.'
          : id === 'raw'
            ? 'Play raw ptr. An owning int* is not a member that manages itself. Zero thinking here is a leak or a double free the moment you copy.'
            : 'Play virtual dtor. A polymorphic base often needs virtual ~Base(). That is a Rule of Five moment: =default the rest so you do not silently kill moves.'
      : id === 'zero' && i === 1
        ? 'name_ is a std::string. It hops into Person. Copying Person copies the string. No code in Person for that.'
        : id === 'zero' && i === 2
          ? 'unique_ptr hops in. Copy of Person is deleted (unique_ptr is move-only). Move of Person steals the pointer. Still no specials in Person.'
          : id === 'zero'
            ? 'The constructor takes std::string by value and move-inits. That is a sink, not a special member. Members did the Rule of Five for you.'
            : id === 'quiet' && i === 1
              ? '~Person() {}. You declared a destructor. The compiler now will not generate moves.'
              : id === 'quiet' && i === 2
                ? 'Person x = std::move(y) copies. unique_ptr members make that ill-formed; string members just get slow. Either way you did not want this.'
                : id === 'quiet'
                  ? '=default the destructor if you only needed virtuality or tracing — or don’t declare it. Look at all five if you declare one.'
                  : id === 'raw' && i === 1
                    ? 'new int hops into p. Person has no destructor. The allocation is already a leak when Person dies.'
                    : id === 'raw' && i === 2
                      ? 'Copy copies the pointer. Two objects, one allocation. Add a dtor that deletes p and you have a double free instead of a leak.'
                      : id === 'raw'
                        ? 'unique_ptr<int> is the Zero-compatible member. Raw owning pointers force the Rule of Five (or a leak).'
                        : i === 1
                          ? 'virtual ~Base() so delete (Base*)p runs the right destructor. That is not Zero; it is a known exception.'
                          : i === 2
                            ? '=default copy and move. If you only write the virtual dtor and forget, C++14 suppresses moves. Spell the Five.'
                            : 'Prefer composition (Zero) over a polymorphic hierarchy when you can. When you cannot, be explicit about the five.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const steal = id === 'zero' && i >= 2
  const stageKind = trapped ? 'rz-stage--reject' : won ? 'rz-stage--win' : ''

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
          Play zero
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage rz-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="rz-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">resource</span>
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
            <span className="lf-tag">specials</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse rz-flyer${trapped || bounce ? ' rz-flyer--trap' : ''}${steal ? ' rz-flyer--steal' : ''}`}
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
