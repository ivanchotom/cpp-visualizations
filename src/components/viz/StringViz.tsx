import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'plus' | 'sso' | 'cstr' | 'reserve'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'plus', title: 's + x', sig: 's = s + x' },
  { id: 'sso', title: 'SSO', sig: 's = "hi"' },
  { id: 'cstr', title: 'c_str', sig: 'p = s.c_str()' },
  { id: 'reserve', title: 'reserve', sig: 's.reserve(64)' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function StringViz() {
  const [id, setId] = useState<Mode>('plus')
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
  const bounce = id === 'cstr' && i >= 3
  const trapped = (id === 'plus' && i >= 2 && i < 3) || (id === 'cstr' && i >= 2)
  const won = (id === 'plus' && i >= 3) || (id === 'sso' && i === 1) || (id === 'reserve' && i >= 2)

  const useRight =
    (id === 'plus' && i >= 2) ||
    (id === 'sso' && i >= 2) ||
    (id === 'cstr' && i >= 2) ||
    (id === 'reserve' && i >= 2)

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
    id === 'plus'
      ? i === 1
        ? '"ab"'
        : i === 2
          ? 'copy all'
          : '+='
      : id === 'sso'
        ? i === 1
          ? '"hi"'
          : 'heap'
        : id === 'cstr'
          ? i === 1
            ? 'p'
            : i === 2
              ? 'realloc'
              : 'dangle'
          : i === 1
            ? 'reserve'
            : '+='

  const leftName = 'std::string s'
  const leftVal =
    id === 'plus'
      ? i >= 3
        ? '"abc"'
        : '"ab"'
      : id === 'sso'
        ? i >= 2
          ? '"a long string…"'
          : '"hi"'
        : id === 'cstr'
          ? i >= 2
            ? 'grew'
            : '"hello"'
          : i >= 1
            ? 'cap 64'
            : 'cap 0'
  const midName =
    id === 'plus' ? 's + x' : id === 'sso' ? 'inline SSO' : id === 'cstr' ? 'const char* p' : 'capacity'
  const midVal =
    id === 'plus' && i >= 1
      ? 'new string'
      : id === 'sso' && i === 1
        ? 'in the object'
        : id === 'cstr' && i >= 1
          ? i >= 2
            ? 'stale'
            : '&buf[0]'
          : id === 'reserve' && i >= 1
            ? '64'
            : '—'
  const midNote =
    id === 'plus'
      ? 'always allocates a result'
      : id === 'sso'
        ? 'implementation-defined size'
        : id === 'cstr'
          ? 'points into s'
          : 'paid up front'
  const rightName =
    id === 'plus' ? 's += x' : id === 'sso' ? 'heap buffer' : id === 'cstr' ? 's += "…"' : 'append'
  const rightVal =
    id === 'plus' && i >= 3
      ? 'one buffer'
      : id === 'sso' && i >= 2
        ? 'allocated'
        : id === 'cstr' && i >= 2
          ? 'new buf'
          : id === 'reserve' && i >= 2
            ? 'no realloc'
            : '—'
  const rightNote =
    id === 'plus' && i >= 3
      ? 'append in place'
      : id === 'plus'
        ? 'loops go quadratic'
        : id === 'sso' && i >= 2
          ? 'too big for SSO'
          : id === 'sso'
            ? 'long strings leave'
            : id === 'cstr' && i >= 2
              ? 'p is dangling'
              : id === 'cstr'
                ? 'may reallocate'
                : 'then += is cheap'

  const code =
    id === 'plus'
      ? i < 3
        ? `std::string s = "ab";
s = s + "c";   // new string, copy all
s = s + "d";   // again`
        : `s += "c";
s.append("d");
// or reserve, then += in a loop`
      : id === 'sso'
        ? `std::string a = "hi";      // often inline
std::string b = "a long string…";
// SSO size is implementation-defined`
        : id === 'cstr'
          ? i < 2
            ? `const char* p = s.c_str();
// p points at s’s buffer, always \\0`
            : `s += "........";  // may realloc
// p dangles. Hold a string, not a pointer.`
          : `std::string s;
s.reserve(64);
s += "id=";
s += std::to_string(42);`

  const caption =
    i === 0
      ? id === 'plus'
        ? 'Play s = s + x. Each + builds a new string and copies the old characters. In a loop that is quadratic. Prefer += / append / reserve.'
        : id === 'sso'
          ? 'Play SSO. Short strings often live inside the object — no heap. The threshold is implementation-defined. Do not write code that depends on the exact size.'
          : id === 'cstr'
            ? 'Play c_str(). It is cheap because std::string already keeps a terminating \\0. The pointer is into s — a later mutation that reallocates dangles it.'
            : 'Play reserve. size() is length; capacity() is allocated. reserve() is how you avoid repeated growth when you know the bound.'
      : id === 'plus' && i === 1
        ? '"ab" is copied into a brand-new string, then "c" is appended there. The old s is then replaced.'
        : id === 'plus' && i === 2
          ? 'Do it again and you copy "abc". n appends via + copy ~ n² characters. That is the loop bug.'
          : id === 'plus'
            ? '+= / append write into the existing buffer when capacity allows. reserve first if you know the final size.'
            : id === 'sso' && i === 1
              ? '"hi" stays in the object. Small-string optimization. c_str() still works — the \\0 is in that inline buffer.'
              : id === 'sso' && i === 2
                ? 'A long string hops to the heap. The object now holds a pointer. SSO did not fail; the string just outgrew it.'
                : id === 'sso'
                  ? 'std::string is bytes, not glyphs. length() is char count, not UTF-8 code points. Encoding is a convention in C++14.'
                  : id === 'cstr' && i === 1
                    ? 'p = s.c_str(). Valid until s dies or mutates in a way that reallocates (or you call a non-const mutator).'
                    : id === 'cstr' && i === 2
                      ? 's += more. If capacity was tight, the buffer moves. p still holds the old address.'
                      : id === 'cstr'
                        ? 'Dangling. Keep the std::string (or copy). string_view in C++17 has the same lifetime trap — the view does not own.'
                        : i === 1
                          ? 'reserve(64) allocates once. size is still 0. Capacity is 64 (or more).'
                          : i === 2
                            ? '+= now writes in place. No new buffer, no iterator invalidation from growth.'
                            : 'to_string(42) is C++11. Build text with reserve + +=, not a chain of + in a loop.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped || bounce ? 'st-stage--reject' : won ? 'st-stage--win' : ''

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
          Play string
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage st-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="st-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">s</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">owns the buffer</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">{id === 'cstr' ? 'ptr' : 'op'}</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped || bounce ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">{id === 'cstr' ? 'mut' : 'alt'}</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse st-flyer${trapped || bounce ? ' st-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
