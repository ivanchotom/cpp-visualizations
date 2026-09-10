import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Scene = 'mul' | 'assign' | 'eq'

const SCENES: {
  id: Scene
  title: string
  play: string
  code: string[]
  captions: string[]
}[] = [
  {
    id: 'mul',
    title: 'a + b * c',
    play: 'Play a + b * c',
    code: [
      `int v = a + b * c;`,
      `// * binds first (level 5 before 6)`,
      `int v = a + (b * c);`,
      `int v = a + (b * c);  // then +`,
    ],
    captions: [
      'Tokens in source order. Play to see what actually binds first — not left-to-right reading.',
      '* is multiplicative (level 5). It grabs b and c before + ever runs.',
      '+ now combines a with the already-built product. The tree is a + (b * c).',
      'Parentheses make that tree obvious. The table is real; readers should not have to recite it.',
    ],
  },
  {
    id: 'assign',
    title: 'a = b = 1',
    play: 'Play a = b = 1',
    code: [
      `a = b = 1;`,
      `// assignment is right-associative`,
      `a = (b = 1);`,
      `a = (b = 1);  // both hold 1`,
    ],
    captions: [
      'Two assignments. Right-associative: the right = runs first.',
      '1 hops into b. The inner assignment yields b (an lvalue).',
      'That result hops into a. a = (b = 1), not (a = b) = 1.',
      'Both names now hold 1. Left-to-right would not even compile the same way.',
    ],
  },
  {
    id: 'eq',
    title: 'a < b == c',
    play: 'Play a < b == c',
    code: [
      `a < b == c;`,
      `// < is tighter than ==`,
      `(a < b) == c;`,
      `(a < b) == c;  // bool compared to c`,
    ],
    captions: [
      'Looks like a three-way compare. It is not. Play and watch the tree.',
      '< binds first (comparisons sit above ==). You get a bool.',
      '== then compares that bool to c. Rarely what anyone meant.',
      'Write (a < b) && (b == c) or use parentheses. Same trap: flags & MASK == 0.',
    ],
  },
]

const STEP_MS = 1200
const HOP_MS = 640

export function OperatorsViz() {
  const [id, setId] = useState<Scene>('mul')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 0, y: 0 })
  const [to, setTo] = useState<Point>({ x: 0, y: 0 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLSpanElement>(null)
  const dstRef = useRef<HTMLSpanElement>(null)

  const scene = SCENES.find((s) => s.id === id) ?? SCENES[0]
  const stepCount = scene.captions.length

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

  function select(next: Scene) {
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

  const flyer =
    hopT < 1 && i >= 1 && i < 3 ? hop(from, to, hopT) : null

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {SCENES.map((s) => (
          <button
            key={s.id}
            className={`chip${id === s.id ? ' chip--active' : ''}`}
            onClick={() => select(s.id)}
            disabled={playing}
          >
            {s.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={play} disabled={playing}>
          {scene.play}
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage op-stage viz-stage--live${id === 'assign' ? ' op-stage--assign' : ''}${id === 'eq' ? ' op-stage--eq' : ''}`}
      >
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · {scene.title}
        </p>
        <div className="lf-beats" aria-hidden>
          {scene.captions.map((_, n) => (
            <span
              key={n}
              className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}${id === 'assign' || (id === 'eq' && n >= 2) ? ' lf-beat--dtor' : ''}`}
            />
          ))}
        </div>

        {id === 'mul' && (
          <div className="op-expr">
            <span className={`op-tok${i === 0 ? ' op-tok--idle' : ''}`}>a</span>
            <span className={`op-op${i >= 2 ? ' op-op--on' : ''}`}>+</span>
            <span className={`op-group${i >= 1 ? ' op-group--on' : ''}`}>
              <span ref={i === 1 ? srcRef : undefined} className={`op-tok${i >= 1 ? ' op-tok--hot' : ''}`}>
                b
              </span>
              <span className={`op-op op-op--mul${i === 1 ? ' op-op--on' : ''}`}>*</span>
              <span
                ref={i === 1 ? dstRef : i === 2 ? srcRef : undefined}
                className={`op-tok${i >= 1 ? ' op-tok--hot' : ''}`}
              >
                c
              </span>
            </span>
            {i >= 2 && (
              <span ref={dstRef} className="op-result">
                a+(b*c)
              </span>
            )}
          </div>
        )}

        {id === 'assign' && (
          <div className="op-expr">
            <span ref={i === 2 ? dstRef : undefined} className={`op-tok op-slot${i >= 3 ? ' op-tok--filled' : ''}`}>
              a
              {i >= 3 && <em>1</em>}
            </span>
            <span className={`op-op${i >= 2 ? ' op-op--on' : ''}`}>=</span>
            <span ref={i === 1 ? dstRef : i === 2 ? srcRef : undefined} className={`op-tok op-slot${i >= 2 ? ' op-tok--filled' : ''}`}>
              b
              {i >= 2 && <em>1</em>}
            </span>
            <span className={`op-op${i === 1 ? ' op-op--on' : ''}`}>=</span>
            <span ref={i === 1 ? srcRef : undefined} className="op-tok op-tok--lit">
              1
            </span>
          </div>
        )}

        {id === 'eq' && (
          <div className="op-expr">
            <span ref={i >= 1 ? srcRef : undefined} className={`op-group${i >= 1 ? ' op-group--on' : ''}`}>
              <span className="op-tok">a</span>
              <span className={`op-op${i === 1 ? ' op-op--on' : ''}`}>&lt;</span>
              <span className="op-tok">b</span>
            </span>
            <span className={`op-op${i >= 2 ? ' op-op--warn' : ''}`}>==</span>
            <span ref={i >= 1 ? dstRef : undefined} className={`op-tok${i >= 2 ? ' op-tok--warn' : ''}`}>
              c
            </span>
            {i >= 3 && <span className="op-result op-result--warn">(a&lt;b)==c</span>}
          </div>
        )}

        {flyer && (
          <span
            className={`ptr-pulse${id === 'assign' ? ' ptr-pulse--throw' : id === 'eq' ? ' ptr-pulse--throw' : ' ptr-pulse--p'}`}
            style={{ left: flyer.x, top: flyer.y }}
          />
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{scene.code[Math.min(i, scene.code.length - 1)]}</code>
      </pre>
      <p className="layout-hint">{scene.captions[i]}</p>
    </div>
  )
}
