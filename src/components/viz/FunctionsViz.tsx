import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'def' | 'virt' | 'inline' | 'hdr'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'def', title: 'default arg', sig: 'scale(x, factor = 2)' },
  { id: 'virt', title: 'virtual default', sig: 'p->f()  // n = 1' },
  { id: 'inline', title: 'inline', sig: 'inline int add' },
  { id: 'hdr', title: 'header def', sig: 'int add in .hpp' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function FunctionsViz() {
  const [id, setId] = useState<Mode>('def')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const filled = id === 'def' && i >= 2
  const dispatched = id === 'virt' && i >= 2
  const inlined = id === 'inline' && i >= 2
  const odr = id === 'hdr' && i >= 3

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
    id === 'def'
      ? i === 1
        ? '5'
        : '= 2'
      : id === 'virt'
        ? i === 1
          ? 'D::f'
          : 'n=1'
        : id === 'inline'
          ? 'add()'
          : i >= 3
            ? 'ODR'
            : 'add()'

  const code =
    id === 'def'
      ? i < 2
        ? `int scale(int x, int factor = 2);
scale(5);`
        : `scale(5);           // caller wrote one arg
scale(5, 2);        // what the compiler sees`
      : id === 'virt'
        ? i < 2
          ? `struct B { virtual void f(int n = 1); };
struct D : B { void f(int n = 2); };
B* p = &d;
p->f();`
          : `p->f();     // calls D::f
            // with n = 1  (B’s default)`
        : id === 'inline'
          ? `// a.cpp and b.cpp both include:
inline int add(int a, int b) { return a + b; }
// one definition, many TUs. Allowed.`
          : i < 3
            ? `// util.hpp — not inline
int add(int a, int b) { return a + b; }`
            : `// two TUs include it → two definitions
// linker error / ODR violation`

  const caption =
    i === 0
      ? id === 'def'
        ? 'Play scale(5). Default arguments are filled at the call site from the declaration the caller can see — not from the definition.'
        : id === 'virt'
          ? 'Play p->f(). Virtual dispatch picks the function. Default arguments still come from the static type of the call.'
          : id === 'inline'
            ? 'Play inline. inline means “this definition may appear in many TUs.” It is a hint to the inliner, not a command.'
            : 'Play a non-inline definition in a header. Each TU that includes it gets a definition. The linker then sees two.'
      : id === 'def' && i === 1
        ? '5 hops in as x. The second parameter is missing in the source. The declaration the caller saw has factor = 2.'
        : id === 'def' && i === 2
          ? '= 2 hops in. Filled at the call site. A different declaration (no default) would not fill it — the caller would have to pass 2.'
          : id === 'def'
            ? 'Defaults belong on one declaration, once. Put them on the first declaration callers include. Not on a later redecl, not on virtual overrides as a second policy.'
            : id === 'virt' && i === 1
              ? 'p has static type B*, dynamic type D. The vcall lands in D::f. That is override. override is C++11; this rule is older.'
              : id === 'virt' && i === 2
                ? 'n hops from B’s declaration: 1, not 2. Defaults are a compile-time property of the call expression, not of the final overrider.'
                : id === 'virt'
                  ? 'D::f(1) runs. People write D’s default as 2 and are shocked. Don’t default virtuals, or keep them identical.'
                  : id === 'inline' && i === 1
                    ? 'The same tokens hop into TU a. inline on a function (or a function template) is the ODR exception that makes headers work.'
                    : id === 'inline' && i === 2
                      ? 'The same tokens hop into TU b. Both may define add. The linker coalesces them. They must be token-identical.'
                      : id === 'inline'
                        ? 'A hint, not a command: the compiler may still emit a call. You wrote inline for the ODR, not for speed.'
                        : i === 1
                          ? 'The definition hops into TU a. Without inline, that is “the” definition of add.'
                          : i === 2
                            ? 'The same definition hops into TU b. Two definitions of a non-inline function. The One Definition Rule is already broken.'
                            : 'ODR / linker error. Put non-inline functions in a .cpp. Headers get inline, templates, or just a declaration.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = odr ? 'fn-stage--odr' : dispatched ? 'fn-stage--virt' : inlined ? 'fn-stage--ok' : ''

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

      <div ref={stageRef} className={`viz-stage fn-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="fn-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">
              {id === 'def' ? 'declaration' : id === 'virt' ? 'static B*' : id === 'inline' ? 'header' : 'util.hpp'}
            </span>
            <span className="own-name">
              {id === 'def' ? 'factor = 2' : id === 'virt' ? 'p' : 'add'}
            </span>
            <span className="mem-val">{id === 'virt' ? '&d' : id === 'def' ? 'caller sees this' : 'definition'}</span>
            <span className="mem-note">{id === 'virt' ? 'defaults from B' : id === 'inline' ? 'inline' : 'source'}</span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${filled || dispatched || inlined ? ' own-card--unique' : ''}${odr ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">
              {id === 'def' ? 'call' : id === 'virt' ? 'D::f' : i >= 2 ? 'TU b' : 'TU a'}
            </span>
            <span className="own-name">
              {id === 'def'
                ? filled
                  ? 'scale(5, 2)'
                  : i >= 1
                    ? 'scale(5, ?)'
                    : '—'
                : id === 'virt'
                  ? dispatched
                    ? 'f(1)  not 2'
                    : i >= 1
                      ? 'D::f'
                      : '—'
                  : odr
                    ? 'two definitions'
                    : inlined
                      ? 'same add()'
                      : i >= 1
                        ? 'one add()'
                        : '—'}
            </span>
            <span className="mem-note">
              {id === 'def' && filled
                ? 'filled at call site'
                : id === 'virt' && dispatched
                  ? 'static type’s default'
                  : odr
                    ? 'linker / ODR'
                    : inlined
                      ? 'allowed'
                      : 'waiting'}
            </span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse fn-flyer${odr ? ' fn-flyer--trap' : dispatched ? ' fn-flyer--virt' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
