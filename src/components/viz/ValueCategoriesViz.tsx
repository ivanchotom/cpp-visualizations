import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { centerOf, hop, waitNextBeat, type Point } from './motion.ts'

type Cat = 'lvalue' | 'xvalue' | 'prvalue'

interface Frame {
  expr: string
  cat: Cat
  hint: string
  code: string
}

const FRAMES: Frame[] = [
  {
    expr: 'x',
    cat: 'lvalue',
    hint: 'A named variable has identity. You can take &x. You do not steal from it — you copy.',
    code: `int x = 1;
x;          // lvalue`,
  },
  {
    expr: '++x',
    cat: 'lvalue',
    hint: 'Prefix increment returns the object itself. Still an lvalue — identity, no steal.',
    code: `++x;        // lvalue, the object x`,
  },
  {
    expr: '42',
    cat: 'prvalue',
    hint: 'A literal has no identity. It is a pure incoming value (prvalue). In C++14 it initializes or is moved from.',
    code: `42;         // prvalue`,
  },
  {
    expr: 'x++',
    cat: 'prvalue',
    hint: 'Postfix yields a temporary copy of the old value. That copy is a prvalue.',
    code: `x++;        // prvalue (old value)`,
  },
  {
    expr: 'std::move(x)',
    cat: 'xvalue',
    hint: 'std::move is static_cast<T&&>(x). Same object, now expiring — you may steal. It does not move by itself.',
    code: `std::move(x);  // xvalue`,
  },
  {
    expr: 't',
    cat: 'lvalue',
    hint: 'A named T&& is still an lvalue. That is why wrap must call std::move (or std::forward) — the name killed the xvalue.',
    code: `void wrap(std::string&& t) {
  // take(t);          // error: t is an lvalue
  take(std::move(t));  // xvalue
}`,
  },
]

const STEP_MS = 1300
const HOP_MS = 680

export function ValueCategoriesViz() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 40 })
  const [to, setTo] = useState<Point>({ x: 200, y: 120 })

  const stageRef = useRef<HTMLDivElement>(null)
  const exprRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Record<Cat, HTMLDivElement | null>>({ lvalue: null, xvalue: null, prvalue: null })

  const f = FRAMES[Math.min(i, FRAMES.length - 1)]

  useLayoutEffect(() => {
    const stage = stageRef.current
    const dst = cellRefs.current[f.cat]
    if (!stage || !exprRef.current || !dst) return
    const origin = stage.getBoundingClientRect()
    setFrom(centerOf(exprRef.current, origin))
    setTo(centerOf(dst, origin))
  }, [i, f.cat])

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
  const taxonomy: { cat: Cat; aka: string; steal: string; identity: string }[] = [
    { cat: 'lvalue', aka: 'glvalue', steal: 'no (copy)', identity: 'yes' },
    { cat: 'xvalue', aka: 'glvalue + rvalue', steal: 'yes (move)', identity: 'yes (expiring)' },
    { cat: 'prvalue', aka: 'rvalue', steal: 'yes (init / move)', identity: 'no' },
  ]

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play x then 42 then move(x)
        </button>
        <button className="chip" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={playing || i === 0}>
          ◂ prev
        </button>
        <button className="chip" onClick={() => setI((n) => Math.min(FRAMES.length - 1, n + 1))} disabled={playing || i === FRAMES.length - 1}>
          next ▸
        </button>
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

      <div ref={stageRef} className={`viz-stage cat-stage viz-stage--live cat-stage--${f.cat}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{FRAMES.length} · {f.cat}
        </p>
        <div className="lf-beats" aria-hidden>
          {FRAMES.map((_, n) => (
            <span key={n} className={`lf-beat${n === i ? ' lf-beat--on' : ''}${n < i ? ' lf-beat--done' : ''}`} />
          ))}
        </div>
        <div ref={exprRef} className={`cat-expr cat-expr--${f.cat}`}>
          <span className="tpl-kicker">expression</span>
          <code>{f.expr}</code>
        </div>
        <div className="cat-diagram">
          {taxonomy.map((t) => (
            <div
              key={t.cat}
              ref={(el) => {
                cellRefs.current[t.cat] = el
              }}
              className={`cat-cell cat-cell--${t.cat}${f.cat === t.cat ? ' cat-cell--on' : ''}`}
            >
              <strong>{t.cat}</strong>
              <span>{t.aka}</span>
              <span>identity: {t.identity}</span>
              <span>move from: {t.steal}</span>
            </div>
          ))}
        </div>
        {pos && (
          <span className={`cat-flyer cat-flyer--${f.cat}`} style={{ left: pos.x, top: pos.y }}>
            {f.expr}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{f.code}</code>
      </pre>
      <p className="layout-hint">{f.hint}</p>
    </div>
  )
}
