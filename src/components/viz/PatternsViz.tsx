import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'raii' | 'own' | 'auto' | 'ret'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'raii', title: 'RAII', sig: '~File()' },
  { id: 'own', title: 'own', sig: 'unique_ptr<T>' },
  { id: 'auto', title: 'auto', sig: 'auto x = v[i]' },
  { id: 'ret', title: 'return', sig: 'return local' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function PatternsViz() {
  const [id, setId] = useState<Mode>('raii')
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
  const bounce = (id === 'auto' && i >= 2) || (id === 'ret' && i >= 3)
  const trapped = (id === 'auto' && i >= 2) || (id === 'ret' && i >= 3)
  const won = (id === 'raii' && i >= 2) || (id === 'own' && i >= 2) || (id === 'ret' && i >= 2 && i < 3)

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
    id === 'raii'
      ? i === 1
        ? 'fopen'
        : '~File'
      : id === 'own'
        ? i === 1
          ? 'unique_ptr'
          : 'steal'
        : id === 'auto'
          ? i === 1
            ? 'v[i]'
            : 'copy'
          : i === 1
            ? 'local'
            : i === 2
              ? 'return'
              : 'std::move'

  const leftName =
    id === 'raii' ? 'scope' : id === 'own' ? 'caller' : id === 'auto' ? 'vector' : 'local s'
  const leftVal =
    id === 'raii' ? 'File f(path)' : id === 'own' ? 'make_unique<T>' : id === 'auto' ? 'v[i]' : 'string s'
  const midName =
    id === 'raii' ? 'File' : id === 'own' ? 'signature' : id === 'auto' ? 'auto x' : 'return'
  const midVal =
    id === 'raii' && i >= 1
      ? 'owns FILE*'
      : id === 'own' && i >= 1
        ? 'transfer'
        : id === 'auto' && i >= 1
          ? 'deduced T'
          : id === 'ret' && i >= 1
            ? i >= 3
              ? 'std::move(s)'
              : 'by value'
            : '—'
  const midNote =
    id === 'raii'
      ? 'dtor on every path'
      : id === 'own'
        ? 'T const& borrows'
        : id === 'auto'
          ? 'not const auto&'
          : 'NRVO or move'
  const rightName =
    id === 'raii' ? 'fclose' : id === 'own' ? 'callee' : id === 'auto' ? 'x' : 'caller'
  const rightVal =
    id === 'raii' && i >= 2
      ? 'released'
      : id === 'own' && i >= 2
        ? 'owns T'
        : id === 'auto' && i >= 2
          ? 'expensive copy'
          : id === 'ret' && i >= 2 && i < 3
            ? 'moved / elided'
            : id === 'ret' && i >= 3
              ? 'NRVO inhibited'
              : '—'
  const rightNote =
    id === 'raii' && won
      ? 'including throw'
      : id === 'raii'
        ? 'RAII'
        : id === 'own' && won
          ? 'unique_ptr in, unique_ptr out'
          : id === 'own'
            ? 'T* often nullable'
            : bounce && id === 'auto'
              ? 'write the type if it matters'
              : id === 'auto'
                ? 'hides a copy'
                : id === 'ret' && i >= 3
                  ? 'do not move a returned local'
                  : won
                    ? 'let the compiler'
                    : 'return by value'

  const code =
    id === 'raii'
      ? `class File {
public:
  explicit File(const char* path)
      : handle_(std::fopen(path, "r")) {}
  ~File() { if (handle_) std::fclose(handle_); }
  File(const File&) = delete;
  File& operator=(const File&) = delete;
private:
  std::FILE* handle_;
};`
      : id === 'own'
        ? i < 2
          ? `std::unique_ptr<T> make();          // transfer
void peek(const T&);                 // borrow
void maybe(T*);                      // nullable borrow`
          : `auto p = std::make_unique<Widget>();
take(std::move(p));                  // steal
// p is empty; callee owns`
        : id === 'auto'
          ? i < 2
            ? `std::vector<std::string> v;
auto x = v[i];         // copy
const auto& y = v[i];  // borrow`
            : `auto x = v[i];         // string copy — often a bug
const auto& y = v[i];  // still write the type
                       // when it documents a contract`
          : i < 3
            ? `std::string f() {
  std::string s = "ok";
  return s;            // move or NRVO
}`
            : `std::string f() {
  std::string s = "ok";
  return std::move(s); // inhibits NRVO
}`

  const caption =
    i === 0
      ? id === 'raii'
        ? 'Play RAII. Lifetime of a resource = lifetime of an object. Destructors run on throw. That is not a decoration — it is how C++14 holds a file, a lock, a socket.'
        : id === 'own'
          ? 'Play own. unique_ptr<T> in a signature means transfer. T const& means borrow. T* often means nullable borrow. The type is the contract.'
          : id === 'auto'
            ? 'Play auto. Deduce from the initializer. auto x = v[i] copies an element. const auto& borrows. Write the type when it documents a contract.'
            : 'Play return. Return locals by value; let the compiler move or elide. std::move on a returned local can inhibit NRVO.'
      : id === 'raii' && i === 1
        ? 'fopen hops into File. The FILE* is not a public handle. Copies are deleted so two Files cannot fclose the same pointer.'
        : id === 'raii' && i === 2
          ? '~File hops and fclose runs. Scope exit, return, and throw all go through the destructor. Do not throw from that destructor.'
          : id === 'raii'
            ? 'lock_guard, unique_ptr, fstream, and vector are the same idea. A class that holds a raw resource must be Rule of Five, or it leaks on copy.'
            : id === 'own' && i === 1
              ? 'unique_ptr hops as the return type of make. The caller receives ownership. peek(const T&) would not steal.'
              : id === 'own' && i === 2
                ? 'steal hops into the callee. std::move is the spelling of “I am done with this unique_ptr.” The source is empty afterwards.'
                : id === 'own'
                  ? 'T* in a signature is the fuzzy one: nullable, no ownership, or an array. Prefer span-like types later; in C++14 write the comment or a not_null policy.'
                  : id === 'auto' && i === 1
                    ? 'v[i] hops into auto x. The initializer is a string (or a proxy). auto decays like T by value. That is a copy of a potentially fat object.'
                    : id === 'auto' && i === 2
                      ? 'The copy lands. Often a bug in a loop. const auto& y = v[i] borrows. Still write vector<string>::value_type when the type is the point.'
                      : id === 'auto'
                        ? 'auto that hides an expensive copy is the usual complaint. auto that hides int is fine. Use auto when the right-hand side already says the type.'
                        : i === 1
                          ? 'local s hops as a named automatic. Returning it by value is the C++11/14 default: move, or elide the copy entirely (NRVO).'
                          : i === 2
                            ? 'return s hops to the caller. Named Return Value Optimization may construct s directly in the caller. std::move is not required.'
                            : 'std::move(s) on the return bounces. The compiler is no longer allowed to elide. You made it slower. Write return s;'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'pa-stage--reject' : won ? 'pa-stage--win' : ''

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
          Play idiom
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage pa-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="pa-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">site</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">op</span>
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
            className={`ptr-pulse pa-flyer${trapped || bounce ? ' pa-flyer--trap' : ''}`}
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
