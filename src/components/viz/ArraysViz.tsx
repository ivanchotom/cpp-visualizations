import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'decay' | 'array' | 'cstr'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'decay', title: 'T[N] decay', sig: 'void f(int p[])' },
  { id: 'array', title: 'std::array', sig: 'a.size()' },
  { id: 'cstr', title: 'C-string', sig: 'char s[]' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ArraysViz() {
  const [id, setId] = useState<Mode>('decay')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const called = i >= 1
  const sized = i >= 2
  const trap = id === 'decay' && i >= 3

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
  const cells = id === 'cstr' ? ['h', 'i', '\\0'] : ['1', '2', '3', '4']
  const srcBytes = id === 'cstr' ? 3 : 16
  const srcCount = cells.length
  const calleeIsPtr = id !== 'array' || i >= 3
  const calleeBytes = !called ? null : id === 'array' && i < 3 ? 16 : 8
  const calleeCount = !called
    ? null
    : id === 'array'
      ? 4
      : id === 'cstr' && sized
        ? 'until \\0'
        : trap
          ? '2??'
          : '?'
  const calleeLabel = id === 'array' && i < 3 ? 'std::array copy' : id === 'cstr' ? 'char* p' : 'int* p'

  const code =
    id === 'decay'
      ? i === 0
        ? `int a[4] = {1, 2, 3, 4};\n// sizeof(a) == 16`
        : i === 1
          ? `void f(int p[]);  // same as int*\nf(a);             // decays`
          : i === 2
            ? `void f(int* p) {\n  sizeof(p);   // 8 on LP64\n}`
            : `sizeof(p) / sizeof(*p);  // 8/4 = 2  ← lie`
      : id === 'array'
        ? i === 0
          ? `std::array<int, 4> a{{1, 2, 3, 4}};\n// a.size() == 4, sizeof 16`
          : i === 1
            ? `void take(std::array<int, 4> x);\ntake(a);  // copy, length travels`
            : i === 2
              ? `x.size();     // still 4\nsizeof(x);    // still 16`
              : `takePtr(a.data(), a.size());\n// pointer + length, on purpose`
        : i === 0
          ? `char s[] = "hi";  // {'h','i','\\0'}`
          : i === 1
            ? `void g(char* p);\ng(s);  // decays, length is the '\\0'`
            : i === 2
              ? `// p has no size. Walk until '\\0'.`
              : `Prefer std::string. strcpy overflows.`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play f(a). A built-in array is a raw block. The length lives only in the type T[N].'
        : id === 'array'
          ? 'Play take(a). std::array is a thin aggregate around T[N] that can be copied and knows its size.'
          : 'Play g(s). A C-string is a char array that happens to end in a zero byte. That byte is the only length.'
      : id === 'decay' && i === 1
        ? 'Cyan address hops. a decays to int* at the call. The four cells stay; the callee never sees N.'
        : id === 'decay' && i === 2
          ? 'sizeof(p) is the pointer, 8 on LP64. The 16-byte block is still on the caller. Length is gone.'
          : id === 'decay'
            ? 'sizeof(p)/sizeof(*p) looks like an element count. It is 2. That is the decay trap — pass n, or use std::array.'
            : id === 'array' && i === 1
              ? 'The whole object hops. Four ints plus the size travel together. No decay unless you call .data().'
              : id === 'array' && i === 2
                ? 'Callee still has .size() == 4. That is why std::array is the fixed buffer you actually want.'
                : id === 'array'
                  ? 'Need a C API? takePtr(a.data(), a.size()). You hand the length over on purpose — it is not implicit.'
                  : i === 1
                    ? 's decays to char*. The three cells stay; the callee gets an address and a hunt for \\0.'
                    : i === 2
                      ? 'No sizeof trick works. Length is a convention. Miss the terminator and you walk off the end.'
                      : 'strcpy / sprintf write past the zero. Prefer std::string, or snprintf when an API demands char*.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const flyerText = id === 'array' && i === 1 ? '{1,2,3,4}' : id === 'array' && i >= 3 ? 'data()+n' : '&a[0]'

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

      <div
        ref={stageRef}
        className={`viz-stage ar-stage viz-stage--live${trap && id === 'decay' ? ' ar-stage--trap' : ''}${id === 'array' ? ' viz-stage--copy' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ar-row">
          <div ref={srcRef} className="own-card own-card--unique">
            <span className="lf-tag">caller</span>
            <span className="own-name">{id === 'cstr' ? 's' : 'a'}</span>
            <div className="ar-cells">
              {cells.map((c) => (
                <span key={c} className={`ar-cell${c === '\\0' ? ' ar-cell--nul' : ''}`}>
                  {c}
                </span>
              ))}
            </div>
            <span className="ar-size">
              sizeof {srcBytes} · N={srcCount}
            </span>
          </div>
          <div
            ref={dstRef}
            className={`own-card${called ? (calleeIsPtr ? ' own-card--shared' : ' own-card--unique') : ''}${trap && id === 'decay' ? ' ar-card--trap' : ''}`}
          >
            <span className="lf-tag">callee</span>
            <span className="own-name">{called ? (id === 'array' && i < 3 ? 'x' : 'p') : '—'}</span>
            {called ? (
              calleeIsPtr ? (
                <span className="ar-ptr">{id === 'cstr' ? 'char*' : 'int*'}</span>
              ) : (
                <div className="ar-cells">
                  {cells.map((c) => (
                    <span key={c} className={`ar-cell${c === '\\0' ? ' ar-cell--nul' : ''}`}>
                      {c}
                    </span>
                  ))}
                </div>
              )
            ) : (
              <span className="mem-val">not called</span>
            )}
            {called && (
              <span className="ar-size">
                {calleeBytes === null ? '' : `sizeof ${calleeBytes}`}
                {calleeCount !== null ? ` · N=${calleeCount}` : ''}
              </span>
            )}
            {called && <span className="mem-note">{calleeLabel}</span>}
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse ${id === 'array' && (i === 1 || i >= 3) ? 'ar-flyer' : 'ptr-pulse--p'}`} style={{ left: pos.x, top: pos.y }}>
            {id === 'array' && (i === 1 || i >= 3) ? flyerText : '&'}
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
