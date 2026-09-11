import { useEffect, useRef, useState } from 'react'
import { clamp01, easeInOutCubic, lerp } from './motion.ts'
import { SceneShell } from './scene/SceneShell.tsx'

const STATIONS = [
  { id: 'src', title: 'Source', sub: '.cpp' },
  { id: 'pp', title: 'Preprocess', sub: 'text' },
  { id: 'cc', title: 'Compile', sub: 'IR' },
  { id: 'as', title: 'Assemble', sub: '.o' },
  { id: 'ld', title: 'Link', sub: 'symbols' },
  { id: 'out', title: 'a.out', sub: 'run' },
] as const

const CAPTIONS = [
  'Two translation units ride the same pipeline. The compiler never sees the whole program — only one .cpp plus the headers it includes.',
  'Preprocess is still text: paste headers, expand macros. math.cpp and main.cpp stay separate files on separate lanes.',
  'Compile type-checks and emits IR per TU. main cannot see add’s body. Missing headers fail at this station, not later.',
  'Assemble writes object files. math.o defines T add. main.o still has U add — an undefined symbol waiting for the linker.',
  'The linker matches names. Duplicate definitions or a missing .o show up here, never during compile.',
  'One executable. Relocations applied. C++14 is still headers + TUs; modules are a later model.',
]

export function CompilationViz() {
  const [playing, setPlaying] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [math, setMath] = useState(0)
  const [main, setMain] = useState(0)
  const [showExe, setShowExe] = useState(false)
  const rafRef = useRef(0)

  const stageIndex = showExe ? 5 : Math.max(Math.round(math), Math.round(main))

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
    const tick = (now: number) => {
      const t = (now - t0) / 1000
      setMath(pathAt(t))
      setMain(pathAt(t - 0.16))
      if (t >= 4.35) setResolved(true)
      if (t >= 5.2) setShowExe(true)
      if (t >= 6.4) {
        setPlaying(false)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
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

  const progress = showExe ? 1 : Math.min(1, Math.max(math, main) / 4)

  return (
    <SceneShell
      playing={playing}
      onPlay={play}
      onReset={reset}
      playLabel="Play compile + link"
      step={stageIndex}
      stepCount={6}
      sig={STATIONS[stageIndex].title}
      caption={CAPTIONS[stageIndex]}
      tone={showExe ? 'ok' : 'idle'}
      code={
        showExe
          ? `// one process image\n./a.out`
          : `// math.cpp                // main.cpp\nint add(int, int);        int main() {\n                          return add(1, 2);\n                        }`
      }
    >
      <div className="fx-pipe">
        {STATIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`fx-stop${stageIndex === i ? ' fx-stop--on' : ''}${i < stageIndex ? ' fx-stop--done' : ''}`}
            onClick={() => jump(i)}
          >
            <span className="fx-stop-idx">{i + 1}</span>
            <span className="fx-stop-title">{s.title}</span>
            <span className="fx-stop-io">{s.sub}</span>
          </button>
        ))}
        <div className="fx-pipe-rail" style={{ ['--fx-progress' as string]: String(progress) }} />
        <div className="fx-lanes">
          {!showExe && (
            <>
              <span className="fx-token fx-token--math" style={{ left: pct(math), transition: 'none' }}>
                {labelFor('math', math, resolved)}
              </span>
              <span className="fx-token fx-token--main" style={{ left: pct(main), transition: 'none' }}>
                {labelFor('main', main, resolved)}
              </span>
            </>
          )}
          {showExe && (
            <span className="fx-token fx-token--exe" style={{ left: '92%' }}>
              a.out
            </span>
          )}
        </div>
      </div>
      <div
        className={`fx-verdict${resolved ? ' fx-verdict--show' : ''} ${showExe ? 'fx-verdict--ok' : resolved ? 'fx-verdict--ok' : ''}`}
      >
        {showExe ? 'lanes merged · one executable' : resolved ? 'linker: U add ← T add' : 'two TUs, two lanes'}
      </div>
    </SceneShell>
  )
}

function pct(progress: number): string {
  return `${8 + (Math.min(5, progress) / 5) * 84}%`
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
