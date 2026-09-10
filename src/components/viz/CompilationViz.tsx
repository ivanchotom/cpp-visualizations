import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clamp01, easeInOutCubic, lerp, usePrefersReducedMotion } from './motion.ts'

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
  const reduced = usePrefersReducedMotion()
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
  }, [math, main, showExe, playing])

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

    if (reduced) {
      setMath(4)
      setMain(4)
      setResolved(true)
      setShowExe(true)
      setPlaying(false)
      return
    }

    const t0 = performance.now()
    const tickRaf = (now: number) => {
      const t = (now - t0) / 1000
      setMath(pathAt(t))
      setMain(pathAt(t - 0.18))
      if (t >= 3.15) setResolved(true)
      if (t >= 3.55) setShowExe(true)
      if (t >= 4.4) {
        setMath(4)
        setMain(4)
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

  const packets: { id: PacketId; label: string; progress: number }[] = showExe
    ? [{ id: 'exe', label: 'a.out', progress: 5 }]
    : [
        { id: 'math', label: labelFor('math', math, resolved), progress: math },
        { id: 'main', label: labelFor('main', main, resolved), progress: main },
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
  if (t < 0.7) return lerp(0, 1, easeInOutCubic(clamp01(t / 0.7)))
  if (t < 1.55) return lerp(1, 2, easeInOutCubic(clamp01((t - 0.7) / 0.85)))
  if (t < 2.3) return lerp(2, 3, easeInOutCubic(clamp01((t - 1.55) / 0.75)))
  if (t < 3.15) return lerp(3, 4, easeInOutCubic(clamp01((t - 2.3) / 0.85)))
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
