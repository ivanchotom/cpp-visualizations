import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { centerOf, hop, waitNextBeat, type Point } from './motion.ts'

interface Frame {
  kind: 'single' | 'multi' | 'diamond' | 'virtual'
  rows: { label: string; tag: 'base' | 'mid' | 'derived' | 'shared' | 'dup' }[]
  hopLabel: string | null
  hint: string
  code: string
}

const FRAMES: Frame[] = [
  {
    kind: 'single',
    rows: [
      { label: 'vptr + Base members', tag: 'base' },
      { label: 'Derived members', tag: 'derived' },
    ],
    hopLabel: 'D*',
    hint: 'Public inheritance is is-a. One Base subobject. Derived* converts to Base* with no address tweak.',
    code: `struct Base { virtual ~Base() = default; };
struct D : Base {};
D obj;
Base* b = &obj;  // same address`,
  },
  {
    kind: 'multi',
    rows: [
      { label: 'vptr + BaseA', tag: 'base' },
      { label: 'vptr + BaseB', tag: 'mid' },
      { label: 'Derived members', tag: 'derived' },
    ],
    hopLabel: 'D*→B*',
    hint: 'Two base subobjects, two vptrs if both are polymorphic. D* → BaseB* adjusts the address.',
    code: `struct D : BaseA, BaseB {};
D obj;
BaseB* b = &obj;  // pointer offset`,
  },
  {
    kind: 'diamond',
    rows: [
      { label: 'Base (via A)', tag: 'dup' },
      { label: 'A extra', tag: 'mid' },
      { label: 'Base (via B)', tag: 'dup' },
      { label: 'B extra', tag: 'mid' },
      { label: 'Derived', tag: 'derived' },
    ],
    hopLabel: 'Base×2',
    hint: 'Non-virtual diamond: two Base subobjects. Naming a Base member is ambiguous. Almost never what you wanted.',
    code: `struct A : Base {};
struct B : Base {};
struct D : A, B {};  // two Bases`,
  },
  {
    kind: 'virtual',
    rows: [
      { label: 'A (vbptr)', tag: 'mid' },
      { label: 'B (vbptr)', tag: 'mid' },
      { label: 'Derived extra', tag: 'derived' },
      { label: 'shared Base', tag: 'shared' },
    ],
    hopLabel: 'Base',
    hint: 'virtual Base: one Base, constructed by the most-derived class. vbptrs locate it. Heavier layout, correct is-a.',
    code: `struct A : virtual Base {};
struct B : virtual Base {};
struct D : A, B {};  // one Base`,
  },
]

const STEP_MS = 1400
const HOP_MS = 720

export function InheritanceViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 40 })
  const [to, setTo] = useState<Point>({ x: 80, y: 140 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const f = FRAMES[Math.min(i, FRAMES.length - 1)]

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(srcRef.current, origin))
    setTo(centerOf(dstRef.current, origin))
  }, [i])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stop = waitNextBeat(STEP_MS, () => {
      if (i >= FRAMES.length - 1) {
        setPlaying(false)
        setHopT(1)
        return
      }
      setI(i + 1)
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stop()
    }
  }, [playing, i])

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = hopT < 1 ? hop(from, to, hopT) : null
  const titles: Record<Frame['kind'], string> = {
    single: 'Single',
    multi: 'Multiple',
    diamond: 'Diamond',
    virtual: 'Virtual diamond',
  }

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play single then diamond then virtual
        </button>
        {FRAMES.map((k, idx) => (
          <button
            key={k.kind}
            className={`chip${i === idx ? ' chip--active' : ''}`}
            onClick={() => {
              if (playing) return
              setI(idx)
              setHopT(1)
            }}
            disabled={playing}
          >
            {titles[k.kind]}
          </button>
        ))}
        <button
          className="chip chip--ghost"
          onClick={() => {
            setPlaying(false)
            setI(0)
            setHopT(1)
          }}
        >
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage inh-stage viz-stage--live inh-stage--${f.kind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{FRAMES.length} · {titles[f.kind]}
        </p>
        <div className="lf-beats" aria-hidden>
          {FRAMES.map((_, n) => (
            <span
              key={n}
              className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${n === 2 ? ' lf-beat--dtor' : ''}`}
            />
          ))}
        </div>
        <div ref={srcRef} className="inh-call">
          <span className="tpl-kicker">most-derived</span>
          <code>D obj;</code>
        </div>
        <div className="inh-stack">
          {f.rows.map((row, idx) => {
            const isDst =
              (f.kind === 'single' && row.tag === 'base') ||
              (f.kind === 'multi' && row.tag === 'mid') ||
              (f.kind === 'diamond' && row.tag === 'dup' && idx === 2) ||
              (f.kind === 'virtual' && row.tag === 'shared')
            return (
              <div
                key={`${f.kind}-${row.label}`}
                ref={isDst ? dstRef : undefined}
                className={`inh-row inh-row--${row.tag}${isDst ? ' inh-row--hot' : ''}`}
              >
                {row.label}
              </div>
            )
          })}
        </div>
        {pos && f.hopLabel && (
          <span className={`inh-flyer${f.kind === 'diamond' ? ' inh-flyer--dup' : ''}${f.kind === 'virtual' ? ' inh-flyer--shared' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {f.hopLabel}
          </span>
        )}
        {f.kind === 'diamond' && <span className="ct-flag">ambiguous</span>}
        {f.kind === 'virtual' && <span className="ex-caught-flag">one Base</span>}
      </div>

      <pre className="code-block sh-code">
        <code>{f.code}</code>
      </pre>
      <p className="layout-hint">{f.hint}</p>
    </div>
  )
}
