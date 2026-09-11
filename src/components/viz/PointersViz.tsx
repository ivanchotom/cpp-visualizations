import { useEffect, useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Target = 'a' | 'b'

const MODES: { id: Target; title: string }[] = [
  { id: 'a', title: 'p = &a' },
  { id: 'b', title: 'p = &b' },
]

export function PointersViz() {
  const [pointAt, setPointAt] = useState<Target>('a')
  const [a, setA] = useState(10)
  const [b, setB] = useState(20)
  const [flash, setFlash] = useState<Target | 'r' | null>(null)
  const { i, playing, play, reset } = useBeats(5)

  const scripted = playing || i > 0
  const liveTarget: Target = scripted ? (i >= 1 ? 'b' : 'a') : pointAt
  const aVal = scripted ? (i >= 3 ? 11 : 10) : a
  const bVal = scripted ? (i >= 2 ? 21 : 20) : b
  const pVal = liveTarget === 'a' ? aVal : bVal

  useEffect(() => {
    if (!playing) return
    if (i === 2) setFlash('b')
    else if (i === 3) setFlash('r')
    else setFlash(null)
    const t = window.setTimeout(() => setFlash(null), 520)
    return () => window.clearTimeout(t)
  }, [i, playing])

  function select(next: string) {
    reset()
    setA(10)
    setB(20)
    setFlash(null)
    setPointAt(next as Target)
  }

  function hardReset() {
    reset()
    setA(10)
    setB(20)
    setFlash(null)
    setPointAt('a')
  }

  function incP() {
    if (playing) return
    if (liveTarget === 'a') setA((n) => n + 1)
    else setB((n) => n + 1)
    setFlash(liveTarget)
    window.setTimeout(() => setFlash(null), 520)
  }

  function incR() {
    if (playing) return
    setA((n) => n + 1)
    setFlash('r')
    window.setTimeout(() => setFlash(null), 520)
  }

  const code =
    i === 0 && !playing
      ? `int a = ${aVal};\nint b = ${bVal};\nint* p = &${liveTarget};\nint& r = a;`
      : i <= 1
        ? `int* p = &a;\nint& r = a;\np = &b;            // reseat`
        : i === 2
          ? `++*p;              // writes b\n// b is ${bVal}`
          : i === 3
            ? `++r;               // writes a\n// r cannot reseat`
            : `p points at b (${bVal})\nr is still a (${aVal})`

  const caption =
    i === 0 && !playing
      ? 'p stores an address — chip p = &b to reseat. r is another name for a and cannot move. Play walks reseat then write-through.'
      : i === 0
        ? 'p starts at a. The cyan bar is an address. The green bar is a weld — r is a, for life.'
        : i === 1
          ? 'p = &b. The cyan bar now names b. r did not move. There is no r = b that rebinds a reference.'
          : i === 2
            ? '++*p writes through the address. b flashes in place. a is untouched.'
            : i === 3
              ? '++r writes a. The weld never left a. Same object, two names.'
              : 'p can be null or reseated. r cannot. Prefer r in APIs; p when absence or reseating is the design.'

  const tone = i >= 4 ? 'ok' : flash ? 'ok' : 'idle'

  return (
    <SceneShell
      modes={MODES}
      mode={scripted ? liveTarget : pointAt}
      onSelect={select}
      playing={playing}
      onPlay={() => {
        setA(10)
        setB(20)
        setPointAt('a')
        play()
      }}
      onReset={hardReset}
      playLabel="Play p = &b then ++"
      step={i}
      stepCount={5}
      sig={liveTarget === 'a' ? 'p → a' : 'p → b'}
      caption={caption}
      code={code}
      tone={tone}
      footer={
        <div className="stepper">
          <button className="chip chip--play" onClick={incP} disabled={playing}>
            ++*p
          </button>
          <button className="chip chip--ref" onClick={incR} disabled={playing}>
            ++r
          </button>
        </div>
      }
    >
      <div className="fx-obj-row">
        <div
          className={`fx-slot${liveTarget === 'a' ? ' fx-slot--focus' : ''}${
            flash === 'a' || flash === 'r' ? ' fx-slot--flash-ref' : ''
          }`}
        >
          <span className="fx-kicker">object · 0xA0</span>
          <span className="fx-value">{aVal}</span>
          <span className="fx-note">
            <code>int a</code>
          </span>
        </div>
        <div
          className={`fx-slot${liveTarget === 'b' ? ' fx-slot--focus' : ' fx-slot--dim'}${
            flash === 'b' ? ' fx-slot--flash' : ''
          }`}
        >
          <span className="fx-kicker">object · 0xB0</span>
          <span className="fx-value">{bVal}</span>
          <span className="fx-note">
            <code>int b</code>
          </span>
        </div>
      </div>
      <div className="fx-lockrow">
        <div className={`fx-slot${flash === 'b' || (flash === 'a' && liveTarget === 'a') ? ' fx-slot--flash' : ''}`}>
          <span className="fx-kicker">pointer</span>
          <span className="fx-value">
            <code>int* p</code>
          </span>
          <span className="fx-note">{liveTarget === 'a' ? '0xA0' : '0xB0'} · *p = {pVal}</span>
          <span className="fx-badge fx-badge--open">may reseat</span>
        </div>
        <div className="fx-link fx-link--on" />
        <div className={`fx-slot${liveTarget === 'a' ? ' fx-slot--focus' : ''}${flash === 'a' || flash === 'r' ? ' fx-slot--flash-ref' : ''}`}>
          <span className="fx-kicker">{liveTarget === 'a' ? 'pointee a' : 'pointee b'}</span>
          <span className="fx-value">{pVal}</span>
          <span className="fx-note">{liveTarget === 'a' ? 'same object as r' : 'b, not r'}</span>
        </div>
      </div>
      <div className="fx-lockrow">
        <div className={`fx-slot fx-slot--weld${flash === 'r' ? ' fx-slot--flash-ref' : ''}`}>
          <span className="fx-kicker">reference</span>
          <span className="fx-value">
            <code>int& r</code>
          </span>
          <span className="fx-note">r = {aVal}</span>
          <span className="fx-badge fx-badge--lock">welded to a</span>
        </div>
        <div className="fx-link fx-link--weld" />
        <div className={`fx-slot fx-slot--weld${flash === 'r' || flash === 'a' ? ' fx-slot--flash-ref' : ''}`}>
          <span className="fx-kicker">alias of a</span>
          <span className="fx-value">{aVal}</span>
          <span className="fx-note">cannot reseat</span>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          i >= 4 ? 'fx-verdict--ok' : i >= 1 ? 'fx-verdict--ok' : ''
        }`}
      >
        {i >= 4
          ? 'p → b · r still a · two different bindings'
          : i === 3
            ? '++r · a is 11 · weld never moved'
            : i === 2
              ? '++*p · b is 21 · a unchanged'
              : i === 1
                ? 'cyan reseated · green weld stayed'
                : ''}
      </div>
    </SceneShell>
  )
}
