import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'active' | 'pun' | 'bits' | 'cis'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'active', title: 'active', sig: 's.i = 1' },
  { id: 'pun', title: 'pun', sig: 's.f after s.i' },
  { id: 'bits', title: 'bits', sig: 'unsigned : 3' },
  { id: 'cis', title: 'prefix', sig: 'common initial' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function UnionViz() {
  const [id, setId] = useState<Mode>('active')
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
  const bounce = id === 'bits' && i >= 2
  const trapped = (id === 'active' && i >= 2) || (id === 'pun' && i >= 2) || bounce
  const won = id === 'cis' && i >= 2

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
    id === 'active'
      ? i === 1
        ? 's.i=1'
        : 's.f'
      : id === 'pun'
        ? i === 1
          ? 'float'
          : 'as int'
        : id === 'bits'
          ? i === 1
            ? ': 3'
            : '&field'
          : i === 1
            ? 'tag'
            : 'read tag'

  const leftName =
    id === 'active' ? 'write' : id === 'pun' ? 'float f' : id === 'bits' ? 'Bits' : 'struct A'
  const leftVal =
    id === 'active' ? 'int32 i' : id === 'pun' ? '1.0f' : id === 'bits' ? 'ready:1 kind:3' : 'tag + payload'
  const midName =
    id === 'active' ? 'union Slot' : id === 'pun' ? 'union pun' : id === 'bits' ? 'one word' : 'union U'
  const midVal =
    id === 'active' && i >= 1
      ? i >= 2
        ? 'i still active'
        : 'i live'
      : id === 'pun' && i >= 1
        ? 'same bytes'
        : id === 'bits' && i >= 1
          ? 'packed'
          : id === 'cis' && i >= 1
            ? 'A or B'
            : '—'
  const midNote =
    id === 'active' ? 'one member' : id === 'pun' ? 'not a pun' : id === 'bits' ? 'impl-defined' : 'standard-layout'
  const rightName =
    id === 'active' ? 'read f' : id === 'pun' ? 'int bits' : id === 'bits' ? 'address' : 'u.a.tag'
  const rightVal =
    id === 'active' && i >= 2
      ? 'UB'
      : id === 'pun' && i >= 2
        ? 'UB'
        : id === 'bits' && i >= 2
          ? 'ill-formed'
          : id === 'cis' && i >= 2
            ? 'ok'
            : '—'
  const rightNote =
    id === 'active' && trapped
      ? 'inactive member'
      : id === 'active'
        ? 'last write wins'
        : id === 'pun' && trapped
          ? 'memcpy the bits'
          : id === 'pun'
            ? 'C habit, not C++'
            : bounce
              ? 'no & of a bit-field'
              : id === 'bits'
                ? 'cannot take address'
                : won
                  ? 'shared prefix only'
                  : 'narrow blessing'

  const code =
    id === 'active'
      ? i < 2
        ? `union Slot {
  std::int32_t i;
  float f;
};
Slot s;
s.i = 1;           // i is active`
        : `s.i = 1;
float x = s.f;     // UB — f is not active
// assigning f would end i's lifetime`
      : id === 'pun'
        ? i < 2
          ? `union Pun { float f; std::uint32_t u; };
Pun p;
p.f = 1.0f;`
          : `p.f = 1.0f;
std::uint32_t u = p.u;          // UB in C++
std::uint32_t bits;
std::memcpy(&bits, &p.f, 4);   // C++14`
        : id === 'bits'
          ? i < 2
            ? `struct Bits {
  unsigned ready : 1;
  unsigned kind  : 3;
};`
            : `Bits b{};
unsigned* p = &b.kind;   // ill-formed
// layout / signedness: not a wire format`
          : i < 2
            ? `struct A { int tag; int a; };
struct B { int tag; float b; };
union U { A a; B b; };`
            : `U u;
u.a.tag = 1;
int t = u.b.tag;   // OK: common initial sequence
// only the shared prefix, and only
// standard-layout structs`

  const caption =
    i === 0
      ? id === 'active'
        ? 'Play active. A union holds one member at a time. The last write is the active member. Reading another is usually UB — not “the other type’s bits.”'
        : id === 'pun'
          ? 'Play pun. Inspecting a float’s bits through a union is a C habit. In C++14 copy the bytes with memcpy. C++20 adds bit_cast.'
          : id === 'bits'
            ? 'Play bits. unsigned kind : 3 packs three bits. Adjacent fields may pack. You cannot take the address of a bit-field. Layout is impl-defined.'
            : 'Play prefix. The common initial sequence of two standard-layout structs in a union is a narrow, standard-blessed way to read a shared tag.'
      : id === 'active' && i === 1
        ? 's.i = 1 hops in. i is the active member. Its lifetime started; f’s did not.'
        : id === 'active' && i === 2
          ? 's.f hops as a read. f is not active. UB in standard C++, even if your ABI overlays the bits. Assigning f would start f and end i.'
          : id === 'active'
            ? 'A union of non-trivial types needs you to start and end lifetimes by hand (placement new / explicit dtor). Prefer a struct with a tag, or variant in C++17.'
            : id === 'pun' && i === 1
              ? 'float f = 1.0f sits in the union. The object’s type is still float. The other member is not a window onto those bits.'
              : id === 'pun' && i === 2
                ? 'Reading the uint32_t member is UB. memcpy(&bits, &f, sizeof bits) is the C++14-blessed type pun. char* may inspect bytes too.'
                : id === 'pun'
                  ? 'Compilers sometimes “support” union punning as an extension. Do not write portable C++ that way. The optimizer may assume the inactive member is never read.'
                  : id === 'bits' && i === 1
                    ? ': 3 hops onto kind. Three bits of a word. Adjacent bit-fields may share a storage unit. Signedness of a plain int bit-field is impl-defined.'
                    : id === 'bits' && i === 2
                      ? '&b.kind bounces. There is no pointer to a 3-bit object. Pass the containing struct, or extract to an unsigned.'
                      : id === 'bits'
                        ? 'Do not ship a bit-field layout as a wire format. Pack with shifts and masks if the ABI must be stable.'
                        : i === 1
                          ? 'A and B share an int tag at offset 0. Both are standard-layout. The union overlay is the common initial sequence rule.'
                          : i === 2
                            ? 'Read u.b.tag after writing u.a.tag. That prefix read is defined. Reading u.b.b after writing u.a.a is not — different types past the prefix.'
                            : 'This is a small door, not a general pun. For a real sum type, C++17 std::variant carries the discriminator for you.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'un-stage--reject' : won ? 'un-stage--win' : ''

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
          Play union
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage un-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="un-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">storage</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">union</span>
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
            className={`ptr-pulse un-flyer${trapped || bounce ? ' un-flyer--trap' : ''}`}
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
