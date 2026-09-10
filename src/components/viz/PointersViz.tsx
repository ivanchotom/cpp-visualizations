import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clamp01, curve, easeInOutCubic, edge, hop, lerp, usePrefersReducedMotion } from './motion.ts'

type Target = 'a' | 'b'

interface Packet {
  id: number
  t: number
  born: number
  kind: 'p' | 'r'
  from: { x: number; y: number }
  to: { x: number; y: number }
}

export function PointersViz() {
  const reduced = usePrefersReducedMotion()
  const [a, setA] = useState(10)
  const [b, setB] = useState(20)
  const [pointAt, setPointAt] = useState<Target>('a')
  const [flash, setFlash] = useState<Target | 'r' | null>(null)
  const [packets, setPackets] = useState<Packet[]>([])
  const [tick, setTick] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const aRef = useRef<HTMLButtonElement>(null)
  const bRef = useRef<HTMLButtonElement>(null)
  const pRef = useRef<HTMLDivElement>(null)
  const rRef = useRef<HTMLDivElement>(null)
  const packetsRef = useRef<Packet[]>([])
  const rafRef = useRef(0)
  const packetId = useRef(0)

  const pVal = pointAt === 'a' ? a : b

  function layout() {
    const stage = stageRef.current
    if (!stage || !aRef.current || !bRef.current || !pRef.current || !rRef.current) {
      return null
    }
    const origin = stage.getBoundingClientRect()
    const target = pointAt === 'a' ? aRef.current : bRef.current
    return {
      p: edge(pRef.current, origin, 'top'),
      target: edge(target, origin, 'bottom'),
      r: edge(rRef.current, origin, 'top'),
      a: edge(aRef.current, origin, 'bottom'),
    }
  }

  useLayoutEffect(() => {
    setTick((n) => n + 1)
  }, [pointAt, a, b])

  useEffect(() => {
    const onResize = () => setTick((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const pts = layout()
  const pPath = pts ? curve(pts.p, pts.target, 40) : ''
  const rPath = pts ? curve(pts.r, pts.a, 28) : ''

  const [drawP, setDrawP] = useState(pPath)
  const fromPath = useRef(pPath)

  useEffect(() => {
    if (!pPath) return
    if (reduced) {
      setDrawP(pPath)
      fromPath.current = pPath
      return
    }
    const start = fromPath.current || pPath
    const startPts = parseEnds(start)
    const endPts = parseEnds(pPath)
    if (!startPts || !endPts) {
      setDrawP(pPath)
      fromPath.current = pPath
      return
    }
    const t0 = performance.now()
    let raf = 0
    const dur = 520
    const step = (now: number) => {
      const t = easeInOutCubic(clamp01((now - t0) / dur))
      const from = {
        x: lerp(startPts.from.x, endPts.from.x, t),
        y: lerp(startPts.from.y, endPts.from.y, t),
      }
      const to = {
        x: lerp(startPts.to.x, endPts.to.x, t),
        y: lerp(startPts.to.y, endPts.to.y, t),
      }
      setDrawP(curve(from, to, 40))
      if (t < 1) raf = requestAnimationFrame(step)
      else fromPath.current = pPath
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [pPath, reduced, tick])

  function spawnPacket(kind: 'p' | 'r') {
    const stage = stageRef.current
    const fromEl = kind === 'r' ? rRef.current : pRef.current
    const toEl = kind === 'r' ? aRef.current : pointAt === 'a' ? aRef.current : bRef.current
    if (!stage || !fromEl || !toEl) return
    const origin = stage.getBoundingClientRect()
    const pkt: Packet = {
      id: ++packetId.current,
      t: 0,
      born: performance.now(),
      kind,
      from: edge(fromEl, origin, 'top'),
      to: edge(toEl, origin, 'bottom'),
    }
    packetsRef.current = [...packetsRef.current, pkt]
    setPackets(packetsRef.current)
    if (rafRef.current) return
    const loop = (now: number) => {
      const next = packetsRef.current
        .map((p) => ({ ...p, t: clamp01((now - p.born) / 720) }))
        .filter((p) => p.t < 1)
      packetsRef.current = next
      setPackets(next)
      if (next.length) rafRef.current = requestAnimationFrame(loop)
      else rafRef.current = 0
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function reseat(t: Target) {
    setPointAt(t)
  }

  function writeThroughP() {
    const next = pVal + 1
    if (pointAt === 'a') setA(next)
    else setB(next)
    setFlash(pointAt)
    spawnPacket('p')
    window.setTimeout(() => setFlash(null), 520)
  }

  function incRef() {
    setA(a + 1)
    setFlash('r')
    spawnPacket('r')
    window.setTimeout(() => setFlash(null), 520)
  }

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className={`chip${pointAt === 'a' ? ' chip--active' : ''}`} onClick={() => reseat('a')}>
          p = &a
        </button>
        <button className={`chip${pointAt === 'b' ? ' chip--active' : ''}`} onClick={() => reseat('b')}>
          p = &b
        </button>
        <button className="chip chip--play" onClick={writeThroughP}>
          ++*p
        </button>
        <button className="chip chip--ref" onClick={incRef}>
          ++r
        </button>
        <button
          className="chip chip--ghost"
          onClick={() => {
            setA(10)
            setB(20)
            setPointAt('a')
            setPackets([])
            packetsRef.current = []
          }}
        >
          reset
        </button>
      </div>

      <div ref={stageRef} className="viz-stage ptr-stage viz-stage--live">
        <p className="ptr-hint-top">
          Click <strong>a</strong> or <strong>b</strong> to reseat the pointer. The green weld is a
          reference — it cannot move.
        </p>
        <div className="ptr-objects">
          <button
            ref={aRef}
            className={`ptr-obj${pointAt === 'a' ? ' ptr-obj--pointed' : ''}${flash === 'a' || flash === 'r' ? ' ptr-obj--flash' : ''}`}
            onClick={() => reseat('a')}
          >
            <span className="ptr-kind">object</span>
            <span className="ptr-name">
              <code>int a</code>
            </span>
            <span className="ptr-addr">0xA0</span>
            <span className="ptr-big">{a}</span>
          </button>
          <button
            ref={bRef}
            className={`ptr-obj${pointAt === 'b' ? ' ptr-obj--pointed' : ''}${flash === 'b' ? ' ptr-obj--flash' : ''}`}
            onClick={() => reseat('b')}
          >
            <span className="ptr-kind">object</span>
            <span className="ptr-name">
              <code>int b</code>
            </span>
            <span className="ptr-addr">0xB0</span>
            <span className="ptr-big">{b}</span>
          </button>
        </div>

        <div className="ptr-handles">
          <div ref={pRef} className="ptr-obj ptr-obj--pointer ptr-obj--handle">
            <span className="ptr-kind">pointer</span>
            <span className="ptr-name">
              <code>int* p</code>
            </span>
            <span className="ptr-addr">{pointAt === 'a' ? '0xA0' : '0xB0'}</span>
            <span className="ptr-extra">*p = {pVal}</span>
          </div>
          <div
            ref={rRef}
            className={`ptr-obj ptr-obj--ref ptr-obj--handle${flash === 'r' ? ' ptr-obj--flash' : ''}`}
          >
            <span className="ptr-kind">reference</span>
            <span className="ptr-name">
              <code>int& r</code>
            </span>
            <span className="ptr-addr">welded to a</span>
            <span className="ptr-extra">r = {a}</span>
          </div>
        </div>

        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="ptr-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ee0ff" />
              <stop offset="100%" stopColor="#00a3ff" />
            </linearGradient>
            <linearGradient id="ref-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8f29b" />
              <stop offset="100%" stopColor="#3d9a4a" />
            </linearGradient>
            <filter id="ptr-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="ptr-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#3ee0ff" />
            </marker>
            <marker id="ref-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#7dce82" />
            </marker>
          </defs>
          <path d={rPath} className="ptr-arc ptr-arc--ref" fill="none" markerEnd="url(#ref-head)" />
          <path
            d={drawP}
            className="ptr-arc ptr-arc--ptr"
            fill="none"
            filter="url(#ptr-glow)"
            markerEnd="url(#ptr-head)"
          />
        </svg>
        {packets.map((pkt) => {
          const pos = hop(pkt.from, pkt.to, pkt.t)
          return (
            <span
              key={pkt.id}
              className={`ptr-pulse ptr-pulse--${pkt.kind}`}
              style={{ left: pos.x, top: pos.y }}
            />
          )
        })}
      </div>

      <p className="layout-hint">
        <strong>p</strong> stores an address, so you can reseat it from a to b — watch the cyan
        arrow morph. <strong>r</strong> is another name for a for life; <code>++r</code> pulses
        into a and there is no <code>r = b</code> that rebinds it.
      </p>
    </div>
  )
}

function parseEnds(d: string): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const m = d.match(/M ([-.\d]+) ([-.\d]+).*?([-.\d]+) ([-.\d]+)$/)
  if (!m) return null
  return {
    from: { x: Number(m[1]), y: Number(m[2]) },
    to: { x: Number(m[3]), y: Number(m[4]) },
  }
}
