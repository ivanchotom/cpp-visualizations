import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'oob' | 'overflow' | 'uninit' | 'alias'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'oob', title: 'bounds', sig: 'a[i]' },
  { id: 'overflow', title: 'overflow', sig: 'INT_MAX + 1' },
  { id: 'uninit', title: 'uninit', sig: 'int x;' },
  { id: 'alias', title: 'aliasing', sig: 'reinterpret_cast' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function UbViz() {
  const [id, setId] = useState<Mode>('oob')
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
  const bounce = false
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
    setFrom(src)
    setTo(dst)
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
    id === 'oob'
      ? i === 1
        ? 'a[0]'
        : 'a[4]'
      : id === 'overflow'
        ? i === 1
          ? 'INT_MAX'
          : '+1'
        : id === 'uninit'
          ? i === 1
            ? 'int x'
            : 'read x'
          : i === 1
            ? 'float f'
            : 'as int*'

  const leftName =
    id === 'oob' ? 'index i' : id === 'overflow' ? 'signed int' : id === 'uninit' ? 'storage' : 'float f'
  const leftVal =
    id === 'oob' ? (i >= 2 ? '4' : i >= 1 ? '0' : '0…3') : id === 'overflow' ? 'INT_MAX' : id === 'uninit' ? 'no init' : '1.0f'
  const midName =
    id === 'oob' ? 'int a[4]' : id === 'overflow' ? 'n += 1' : id === 'uninit' ? 'int x;' : 'active type'
  const midVal =
    id === 'oob' && i >= 1
      ? i >= 2
        ? 'past end'
        : '{1,2,3,4}'
      : id === 'overflow' && i >= 1
        ? i >= 2
          ? 'signed overflow'
          : '2147483647'
        : id === 'uninit' && i >= 1
          ? 'indeterminate'
          : id === 'alias' && i >= 1
            ? 'float'
            : '—'
  const midNote =
    id === 'oob'
      ? 'valid: 0..3'
      : id === 'overflow'
        ? 'not wrap'
        : id === 'uninit'
          ? 'not zero'
          : 'last written'
  const rightName =
    id === 'oob' ? 'a[i]' : id === 'overflow' ? 'result' : id === 'uninit' ? 'int y = x' : 'int via &'
  const rightVal = i >= 2 ? 'UB' : '—'
  const rightNote =
    id === 'oob' && trapped
      ? 'no “last slot+1”'
      : id === 'oob'
        ? 'one-past is a pointer, not a read'
        : id === 'overflow' && trapped
          ? 'compiler may delete checks'
          : id === 'overflow'
            ? 'unsigned wraps; signed does not'
            : id === 'uninit' && trapped
              ? 'any bit pattern, or worse'
              : id === 'uninit'
                ? 'initialize at the declaration'
                : trapped
                  ? 'strict aliasing'
                  : 'memcpy the bits'

  const code =
    id === 'oob'
      ? i < 2
        ? `int a[4] = {1, 2, 3, 4};
int i = 0;
int ok = a[i];   // fine`
        : `int a[4] = {1, 2, 3, 4};
int i = 4;
int x = a[i];    // out of bounds: UB
// a+4 is a valid pointer; * (a+4) is not`
      : id === 'overflow'
        ? i < 2
          ? `int n = INT_MAX;
// n still 2147483647`
          : `int n = INT_MAX;
n += 1;          // signed overflow: UB
unsigned u = UINT_MAX;
u += 1;          // 0 — defined modulo 2^N`
        : id === 'uninit'
          ? i < 2
            ? `int x;           // not zero
// do not read yet`
            : `int x;
int y = x;       // uninitialized read: UB
int z = 0;       // this is the fix`
          : i < 2
            ? `float f = 1.0f;
// f's object is a float`
            : `float f = 1.0f;
int n = *reinterpret_cast<int*>(&f);  // UB
int bits;
std::memcpy(&bits, &f, sizeof bits);   // C++14`

  const caption =
    i === 0
      ? id === 'oob'
        ? 'Play bounds. a[0] is fine. a[4] is not “one past the last element you can read.” The compiler may assume the index is always in range and delete your if.'
        : id === 'overflow'
          ? 'Play overflow. Signed int overflow is undefined. Unsigned wrap is defined. “It wrapped on my machine” is not a contract.'
          : id === 'uninit'
            ? 'Play uninit. An automatic int with no initializer is not 0. Reading it is UB — sanitizers catch this; -O2 may invent nonsense.'
            : 'Play aliasing. The object is a float. Reading it through int* is a strict-aliasing violation. C++14 copies the bits with memcpy, not a union pun.'
      : id === 'oob' && i === 1
        ? 'i = 0 hops into a. The read is in range. So far the program has a defined value.'
        : id === 'oob' && i === 2
          ? 'i = 4 hops into a[4]. There is no element there. UB, not a crash you can catch, not “whatever is on the stack.”'
          : id === 'oob'
            ? 'UBsan: index 4 out of bounds for type int [4]. The optimizer may then assume i < 4 everywhere and delete a later check.'
            : id === 'overflow' && i === 1
              ? 'INT_MAX sits in n. The value is still in range. The next increment is the footgun.'
              : id === 'overflow' && i === 2
                ? '+1 hops in. For signed int that overflow is UB. The compiler may treat “n cannot be INT_MAX” as an invariant and drop your if (n + 1 < n).'
                : id === 'overflow'
                  ? 'unsigned is modulo 2^N. If you need wrap, use unsigned (or a documented saturating helper). Do not “test” signed overflow at -O0.'
                  : id === 'uninit' && i === 1
                    ? 'int x; The object exists. Its value does not. Stack leftover is a myth the abstract machine does not owe you.'
                    : id === 'uninit' && i === 2
                      ? 'read x hops into y. That is an uninitialized read. UB. Initialize at the declaration: int x = 0;'
                      : id === 'uninit'
                        ? 'MSan/UBsan report this. “It was zero in the debugger” is still UB. Brace-init: int x{};'
                        : i === 1
                          ? 'float f = 1.0f. The object’s type is float. char* / memcpy may inspect the bytes. int* may not.'
                          : i === 2
                            ? 'reinterpret_cast<int*>(&f) then load. Strict aliasing: the compiler may assume that store to f never aliases this int, and reorder or delete code.'
                            : 'std::memcpy(&bits, &f, sizeof bits) is the C++14-blessed type pun. C++20 adds bit_cast. Union punning is a C habit, not portable C++.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'ub-stage--reject' : won ? 'ub-stage--win' : ''

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
          Play UB
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ub-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ub-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">operand</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">object</span>
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
          <span className={`ptr-pulse ub-flyer${trapped ? ' ub-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
