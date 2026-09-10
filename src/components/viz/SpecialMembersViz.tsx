import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'zero' | 'dtor' | 'five' | 'del'

type SlotKind = 'gen' | 'user' | 'absent' | 'deleted' | 'idle'

const SLOTS = [
  { key: 'dtor', label: '~T()' },
  { key: 'copy', label: 'T(const T&)' },
  { key: 'cassign', label: 'T& operator=' },
  { key: 'move', label: 'T(T&&)' },
  { key: 'massign', label: 'T& operator= &&' },
] as const

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'zero', title: 'Rule of Zero', sig: 'members own' },
  { id: 'dtor', title: 'user ~T()', sig: '~T() suppresses moves' },
  { id: 'five', title: 'Rule of Five', sig: 'define or delete all' },
  { id: 'del', title: 'move-only', sig: '= delete copy' },
]

const STEP_MS = 1300
const HOP_MS = 700

function slotState(mode: Mode, i: number, key: (typeof SLOTS)[number]['key']): SlotKind {
  if (i === 0) return 'idle'
  if (mode === 'zero') return 'gen'
  if (mode === 'dtor') {
    if (key === 'dtor') return i >= 1 ? 'user' : 'idle'
    if (key === 'move' || key === 'massign') return i >= 2 ? 'absent' : 'gen'
    return 'gen'
  }
  if (mode === 'five') {
    if (key === 'dtor') return i >= 1 ? 'user' : 'idle'
    if (key === 'copy' || key === 'cassign') return i >= 2 ? 'user' : 'idle'
    return i >= 3 ? 'user' : 'idle'
  }
  if (key === 'copy' || key === 'cassign') return i >= 2 ? 'deleted' : 'idle'
  if (key === 'dtor' || key === 'move' || key === 'massign') return i >= 1 ? 'user' : 'idle'
  return 'idle'
}

export function SpecialMembersViz() {
  const [id, setId] = useState<Mode>('zero')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const copied = id === 'dtor' && i >= 3
  const stolen = (id === 'zero' || id === 'del') && i >= 3
  const aEmpty = stolen

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    setFrom({ x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 })
    setTo({ x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 })
  }, [id, i])

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
    i === 1
      ? id === 'dtor'
        ? '~T()'
        : id === 'five'
          ? 'user'
          : id === 'del'
            ? 'delete'
            : 'members'
      : i === 2
        ? id === 'dtor'
          ? 'no move'
          : id === 'del'
            ? 'move-only'
            : id === 'five'
              ? 'define'
              : 'gen'
        : copied
          ? 'copy'
          : stolen
            ? 'steal'
            : 'T b = move(a)'

  const code =
    id === 'zero'
      ? i < 2
        ? `class Person {
  std::string name_;
  std::unique_ptr<Profile> p_;
};`
        : `Person b = std::move(a);
// members move. You wrote nothing.`
      : id === 'dtor'
        ? i === 0
          ? `class Handle { /* compiler five */ };`
          : i === 1
            ? `~Handle();  // user-declared`
            : i === 2
              ? `// implicit moves are gone (C++14)`
              : `Handle b = std::move(a);  // copies`
        : id === 'five'
          ? i < 3
            ? `Handle(const Handle&);
Handle& operator=(const Handle&);
Handle(Handle&&) noexcept;
Handle& operator=(Handle&&) noexcept;
~Handle();`
            : `// define or delete all five.`
          : i < 2
            ? `Handle(const Handle&) = delete;
Handle& operator=(const Handle&) = delete;`
            : `Handle(Handle&&) = default;
// move-only, like unique_ptr`

  const caption =
    i === 0
      ? id === 'zero'
        ? 'Play move. If every resource is already a member that knows copy/move/destroy, write nothing. That is the Rule of Zero.'
        : id === 'dtor'
          ? 'Play a user destructor. In C++14 a user-declared destructor suppresses implicit moves. Your class silently starts copying.'
          : id === 'five'
            ? 'Play the five. If you manage a raw resource, define or delete destructor, both copies, and both moves.'
            : 'Play delete. Delete the copy to make a type move-only. unique_ptr is this shape.'
      : id === 'zero' && i === 1
        ? 'string and unique_ptr already know the five. The compiler’s memberwise special members do the right thing.'
        : id === 'zero' && i === 2
          ? 'All five stay generated. No user dtor, no user copy, no user move — the compiler may write moves.'
          : id === 'zero'
            ? 'std::move(a) steals into b. You wrote a constructor for the name, and nothing else. Members did the rest.'
            : id === 'dtor' && i === 1
              ? 'A user-declared destructor. Even an empty one “for logging” counts. =default is still user-declared for this rule.'
              : id === 'dtor' && i === 2
                ? 'Move ctor and move assign are not generated. Copy ctor and copy assign still are. That is the C++11/14 trap.'
                : id === 'dtor'
                  ? 'T b = std::move(a) copies. The source is unchanged. A type that owned a raw pointer would now double-free on destroy.'
                  : id === 'five' && i === 1
                    ? 'Once you touch one, look at all of them. The grid is the checklist, not a suggestion.'
                    : id === 'five' && i === 2
                      ? 'All five are user-provided. Intent is in the class body. =default gets the obvious implementation back.'
                      : id === 'five'
                        ? 'A polymorphic base is the deliberate exception: virtual ~Base() = default, then default or delete the rest.'
                        : i === 1
                          ? 'Copy ctor and copy assign are deleted. Copy initialization will not compile.'
                          : i === 2
                            ? 'Moves stay. The type is move-only. That is unique_ptr’s contract, written with =delete / =default.'
                            : 'b steals. a is empty. You cannot accidentally copy a Handle and double-free.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = copied ? 'sm-stage--copy' : stolen ? 'viz-stage--move' : ''

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
          Play specials
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage sm-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="sm-grid">
          {SLOTS.map((s) => {
            const st = slotState(id, i, s.key)
            return (
              <div key={s.key} className={`sm-slot sm-slot--${st}`}>
                <span className="sm-slot-name">{s.label}</span>
                <span className="sm-slot-st">
                  {st === 'idle' ? '—' : st === 'gen' ? 'generated' : st === 'user' ? 'user' : st === 'deleted' ? '= delete' : 'absent'}
                </span>
              </div>
            )
          })}
        </div>
        <div className="sm-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}${aEmpty ? ' own-ctrl--ghost' : ''}`}>
            <span className="lf-tag">a</span>
            <span className="own-name">Handle</span>
            <span className="mem-val">{aEmpty ? 'empty' : 'owns'}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${copied ? ' own-card--unique' : stolen ? ' own-card--unique' : ''}`}
          >
            <span className="lf-tag">b</span>
            <span className="own-name">Handle</span>
            <span className="mem-val">{copied ? 'copy' : stolen ? 'owns' : '—'}</span>
            <span className="mem-note">{copied ? 'move became copy' : stolen ? 'moved-from a' : 'not yet'}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse sm-flyer${copied ? ' sm-flyer--copy' : stolen ? ' lm-flyer--steal' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
