import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'swap' | 'stream' | 'friend' | 'parens'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'swap', title: 'swap', sig: 'swap(a, b)' },
  { id: 'stream', title: 'stream', sig: 'cout << x' },
  { id: 'friend', title: 'friend', sig: 'operator==' },
  { id: 'parens', title: 'parens', sig: '(std::min)(a, b)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function AdlViz() {
  const [id, setId] = useState<Mode>('swap')
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
  const bounce = id === 'parens' && i >= 2
  const trapped = id === 'parens' && i >= 2
  const won = (id === 'swap' && i >= 2) || (id === 'stream' && i >= 2) || (id === 'friend' && i >= 2)

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
    id === 'swap'
      ? i === 1
        ? 'using'
        : 'swap'
      : id === 'stream'
        ? i === 1
          ? 'cout'
          : '<<'
        : id === 'friend'
          ? i === 1
            ? 'a == b'
            : 'ADL'
          : i === 1
            ? 'std::min'
            : 'N::min'

  const leftName =
    id === 'swap' ? 'N::Item' : id === 'stream' ? 'ostream' : id === 'friend' ? 'Item' : 'call site'
  const leftVal =
    id === 'swap' ? 'a, b' : id === 'stream' ? 'std::cout' : id === 'friend' ? 'hidden ==' : 'qualified'
  const midName =
    id === 'swap' ? 'lookup' : id === 'stream' ? 'operator<<' : id === 'friend' ? 'ordinary' : 'std::'
  const midVal =
    id === 'swap' && i >= 1
      ? 'using + ADL'
      : id === 'stream' && i >= 1
        ? 'ns std'
        : id === 'friend' && i >= 1
          ? 'not visible'
          : id === 'parens' && i >= 1
            ? 'no ADL'
            : '—'
  const midNote =
    id === 'swap' ? 'two-step idiom' : id === 'stream' ? 'associated ns' : id === 'friend' ? 'not in scope' : 'parens kill ADL'
  const rightName =
    id === 'swap' ? 'N::swap' : id === 'stream' ? 'std::<<' : id === 'friend' ? 'hidden friend' : 'user min'
  const rightVal =
    id === 'swap' && i >= 2
      ? 'picked'
      : id === 'stream' && i >= 2
        ? 'found'
        : id === 'friend' && i >= 2
          ? 'found'
          : id === 'parens' && i >= 2
            ? 'skipped'
            : '—'
  const rightNote =
    id === 'swap' && won
      ? 'better than std::swap'
      : id === 'swap'
        ? 'associated ns of Item'
        : id === 'stream' && won
          ? 'why << works'
          : id === 'stream'
            ? 'Koenig lookup'
            : id === 'friend' && won
              ? 'ADL only'
              : id === 'friend'
                ? 'compare two Items'
                : bounce
                  ? 'that is the point'
                  : 'or min<int>'

  const code =
    id === 'swap'
      ? i < 2
        ? `namespace N {
  struct Item {};
  void swap(Item&, Item&);
}`
        : `void f(N::Item a, N::Item b) {
  using std::swap;
  swap(a, b);          // ADL may pick N::swap
}
// std::swap(a, b);    // skips N::swap`
      : id === 'stream'
        ? `std::cout << x;
// unqualified operator<<
// ADL searches namespace std
// because cout's type lives there`
        : id === 'friend'
          ? i < 2
            ? `struct Item {
  friend bool operator==(Item, Item) { return true; }
};`
            : `Item a, b;
bool ok = a == b;     // ADL finds the friend
// operator==(a, b) as a free name
// in this scope? no — hidden`
          : i < 2
            ? `int a = 1, b = 2;
int m = (std::min)(a, b);`
            : `int m = (std::min)(a, b);  // no ADL
std::min<int>(a, b);        // no ADL
// also dodges Windows.h min/max`

  const caption =
    i === 0
      ? id === 'swap'
        ? 'Play swap. using std::swap; then swap(a, b); lets ADL pick a better N::swap for Item. Qualifying std::swap(a, b) skips it.'
        : id === 'stream'
          ? 'Play stream. std::cout << x finds operator<< in namespace std because ADL searches the namespaces of the argument types. That is Koenig lookup.'
          : id === 'friend'
            ? 'Play friend. friend operator== defined inside the class is not visible to ordinary lookup. ADL finds it when you compare two objects of that type.'
            : 'Play parens. (std::min)(a, b) or std::min<int>(a, b) suppress ADL. Useful around Windows min/max macros too.'
      : id === 'swap' && i === 1
        ? 'using std::swap hops into the overload set. Ordinary lookup now sees std::swap. That is not the whole set.'
        : id === 'swap' && i === 2
          ? 'swap(a, b) hops to N::swap. Item’s associated namespace is N. ADL adds N::swap. The two-step idiom is how you write a generic swap.'
          : id === 'swap'
            ? 'std::swap(a, b) with qualification never considers N::swap. If Item is expensive to move, you just called the wrong function.'
            : id === 'stream' && i === 1
              ? 'cout hops in. Its type is std::ostream, associated namespace std. Unqualified << is a function call in disguise.'
              : id === 'stream' && i === 2
                ? '<< hops into std::operator<<. That is why the insertion operators live next to the stream types. Your type’s << should live next to your type.'
                : id === 'stream'
                  ? 'A using namespace std plus ADL can make the overload set enormous. Prefer using-declarations, or qualify when you mean a specific function.'
                  : id === 'friend' && i === 1
                    ? 'a == b hops. Ordinary lookup in this scope does not see the friend. The name is hidden on purpose.'
                    : id === 'friend' && i === 2
                      ? 'ADL searches Item’s namespace (and the class itself for friends). The hidden friend is found. That keeps == out of other overload sets.'
                      : id === 'friend'
                        ? 'Hidden friends are the usual C++11 spelling for operator==. They are not a C++20 invention; C++20 just generates them.'
                        : i === 1
                          ? '(std::min) hops as a parenthesized id-expression. That is not an unqualified function call, so ADL does not run.'
                          : i === 2
                            ? 'N::min is skipped. If a macro named min exists, the parens also stop expansion. std::min<int> is the other ADL kill-switch.'
                            : 'Unqualified begin/end on a mix of arrays and containers is another ADL footgun — std::begin is the portable one.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'ad-stage--reject' : won ? 'ad-stage--win' : ''

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
          Play ADL
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ad-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ad-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">arguments</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">lookup</span>
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
            className={`ptr-pulse ad-flyer${trapped || bounce ? ' ad-flyer--trap' : ''}`}
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
