import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'rank' | 'del' | 'boolp' | 'hide'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'rank', title: 'ICS rank', sig: "f('a')" },
  { id: 'del', title: 'deleted', sig: 'draw(1.2)' },
  { id: 'boolp', title: 'ptr → bool', sig: 'f(p)' },
  { id: 'hide', title: 'hiding', sig: 'd.f(1)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function OverloadViz() {
  const [id, setId] = useState<Mode>('rank')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const ranked = i >= 2
  const rejected = (id === 'del' && i >= 2) || (id === 'hide' && i >= 3)
  const bounce = id === 'del' && i >= 2

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    const src = { x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 }
    const dst = { x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 }
    if (bounce) {
      setFrom(dst)
      setTo(src)
    } else {
      setFrom(src)
      setTo(dst)
    }
  }, [id, i, bounce])

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
    id === 'rank'
      ? i === 1
        ? "'a'"
        : 'int'
      : id === 'del'
        ? i === 1
          ? '1.2'
          : 'error'
        : id === 'boolp'
          ? i === 1
            ? 'p'
            : 'bool'
          : i === 1
            ? '1'
            : 'double'

  const leftName = id === 'rank' ? 'f(int)' : id === 'del' ? 'draw(int)' : id === 'boolp' ? 'f(int)' : 'B::f(int)'
  const rightName = id === 'rank' ? 'f(double)' : id === 'del' ? 'draw(double)' : id === 'boolp' ? 'f(bool)' : 'D::f(double)'
  const leftWin = id === 'rank' && ranked
  const rightWin = (id === 'del' && i >= 1) || (id === 'boolp' && ranked) || (id === 'hide' && ranked)
  const leftNote = leftWin
    ? 'exact / promotion'
    : id === 'rank'
      ? 'viable'
      : id === 'del'
        ? 'viable, unused'
        : id === 'boolp'
          ? 'no conversion'
          : 'hidden'
  const rightNote =
    id === 'del' && rejected
      ? '= delete wins'
      : id === 'boolp' && ranked
        ? 'ptr → bool'
        : id === 'hide' && ranked
          ? 'hides B::f'
          : id === 'rank'
            ? 'standard conv'
            : 'candidate'

  const code =
    id === 'rank'
      ? i < 2
        ? `void f(int);
void f(double);
f('a');`
        : `f('a');  // char → int  (promotion)
// not char → double (standard)`
      : id === 'del'
        ? i < 2
          ? `void draw(int);
void draw(double) = delete;
draw(1.2);`
          : `draw(1.2);  // deleted double wins
// then the program is ill-formed`
        : id === 'boolp'
          ? `void f(int);
void f(bool);
void* p = nullptr;
f(p);  // f(bool)  — pointer → bool`
          : i < 2
            ? `struct B { void f(int); };
struct D : B { void f(double); };
d.f(1);`
            : `d.f(1);  // D::f(double)
// B::f(int) is hidden, not overloaded`

  const caption =
    i === 0
      ? id === 'rank'
        ? 'Play f(\'a\'). Viable candidates, then ICS rank: identity beats promotion beats standard conversion beats user-defined. Ties are ill-formed.'
        : id === 'del'
          ? 'Play draw(1.2). A deleted overload still participates. If it wins, the call is an error — that is how you ban a conversion.'
          : id === 'boolp'
            ? 'Play f(p). A pointer converts to bool surprisingly well. That is why bool overloads next to pointer overloads are a footgun.'
            : 'Play d.f(1). Overloading in a derived class hides the base. You need a using B::f; to overload across the hierarchy.'
      : id === 'rank' && i === 1
        ? '\'a\' is char. Both f(int) and f(double) are viable. Ranking decides, not “closest type name.”'
        : id === 'rank' && i === 2
          ? 'char → int is a promotion. char → double is a standard conversion. Promotion wins. Identity would beat both.'
          : id === 'rank'
            ? 'f(int) is the best match. If two winners tie, the program is ill-formed — add a third overload or a cast.'
            : id === 'del' && i === 1
              ? '1.2 is double. Exact match on draw(double). draw(int) would need a standard conversion. Exact wins.'
              : id === 'del' && i === 2
                ? 'Deleted still wins. Participation is not “only if it would succeed.” The diagnostic is: deleted function.'
                : id === 'del'
                  ? 'Ill-formed. That is useful: delete the copy, delete the dangerous conversion. The winner is the one you banned.'
                  : id === 'boolp' && i === 1
                    ? 'p is void*. f(int) is not viable (no pointer-to-int). f(bool) is: any pointer converts to bool.'
                    : id === 'boolp' && i === 2
                      ? 'Standard conversion pointer → bool. There is no “null means skip.” You called f(true) if p is non-null.'
                      : id === 'boolp'
                        ? 'Prefer overloads that do not include bool next to pointers, or take nullptr_t / a tag type. nullptr is still a pointer here.'
                        : i === 1
                          ? '1 is int. Name lookup in D finds D::f and stops. B::f is not in the overload set unless you using-declare it.'
                          : i === 2
                            ? 'D::f(double) via int → double. A worse conversion than B::f(int) would have been — but B::f was never a candidate.'
                            : 'Hidden, not overloaded. using B::f; in D brings the int overload back into the set, then ranking applies.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = rejected ? 'ov-stage--reject' : leftWin || (rightWin && id !== 'del') ? 'ov-stage--win' : ''

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
          Play overload
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ov-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ov-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">arg</span>
            <span className="own-name">
              {id === 'rank' ? 'char' : id === 'del' ? 'double' : id === 'boolp' ? 'void*' : 'int'}
            </span>
            <span className="mem-val">
              {id === 'rank' ? "'a'" : id === 'del' ? '1.2' : id === 'boolp' ? 'p' : '1'}
            </span>
            <span className="mem-note">call site</span>
          </div>
          <div
            ref={id === 'rank' ? dstRef : undefined}
            className={`own-card${leftWin ? ' own-card--unique' : ''}${id !== 'rank' ? ' own-ctrl--ghost' : ''}`}
          >
            <span className="lf-tag">candidate</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-note">{leftNote}</span>
          </div>
          <div
            ref={id !== 'rank' ? dstRef : undefined}
            className={`own-card${rightWin && !rejected ? ' own-card--unique' : ''}${rejected ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">candidate</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{id === 'del' && rejected ? '= delete' : ranked ? 'best' : '—'}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse ov-flyer${rejected ? ' ov-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
