import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, hop } from './motion.ts'

type Scene = 'derived' | 'slice' | 'ctor'

const SCENES: {
  id: Scene
  title: string
  vtable: string
  slots: { name: string; fn: string }[]
  object: string
  age: string
  vptr: string
  word: string
  note: string
}[] = [
  {
    id: 'derived',
    title: 'Dog via Animal*',
    vtable: 'Dog vtable',
    slots: [
      { name: '[0] dtor', fn: 'Dog::~Dog' },
      { name: '[1] speak', fn: 'Dog::speak' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    object: 'Dog',
    age: 'age = 5',
    vptr: 'vptr → Dog',
    word: 'woof',
    note: 'p->speak() loads the vptr, indexes slot 1, and calls Dog::speak. The static type of p is Animal*; the dynamic type is Dog.',
  },
  {
    id: 'slice',
    title: 'Sliced Animal value',
    vtable: 'Animal vtable',
    slots: [
      { name: '[0] dtor', fn: 'Animal::~Animal' },
      { name: '[1] speak', fn: 'Animal::speak' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    object: 'Animal',
    age: 'Dog members gone',
    vptr: 'vptr → Animal',
    word: '…',
    note: 'Pass Dog by value into an Animal parameter and you slice: the Dog vptr and extra members are gone. Virtual calls use Animal’s table.',
  },
  {
    id: 'ctor',
    title: 'Inside Animal’s ctor',
    vtable: 'Animal vtable (temporary)',
    slots: [
      { name: '[0] dtor', fn: 'Animal::~Animal' },
      { name: '[1] speak', fn: 'Animal::speak' },
      { name: '[2] id', fn: 'Animal::id' },
    ],
    object: 'Dog*',
    age: 'Dog not alive yet',
    vptr: 'vptr → Animal',
    word: '…',
    note: 'While Animal’s constructor runs, the object is not a Dog yet. Virtual calls use Animal’s vtable. Same story in reverse during ~Dog then ~Animal.',
  },
]

interface Pulse {
  t: number
  born: number
  from: { x: number; y: number }
  to: { x: number; y: number }
}

export function VtableViz() {
  const [id, setId] = useState<Scene>('derived')
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [said, setSaid] = useState(false)
  const [hot, setHot] = useState(false)
  const [arrow, setArrow] = useState('')

  const stageRef = useRef<HTMLDivElement>(null)
  const objRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  const s = SCENES.find((x) => x.id === id) ?? SCENES[0]

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !objRef.current || !slotRef.current) {
      setArrow('')
      return
    }
    const origin = stage.getBoundingClientRect()
    setArrow(curve(edge(objRef.current, origin, 'right'), edge(slotRef.current, origin, 'left'), 28))
  }, [id])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function callSpeak() {
    const stage = stageRef.current
    if (!stage || !objRef.current || !slotRef.current) return
    cancelAnimationFrame(rafRef.current)
    const origin = stage.getBoundingClientRect()
    const from = edge(objRef.current, origin, 'right')
    const to = edge(slotRef.current, origin, 'left')
    const born = performance.now()
    setSaid(false)
    setHot(true)
    setPulse({ t: 0, born, from, to })

    const loop = (now: number) => {
      const t = Math.min(1, (now - born) / 720)
      setPulse({ t, born, from, to })
      if (t < 1) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      setSaid(true)
      window.setTimeout(() => setHot(false), 700)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function select(next: Scene) {
    cancelAnimationFrame(rafRef.current)
    setPulse(null)
    setSaid(false)
    setHot(false)
    setId(next)
  }

  const pos = pulse ? hop(pulse.from, pulse.to, pulse.t) : null

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {SCENES.map((x) => (
          <button key={x.id} className={`chip${id === x.id ? ' chip--active' : ''}`} onClick={() => select(x.id)}>
            {x.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={callSpeak}>
          p-&gt;speak()
        </button>
      </div>

      <div ref={stageRef} className="viz-stage vt-stage viz-stage--live">
        <div className="vt-row">
          <div
            ref={objRef}
            className={`vt-obj${hot ? ' vt-obj--hot' : ''}${id === 'slice' ? ' vt-obj--sliced' : ''}`}
          >
            <span className="lf-tag">{s.object}</span>
            <span className="vt-vptr">{s.vptr}</span>
            <span className="vt-age">{s.age}</span>
            {said && <span className="vt-say">{s.word}</span>}
          </div>
          <div className="vt-table">
            <span className="lf-tag">{s.vtable}</span>
            {s.slots.map((slot, i) => (
              <div
                key={slot.name}
                ref={i === 1 ? slotRef : undefined}
                className={`vt-slot${i === 1 && hot ? ' vt-slot--on' : ''}`}
              >
                <code>{slot.name}</code>
                <span>{slot.fn}</span>
              </div>
            ))}
          </div>
        </div>
        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="vt-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3ee0ff" />
              <stop offset="100%" stopColor="#c678dd" />
            </linearGradient>
            <marker id="vt-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#c678dd" />
            </marker>
          </defs>
          {arrow && (
            <path d={arrow} className="vt-arc" fill="none" markerEnd="url(#vt-head)" />
          )}
        </svg>
        {pos && pulse && pulse.t < 1 && (
          <span className="ptr-pulse ptr-pulse--p" style={{ left: pos.x, top: pos.y }} />
        )}
      </div>

      <p className="layout-hint">{s.note}</p>
    </div>
  )
}
