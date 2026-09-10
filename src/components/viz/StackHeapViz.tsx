import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { curve, edge, usePrefersReducedMotion } from './motion.ts'

type Mode = 'leak' | 'raii'

const BEATS = 4

export function StackHeapViz() {
  const reduced = usePrefersReducedMotion()
  const [mode, setMode] = useState<Mode>('leak')
  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [arrow, setArrow] = useState('')

  const stageRef = useRef<HTMLDivElement>(null)
  const pRef = useRef<HTMLDivElement>(null)
  const heapRef = useRef<HTMLDivElement>(null)

  const inFrame = beat === 1 || beat === 2
  const showX = mode === 'leak' && inFrame
  const showPtr = mode === 'leak' ? beat === 2 : beat === 1 || beat === 2
  const hasHeap = mode === 'leak' ? beat >= 2 : beat === 1 || beat === 2
  const leaked = mode === 'leak' && beat === 3
  const deleted = mode === 'raii' && beat === 3

  useEffect(() => {
    if (!playing) return
    if (reduced) {
      setBeat(BEATS - 1)
      setPlaying(false)
      return
    }
    const tAlloc = window.setTimeout(() => setBeat(2), 1600)
    const tReturn = window.setTimeout(() => {
      setBeat(3)
      setPlaying(false)
    }, 4000)
    return () => {
      window.clearTimeout(tAlloc)
      window.clearTimeout(tReturn)
    }
  }, [playing, mode, reduced])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !pRef.current || !heapRef.current || !showPtr) {
      setArrow('')
      return
    }
    const origin = stage.getBoundingClientRect()
    setArrow(curve(edge(pRef.current, origin, 'right'), edge(heapRef.current, origin, 'left'), 22))
  }, [showPtr, beat, mode, hasHeap])

  function reset(next: Mode = mode) {
    setPlaying(false)
    setBeat(0)
    setMode(next)
  }

  function play() {
    setBeat(1)
    setPlaying(true)
  }

  const code =
    mode === 'leak'
      ? beat === 0
        ? `void f() {\n  // not yet entered\n}`
        : beat === 1
          ? `void f() {\n  int x = 7;          // live\n}`
          : beat === 2
            ? `void f() {\n  int x = 7;\n  int* p = new int{42}; // p on stack, 42 on heap\n}`
            : `void f() {\n  int* p = new int{42};\n} // p dies, *p does not  ← leak`
      : beat === 0
        ? `void f() {\n  // not yet entered\n}`
        : beat === 1 || beat === 2
          ? `void f() {\n  auto p = std::make_unique<int>(42);\n}`
          : `void f() {\n  auto p = std::make_unique<int>(42);\n} // ~unique_ptr deletes`

  const caption =
    beat === 0
      ? 'Play a call to f(). The stack frame does not exist until the function is entered.'
      : beat === 1
        ? mode === 'leak'
          ? 'x is automatic. It will vanish when f returns — no delete, no leak.'
          : 'make_unique puts the unique_ptr on the stack and the int on the heap. The owner is automatic; the int is not.'
        : beat === 2
          ? mode === 'leak'
            ? 'p is just an address on the stack. The 42 is a separate heap object. They are not the same lifetime.'
            : 'Green weld: the stack owner is bound to the heap int. Returning will run the destructor.'
          : mode === 'leak'
            ? 'The frame is gone. The heap object has no pointer left. That is a leak — still allocated, reachable from nowhere.'
            : 'Destructor ran. Heap int is gone. RAII made the cleanup the same path as the return — even if f threw.'

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button className={`chip${mode === 'leak' ? ' chip--active' : ''}`} onClick={() => reset('leak')}>
          bare new
        </button>
        <button className={`chip${mode === 'raii' ? ' chip--active' : ''}`} onClick={() => reset('raii')}>
          unique_ptr
        </button>
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play f()
        </button>
        <button className="chip chip--ghost" onClick={() => reset(mode)}>
          reset
        </button>
      </div>

      <div
        ref={stageRef}
        className={`viz-stage sh-stage viz-stage--live${leaked ? ' sh-stage--leak' : ''}${mode === 'raii' ? ' sh-stage--raii' : ''}`}
      >
        <div className="sh-grid">
          <div className="sh-col">
            <span className="sh-kicker">stack · automatic</span>
            <div className={`sh-frame${inFrame ? ' sh-frame--on' : ''}${beat === 3 ? ' sh-frame--gone' : ''}`}>
              <span className="sh-frame-label">f()</span>
              {showX && (
                <div className="sh-cell sh-cell--stack sh-cell--in">
                  <span className="mem-name">int x</span>
                  <span className="mem-val">7</span>
                </div>
              )}
              {showPtr && (
                <div ref={pRef} className="sh-cell sh-cell--ptr sh-cell--in">
                  <span className="mem-name">{mode === 'leak' ? 'int* p' : 'unique_ptr p'}</span>
                  <span className="mem-val">{mode === 'leak' ? '0xH0' : 'owns →'}</span>
                </div>
              )}
              {!inFrame && (
                <p className="mem-empty">{beat === 3 ? 'frame destroyed' : 'no frame yet'}</p>
              )}
            </div>
          </div>

          <div className="sh-col">
            <span className="sh-kicker">heap · free store</span>
            {hasHeap && (
              <div
                ref={heapRef}
                className={`sh-cell sh-cell--heap sh-cell--in${leaked ? ' sh-cell--leaked' : ''}${mode === 'raii' && beat === 2 ? ' sh-cell--owned' : ''}`}
              >
                <span className="mem-name">int</span>
                <span className="sh-heap-val">42</span>
                <span className="mem-note">{leaked ? 'orphaned — leaked' : 'new int{42}'}</span>
              </div>
            )}
            {deleted && (
              <div className="sh-cell sh-cell--deleted sh-cell--in">
                <span className="mem-name">deleted</span>
                <span className="mem-val">~unique_ptr</span>
                <span className="mem-note">destructor ran delete</span>
              </div>
            )}
            {!hasHeap && !deleted && <p className="mem-empty">no allocations</p>}
          </div>
        </div>

        <svg className="ptr-svg" aria-hidden>
          <defs>
            <linearGradient id="sh-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={mode === 'raii' ? '#7dce82' : '#3ee0ff'} />
              <stop offset="100%" stopColor="#c678dd" />
            </linearGradient>
            <marker id="sh-head" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={mode === 'raii' ? '#7dce82' : '#3ee0ff'} />
            </marker>
          </defs>
          {arrow && (
            <path d={arrow} className={`sh-arc${mode === 'raii' ? ' sh-arc--own' : ''}`} fill="none" markerEnd="url(#sh-head)" />
          )}
        </svg>
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
