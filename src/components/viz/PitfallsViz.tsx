import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'parse' | 'slice' | 'ns' | 'div'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'parse', title: 'parse', sig: 'Widget w()' },
  { id: 'slice', title: 'slicing', sig: 'f(Base)' },
  { id: 'ns', title: 'using ns', sig: 'using namespace' },
  { id: 'div', title: '1/2', sig: '1 / 2' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function PitfallsViz() {
  const [id, setId] = useState<Mode>('parse')
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
  const bounce = (id === 'parse' && i >= 2) || (id === 'ns' && i >= 2)
  const trapped = i >= 2
  const won = false

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
    id === 'parse'
      ? i === 1
        ? 'w()'
        : 'object?'
      : id === 'slice'
        ? i === 1
          ? 'Derived'
          : 'by value'
        : id === 'ns'
          ? i === 1
            ? 'using'
            : 'header'
          : i === 1
            ? '1 / 2'
            : '0'

  const leftName =
    id === 'parse' ? 'source' : id === 'slice' ? 'Derived d' : id === 'ns' ? 'header.h' : 'ints'
  const leftVal =
    id === 'parse' ? 'Widget w()' : id === 'slice' ? 'extra fields' : id === 'ns' ? '#include' : '1 and 2'
  const midName =
    id === 'parse' ? 'parser' : id === 'slice' ? 'f(Base b)' : id === 'ns' ? 'std::' : 'operator/'
  const midVal =
    id === 'parse' && i >= 1
      ? 'function decl'
      : id === 'slice' && i >= 1
        ? i >= 2
          ? 'Base only'
          : 'copy'
        : id === 'ns' && i >= 1
          ? 'leaks names'
          : id === 'div' && i >= 1
            ? 'integer /'
            : '—'
  const midNote =
    id === 'parse' ? 'most vexing' : id === 'slice' ? 'by value' : id === 'ns' ? 'never here' : 'truncates'
  const rightName =
    id === 'parse' ? 'object' : id === 'slice' ? 'derived part' : id === 'ns' ? 'collision' : 'ratio'
  const rightVal =
    id === 'parse' && i >= 2
      ? 'none'
      : id === 'slice' && i >= 2
        ? 'dropped'
        : id === 'ns' && i >= 2
          ? 'ADL / macros'
          : id === 'div' && i >= 2
            ? '0'
            : '—'
  const rightNote =
    id === 'parse' && bounce
      ? 'use Widget w{}'
      : id === 'parse'
        ? 'looks like a ctor'
        : id === 'slice' && trapped
          ? 'pass Base&'
          : id === 'slice'
            ? 'virtuals gone'
            : id === 'ns' && bounce
              ? 'keep it local'
              : id === 'ns'
                ? 'in a .cpp maybe'
                : trapped
                  ? '1.0 / 2'
                  : 'not 0.5'

  const code =
    id === 'parse'
      ? i < 2
        ? `Widget w();     // function
// not a default-constructed Widget`
        : `Widget w();     // function declaration
Widget w{};     // object — C++11 brace-init
Widget w;       // also an object`
      : id === 'slice'
        ? i < 2
          ? `struct Base { int a; };
struct Derived : Base { int extra; };
void f(Base b);`
          : `void f(Base b);   // by value: slices
f(derived);        // extra is gone
void g(Base& b);   // keep the dynamic type`
        : id === 'ns'
          ? i < 2
            ? `// header.h — don’t
using namespace std;`
            : `// header.h
// using namespace std;  // never
// in .cpp, keep it local or don’t`
          : i < 2
            ? `int a = 1, b = 2;
int r = a / b;     // 0`
            : `int r = 1 / 2;           // 0
double q = 1.0 / 2;      // 0.5
double s = 1 / 2.0;      // 0.5`

  const caption =
    i === 0
      ? id === 'parse'
        ? 'Play parse. Widget w(); looks like a construction. It is a function declaration. Brace-init Widget w{} is an object.'
        : id === 'slice'
          ? 'Play slicing. f(Base) by value copies only the Base subobject. Virtuals and extra members vanish. Pass Base& or a pointer.'
          : id === 'ns'
            ? 'Play using ns. using namespace in a header dumps names into every translation unit that includes it. Never. In a .cpp, keep it local.'
            : 'Play 1/2. Integer division truncates toward zero. 1/2 is 0, not a ratio. Use a floating operand or a cast.'
      : id === 'parse' && i === 1
        ? 'w() hops at the parser. C++’s most vexing parse: anything that can be a declaration is one.'
        : id === 'parse' && i === 2
          ? 'You wanted an object. There is none. The name w is a function. Bounce. Widget w{} constructs.'
          : id === 'parse'
            ? 'Also: std::vector<int> v(std::istream_iterator<int>{in}, std::istream_iterator<int>{}); extra braces dodge the parse.'
            : id === 'slice' && i === 1
              ? 'Derived hops toward f. The parameter type is Base, by value. The call will copy a Base.'
              : id === 'slice' && i === 2
                ? 'extra is dropped. If speak() is virtual, b.speak() is Base::speak. Pass Base& or unique_ptr<Base>.'
                : id === 'slice'
                  ? 'Slicing is silent. A deleted Base copy constructor makes it a compile error — often the right fix for a polymorphic base.'
                  : id === 'ns' && i === 1
                    ? 'using namespace std hops into the header. Every include of this file now sees std names and any future ones.'
                    : id === 'ns' && i === 2
                      ? 'The leak bounces back as a collision: min/max macros, ADL surprises, another library’s size. Keep using-directives out of headers.'
                      : id === 'ns'
                        ? 'using std::string; in a .cpp is a narrower habit. using namespace in a header is a defect.'
                        : i === 1
                          ? '1 / 2 hops into integer division. Both operands are int. The result type is int.'
                          : i === 2
                            ? '0. Not 0.5. The compiler did exactly what the types asked. Cast one operand or write 1.0 / 2.'
                            : 'This is not UB. It is the wrong type. Same class of bug as mixing int milliseconds with a float dt.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'pf-stage--reject' : won ? 'pf-stage--win' : ''

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
          Play trap
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage pf-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="pf-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">written</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">meaning</span>
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
            className={`ptr-pulse pf-flyer${trapped || bounce ? ' pf-flyer--trap' : ''}`}
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
