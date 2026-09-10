import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clamp01, easeInOutCubic, lerp } from './motion.ts'

const STATIONS = [
  { id: 'src', title: 'Source', sub: '.cpp' },
  { id: 'pp', title: 'Preprocess', sub: 'text' },
  { id: 'cc', title: 'Compile', sub: 'IR' },
  { id: 'as', title: 'Assemble', sub: '.o' },
  { id: 'ld', title: 'Link', sub: 'symbols' },
  { id: 'out', title: 'a.out', sub: 'run' },
] as const

const CAPTIONS = [
  'Two translation units. The compiler never sees the whole program at once — only one .cpp plus the headers it includes.',
  'Preprocess is still text: paste headers, expand macros. math.cpp and main.cpp are still separate files.',
  'Compile type-checks and emits IR/assembly per TU. main cannot “see” add’s body. Missing headers fail here.',
  'Assemble writes object files with defined and undefined symbols. main.o has U add; math.o has T add.',
  'The linker resolves names. Duplicate definitions or a missing .o show up here — not during compile.',
  'One executable. Relocations are applied. Run it. Modules (C++20) change this model; C++14 is headers + TUs.',
]

type PacketId = 'math' | 'main' | 'exe'

interface Layout {
  xs: number[]
  ty: number
}

export function CompilationViz() {
  const [playing, setPlaying] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [math, setMath] = useState(0)
  const [main, setMain] = useState(0)
  const [showExe, setShowExe] = useState(false)
  const [layout, setLayout] = useState<Layout>({ xs: [], ty: 0 })

  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const stationRefs = useRef<(HTMLButtonElement | null)[]>([])
  const rafRef = useRef(0)

  const stageIndex = showExe ? 5 : Math.max(Math.round(math), Math.round(main))

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current
      const track = trackRef.current
      if (!stage || !track) return
      const origin = stage.getBoundingClientRect()
      const tr = track.getBoundingClientRect()
      const xs = stationRefs.current.map((el) => {
        if (!el) return 0
        const r = el.getBoundingClientRect()
        return r.left - origin.left + r.width / 2
      })
      setLayout({ xs, ty: tr.top - origin.top + tr.height / 2 })
    }
    measure()
    const id = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener('resize', measure)
    }
  }, [])

  function reset() {
    cancelAnimationFrame(rafRef.current)
    setPlaying(false)
    setResolved(false)
    setMath(0)
    setMain(0)
    setShowExe(false)
  }

  function play() {
    cancelAnimationFrame(rafRef.current)
    setResolved(false)
    setShowExe(false)
    setMath(0)
    setMain(0)
    setPlaying(true)

    const t0 = performance.now()
    const tickRaf = (now: number) => {
      const t = (now - t0) / 1000
      setMath(pathAt(t))
      setMain(pathAt(t - 0.16))
      if (t >= 4.35) setResolved(true)
      if (t >= 5.2) setShowExe(true)
      if (t >= 6.4) {
        setPlaying(false)
        return
      }
      rafRef.current = requestAnimationFrame(tickRaf)
    }
    rafRef.current = requestAnimationFrame(tickRaf)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function jump(i: number) {
    cancelAnimationFrame(rafRef.current)
    setPlaying(false)
    setShowExe(i >= 5)
    setResolved(i >= 4)
    const p = Math.min(4, i)
    setMath(p)
    setMain(p)
  }

  const packets: { id: PacketId; label: string; progress: number }[] = [
    ...(!showExe
      ? [
          { id: 'math' as const, label: labelFor('math', math, resolved), progress: math },
          { id: 'main' as const, label: labelFor('main', main, resolved), progress: main },
        ]
      : []),
    ...(showExe ? [{ id: 'exe' as const, label: 'a.out', progress: 5 }] : []),
  ]

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play compile + link
        </button>
        <button className="chip chip--ghost" onClick={reset}>
          reset
        </button>
      </div>

      <div ref={stageRef} className="viz-stage cc-stage viz-stage--live">
        <div ref={trackRef} className="cc-track" />
        <div className="cc-stations">
          {STATIONS.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => {
                stationRefs.current[i] = el
              }}
              className={`cc-stop${stageIndex === i ? ' cc-stop--on' : ''}${i === 5 && showExe ? ' cc-stop--out' : ''}`}
              onClick={() => jump(i)}
            >
              <span className="pipe-idx">{i + 1}</span>
              <span className="pipe-title">{s.title}</span>
              <span className="pipe-io">{s.sub}</span>
            </button>
          ))}
        </div>

        {packets.map((p) => {
          const pos = posAt(p.progress, layout, p.id)
          if (!pos) return null
          return (
            <span
              key={p.id}
              className={`cc-packet cc-packet--${p.id}${p.id === 'main' && !resolved && p.progress >= 3 ? ' cc-packet--undef' : ''}`}
              style={{ left: pos.x, top: pos.y }}
            >
              {p.label}
            </span>
          )
        })}

        {resolved && !showExe && <span className="cc-spark">add resolved</span>}
      </div>

      <p className="layout-hint">{CAPTIONS[Math.min(CAPTIONS.length - 1, stageIndex)]}</p>
    </div>
  )
}

function labelFor(id: 'math' | 'main', progress: number, resolved: boolean): string {
  const s = Math.min(4, Math.floor(progress + 0.001))
  if (id === 'math') {
    const names = ['math.cpp', 'TU math', 'IR math', 'math.o  T add', 'math.o  T add']
    return names[s] ?? 'math.o'
  }
  const names = ['main.cpp', 'TU main', 'IR main', 'main.o  U add', resolved ? 'main.o  add✓' : 'main.o  U add']
  return names[s] ?? 'main.o'
}

function pathAt(seconds: number): number {
  const t = Math.max(0, seconds)
  const segs = [
    { at: 0, pos: 0 },
    { at: 0.75, pos: 1 },
    { at: 1.25, pos: 1 },
    { at: 2.05, pos: 2 },
    { at: 2.55, pos: 2 },
    { at: 3.35, pos: 3 },
    { at: 3.9, pos: 3 },
    { at: 4.7, pos: 4 },
    { at: 6.4, pos: 4 },
  ]
  if (t <= segs[0].at) return 0
  for (let i = 1; i < segs.length; i++) {
    if (t <= segs[i].at) {
      const a = segs[i - 1]
      const b = segs[i]
      const span = b.at - a.at
      const u = span <= 0 ? 1 : clamp01((t - a.at) / span)
      const eased = a.pos === b.pos ? 0 : easeInOutCubic(u)
      return lerp(a.pos, b.pos, a.pos === b.pos ? 0 : eased)
    }
  }
  return 4
}

function posAt(progress: number, layout: Layout, id: PacketId): { x: number; y: number } | null {
  const { xs, ty } = layout
  if (xs.length < 6) return null
  const max = STATIONS.length - 1
  const p = Math.min(max, Math.max(0, progress))
  const i = Math.min(max - 1, Math.floor(p))
  const t = p - i
  const lane = id === 'math' ? -22 : id === 'main' ? 22 : 0
  return {
    x: lerp(xs[i], xs[Math.min(max, i + 1)], t),
    y: ty + (id === 'exe' ? 0 : lane),
  }
}
