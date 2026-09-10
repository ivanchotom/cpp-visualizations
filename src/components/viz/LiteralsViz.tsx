import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'octal' | 'suffix' | 'nullptr' | 'brace'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'octal', title: '010', sig: 'int x = 010' },
  { id: 'suffix', title: '42u', sig: 'auto n = 42u' },
  { id: 'nullptr', title: 'nullptr', sig: 'auto p = nullptr' },
  { id: 'brace', title: 'auto x{1}', sig: 'auto x{1}' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function LiteralsViz() {
  const [id, setId] = useState<Mode>('octal')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const arrived = i >= 1
  const decided = i >= 2
  const done = i >= 3
  const trap = (id === 'octal' && done) || (id === 'brace' && decided)

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
    id === 'octal'
      ? i === 1
        ? '010'
        : '8'
      : id === 'suffix'
        ? i === 1
          ? '42'
          : '42u'
        : id === 'nullptr'
          ? i === 1
            ? '0'
            : 'nullptr'
          : i === 1
            ? '{1}'
            : 'list'

  const srcVal =
    id === 'octal'
      ? '010'
      : id === 'suffix'
        ? i >= 2
          ? '42u'
          : '42'
        : id === 'nullptr'
          ? i >= 2
            ? 'nullptr'
            : '0'
          : '{1}'

  const srcNote =
    id === 'octal'
      ? 'looks like ten'
      : id === 'suffix'
        ? i >= 2
          ? 'unsigned suffix'
          : 'no suffix → int'
        : id === 'nullptr'
          ? i >= 2
            ? 'std::nullptr_t'
            : 'int zero'
          : 'one token in braces'

  const dstVal =
    id === 'octal'
      ? arrived
        ? '8'
        : '—'
      : id === 'suffix'
        ? i >= 2
          ? 'unsigned'
          : arrived
            ? 'int'
            : '—'
        : id === 'nullptr'
          ? i >= 2
            ? 'nullptr_t → T*'
            : arrived
              ? 'null int*'
              : '—'
          : decided
            ? 'initializer_list<int>'
            : arrived
              ? 'int?'
              : '—'

  const dstNote =
    id === 'octal'
      ? arrived
        ? 'leading 0 = octal'
        : 'waiting'
      : id === 'suffix'
        ? i >= 2
          ? 'first that fits unsigned'
          : arrived
            ? 'first that fits int'
            : 'auto n'
        : id === 'nullptr'
          ? i >= 2
            ? 'typed null pointer'
            : arrived
              ? '0 converts to T*'
              : 'waiting'
          : decided
            ? 'C++14 auto + braces'
            : 'waiting'

  const code =
    id === 'octal'
      ? i === 0
        ? `int x = 010;`
        : i === 1
          ? `// leading 0 → octal, not decimal`
          : i === 2
            ? `int x = 010;  // 1*8 + 0`
            : `// x is 8. int y = 10; if you meant ten.`
      : id === 'suffix'
        ? i < 2
          ? `auto n = 42;     // int`
          : `auto n = 42u;    // unsigned
auto w = 42ll;   // long long`
        : id === 'nullptr'
          ? i < 2
            ? `int* p = 0;      // 0 is int, converts`
            : `auto p = nullptr; // std::nullptr_t
int* q = p;      // then to T*`
          : i < 2
            ? `auto x{1};`
            : `// C++14: std::initializer_list<int>
// not int. Prefer auto x = 1;`

  const caption =
    i === 0
      ? id === 'octal'
        ? 'Play 010. A literal has a type and a value. Leading 0 is octal, not a style for tens.'
        : id === 'suffix'
          ? 'Play 42 then 42u. Suffixes pick the type: the first that fits in that literal’s list.'
          : id === 'nullptr'
            ? 'Play 0 then nullptr. 0 is an int that converts to any pointer. nullptr is a typed null.'
            : 'Play auto x{1}. In C++14 this is not an int. Brace + auto is a one-element initializer_list.'
      : id === 'octal' && i === 1
        ? '010 hops in as written. The 0 prefix is the radix, not padding.'
        : id === 'octal' && i === 2
          ? '1×8 + 0 = 8. Same token, different value. 052 is 42. Hex is 0x.'
          : id === 'octal'
            ? 'x is 8. This compiles. Write 10, 0xA, or 0b1010 later — never a leading 0 for decimal.'
            : id === 'suffix' && i === 1
              ? '42 has no suffix. The list is int → long → long long. 42 fits in int.'
              : id === 'suffix' && i === 2
                ? '42u is unsigned. 3.14 is double; 3.14f is float. The suffix is the type.'
                : id === 'suffix'
                  ? 'auto n = 42u is unsigned. Mixing with signed in comparisons is the usual trap — see types.'
                  : id === 'nullptr' && i === 1
                    ? '0 hops into int*. It becomes a null pointer by conversion. Overload resolution still sees an int.'
                    : id === 'nullptr' && i === 2
                      ? 'nullptr is std::nullptr_t. It converts to any pointer (and to bool). It does not pick a numeric overload.'
                      : id === 'nullptr'
                        ? 'Prefer nullptr. 0 and NULL are ints (or macros). Overloads that take int* vs int will surprise you.'
                        : i === 1
                          ? 'Braces wrap the 1. auto + a braced-init-list is a special rule, not “whatever T would have been.”'
                          : i === 2
                            ? 'C++14: auto x{1} is std::initializer_list<int>. One element, list type. x.size() is 1.'
                            : 'Prefer auto x = 1; or int x{1}. C++17 later made auto x{1} an int. Do not write to that future yet.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trap ? 'lit-stage--trap' : id === 'nullptr' && done ? 'lit-stage--ok' : ''

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
          Play literal
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage lit-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="lit-row">
          <div ref={srcRef} className={`own-card${arrived ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">literal</span>
            <span className="own-name">{srcVal}</span>
            <span className="mem-note">{srcNote}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${arrived ? (trap ? ' nd-card--ub' : ' own-card--shared') : ''}${id === 'nullptr' && i >= 2 ? ' own-card--unique' : ''}`}
          >
            <span className="lf-tag">{id === 'brace' ? 'auto x' : id === 'nullptr' ? 'p' : id === 'suffix' ? 'auto n' : 'int x'}</span>
            <span className="own-name">{dstVal}</span>
            <span className="mem-note">{dstNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse lit-flyer${trap ? ' lit-flyer--trap' : id === 'nullptr' && i >= 2 ? ' lit-flyer--ok' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
