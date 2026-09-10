import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'firewall' | 'dtor' | 'moves' | 'abi'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'firewall', title: 'firewall', sig: 'unique_ptr<Impl>' },
  { id: 'dtor', title: 'dtor', sig: '~Widget() = default' },
  { id: 'moves', title: 'moves', sig: 'Widget(Widget&&)' },
  { id: 'abi', title: 'ABI', sig: 'sizeof(Widget)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function PimplViz() {
  const [id, setId] = useState<Mode>('firewall')
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
  const bounce = (id === 'dtor' && i >= 2) || (id === 'moves' && i === 2)
  const trapped = (id === 'dtor' && i >= 2) || (id === 'moves' && i === 2)
  const won =
    (id === 'firewall' && i >= 2) || (id === 'abi' && i >= 2) || (id === 'moves' && i >= 3)

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
    id === 'firewall'
      ? i === 1
        ? 'Impl'
        : '.cpp'
      : id === 'dtor'
        ? i === 1
          ? '~unique_ptr'
          : 'sizeof(Impl)'
        : id === 'moves'
          ? i === 1
            ? '~Widget'
            : i === 2
              ? 'move?'
              : 'default in .cpp'
          : i === 1
            ? 'int extra'
            : 'same sizeof'

  const leftName =
    id === 'firewall' ? 'widget.hpp' : id === 'dtor' ? 'header' : id === 'moves' ? 'header' : 'Widget'
  const leftVal =
    id === 'firewall'
      ? 'struct Impl; ptr'
      : id === 'dtor'
        ? '~Widget() = default'
        : id === 'moves'
          ? '~Widget();'
          : 'unique_ptr<Impl>'
  const midName =
    id === 'firewall' ? 'widget.cpp' : id === 'dtor' ? 'unique_ptr' : id === 'moves' ? 'C++14' : 'Impl'
  const midVal =
    id === 'firewall' && i >= 1
      ? 'Impl complete'
      : id === 'dtor' && i >= 1
        ? 'needs complete T'
        : id === 'moves' && i >= 1
          ? i >= 3
            ? 'moves declared'
            : 'dtor declared'
          : id === 'abi' && i >= 1
            ? '+ extra field'
            : '—'
  const midNote =
    id === 'firewall'
      ? 'clients never see n'
      : id === 'dtor'
        ? 'dtor runs delete'
        : id === 'moves'
          ? 'user dtor kills moves'
          : 'private layout'
  const rightName =
    id === 'firewall' ? 'client TU' : id === 'dtor' ? 'compile' : id === 'moves' ? 'Widget(Widget&&)' : 'sizeof'
  const rightVal =
    id === 'firewall' && i >= 2
      ? 'no rebuild'
      : id === 'dtor' && i >= 2
        ? 'ill-formed'
        : id === 'moves' && i >= 3
          ? 'defined'
          : id === 'moves' && i >= 2
            ? 'suppressed'
            : id === 'abi' && i >= 2
              ? 'one pointer'
              : '—'
  const rightNote =
    id === 'firewall' && won
      ? 'compilation firewall'
      : id === 'firewall'
        ? 'stable header'
        : bounce && id === 'dtor'
          ? 'Impl incomplete'
          : id === 'dtor'
            ? 'define in .cpp'
            : id === 'moves' && won
              ? 'declare, define later'
              : bounce
                ? 'implicit move gone'
                : id === 'moves'
                  ? 'C++14 rule'
                  : won
                    ? 'add fields freely'
                    : 'plus padding'

  const code =
    id === 'firewall'
      ? i < 2
        ? `// widget.hpp
class Widget {
  struct Impl;
  std::unique_ptr<Impl> impl_;
};`
        : `// widget.cpp
struct Widget::Impl { int n = 0; };
Widget::Widget() : impl_(std::make_unique<Impl>()) {}
void Widget::draw() const { /* impl_->n */ }
// client TUs do not recompile when n changes`
      : id === 'dtor'
        ? i < 2
          ? `// widget.hpp  — Impl is incomplete here
class Widget {
  ~Widget() = default;     // ill-formed
  std::unique_ptr<Impl> impl_;
};`
          : `// unique_ptr::~unique_ptr calls delete
// delete needs sizeof(Impl)
// ~Widget() = default; in the header
// instantiates that while Impl is incomplete

// widget.hpp:  ~Widget();
// widget.cpp:  Widget::~Widget() = default;`
        : id === 'moves'
          ? i < 3
            ? `class Widget {
  ~Widget();               // user-declared
  // C++14: implicit moves are suppressed
};`
            : `class Widget {
public:
  Widget();
  ~Widget();
  Widget(Widget&&) noexcept;
  Widget& operator=(Widget&&) noexcept;
  Widget(const Widget&) = delete;
  Widget& operator=(const Widget&) = delete;
};
// define the defaults in the .cpp`
          : i < 2
            ? `struct Widget::Impl { int n = 0; };
// sizeof(Widget) is one pointer`
            : `struct Widget::Impl { int n = 0; std::string s; };
// sizeof(Widget) still one pointer
// clients do not recompile`

  const caption =
    i === 0
      ? id === 'firewall'
        ? 'Play firewall. The public class holds unique_ptr<Impl>. Impl is defined only in the .cpp. Clients recompile when the public header changes, not when private members change.'
        : id === 'dtor'
          ? 'Play dtor. unique_ptr<Impl> in the header is fine only if ~Widget is defined in the .cpp after Impl is complete. Otherwise unique_ptr’s dtor cannot sizeof(Impl).'
          : id === 'moves'
            ? 'Play moves. A user-declared destructor suppresses implicit moves in C++14. Declare the destructor and the moves in the header; default them in the .cpp.'
            : 'Play ABI. The public object’s size stays one pointer. You can add Impl fields without changing sizeof(Widget). That is the stable ABI.'
      : id === 'firewall' && i === 1
        ? 'Impl hops into the .cpp. The header only forward-declares it. make_unique is C++14 — that is the allocation you pay, plus a pointer hop on every call.'
        : id === 'firewall' && i === 2
          ? 'The client TU does not see n. Change Impl and only widget.cpp rebuilds. That is the compilation firewall. Hot small value types should stay in the header instead.'
          : id === 'firewall'
            ? 'PIMPL is for big, stable façades (a Widget, a Client, a Parser). Passing one by value in a tight loop will show up in profiles.'
            : id === 'dtor' && i === 1
              ? '~unique_ptr hops. It will delete the Impl. That requires a complete type so the compiler knows how many bytes to destroy.'
              : id === 'dtor' && i === 2
                ? 'sizeof(Impl) bounces — Impl is still incomplete in the header. ~Widget() = default; here instantiates unique_ptr’s destructor too soon.'
                : id === 'dtor'
                  ? 'Declare ~Widget(); in the header. Define Widget::~Widget() = default; in the .cpp after struct Widget::Impl { … };'
                  : id === 'moves' && i === 1
                    ? '~Widget hops in as a user-declared destructor. In C++14 that suppresses the implicit move constructor and move assign.'
                    : id === 'moves' && i === 2
                      ? 'The implicit move bounces. Widget becomes copy-only (or ill-formed if copies are deleted). You meant to steal the unique_ptr.'
                      : id === 'moves'
                        ? 'Declare the moves in the header, default them in the .cpp next to the destructor. Copies are either deleted or written by hand.'
                        : i === 1
                          ? 'int extra hops into Impl. The public class still holds one unique_ptr. Padding may sit next to that pointer; the size does not grow with Impl.'
                          : i === 2
                            ? 'sizeof(Widget) stays one pointer. Add strings, containers, more fields — the client’s layout is unchanged. That is why PIMPL is an ABI firewall too.'
                            : 'You still pay an allocation and a hop. Do not PIMPL a type you pass by value in a hot loop.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'pi-stage--reject' : won ? 'pi-stage--win' : ''

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
          Play pimpl
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage pi-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="pi-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">public</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">impl</span>
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
            className={`ptr-pulse pi-flyer${trapped || bounce ? ' pi-flyer--trap' : ''}`}
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
