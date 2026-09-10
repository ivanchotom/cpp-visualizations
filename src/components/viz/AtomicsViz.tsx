import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'seq' | 'pub' | 'relaxed' | 'cas'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'seq', title: 'seq_cst', sig: 'atomic default' },
  { id: 'pub', title: 'publish', sig: 'release / acquire' },
  { id: 'relaxed', title: 'relaxed', sig: 'memory_order_relaxed' },
  { id: 'cas', title: 'CAS', sig: 'compare_exchange' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function AtomicsViz() {
  const [id, setId] = useState<Mode>('seq')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const bounce = (id === 'relaxed' && i >= 2) || (id === 'cas' && i === 2)
  const trapped = id === 'relaxed' && i >= 2
  const won = (id === 'seq' && i >= 2) || (id === 'pub' && i >= 2) || (id === 'cas' && i >= 3)

  const useRight = i >= 2

  useLayoutEffect(() => {
    const stage = stageRef.current
    const srcEl = srcRef.current
    const dstEl = useRight ? rightRef.current : midRef.current
    if (!stage || !srcEl || !dstEl) return
    const origin = stage.getBoundingClientRect()
    const a = srcEl.getBoundingClientRect()
    const b = dstEl.getBoundingClientRect()
    const src = { x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 }
    const dst = { x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 }
    if (bounce) {
      setFrom(dst)
      setTo(src)
    } else {
      setFrom(src)
      setTo(dst)
    }
  }, [id, i, bounce, useRight])

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

  function select(next: Mode) {
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

  const pos = hopT < 1 && i >= 1 ? hop(from, to, hopT) : null
  const flyerText =
    id === 'seq'
      ? i === 1
        ? 'store'
        : 'load'
      : id === 'pub'
        ? i === 1
          ? 'payload'
          : 'flag'
        : id === 'relaxed'
          ? i === 1
            ? 'flag'
            : 'payload?'
          : i === 1
            ? 'CAS'
            : i === 2
              ? 'weak fail'
              : 'retry'

  const leftName =
    id === 'seq' ? 'thread A' : id === 'pub' ? 'publisher' : id === 'relaxed' ? 'publisher' : 'expected'
  const leftVal =
    id === 'seq' ? 'store(1)' : id === 'pub' ? 'data = 7' : id === 'relaxed' ? 'data = 7' : '0 → 1'
  const midName =
    id === 'seq' ? 'atomic<int>' : id === 'pub' ? 'release store' : id === 'relaxed' ? 'relaxed store' : 'atomic'
  const midVal =
    id === 'seq' && i >= 1
      ? 'seq_cst'
      : id === 'pub' && i >= 1
        ? 'ready = true'
        : id === 'relaxed' && i >= 1
          ? 'flag only'
          : id === 'cas' && i >= 1
            ? i >= 3
              ? '1'
              : '0'
            : '—'
  const midNote =
    id === 'seq'
      ? 'default, total order'
      : id === 'pub'
        ? 'synchronizes-with'
        : id === 'relaxed'
          ? 'no happens-before'
          : 'strong / weak'
  const rightName =
    id === 'seq' ? 'thread B' : id === 'pub' ? 'listener' : id === 'relaxed' ? 'listener' : 'observed'
  const rightVal =
    id === 'seq' && i >= 2
      ? '1'
      : id === 'pub' && i >= 2
        ? 'data is 7'
        : id === 'relaxed' && i >= 2
          ? 'stale / UB'
          : id === 'cas' && i >= 3
            ? '1'
            : id === 'cas' && i >= 2
              ? 'spurious'
              : '—'
  const rightNote =
    id === 'seq' && won
      ? 'same total order'
      : id === 'seq'
        ? 'load sees store'
        : id === 'pub' && won
          ? 'acquire saw release'
          : id === 'pub'
            ? 'payload then flag'
            : trapped
              ? 'no sync'
              : id === 'relaxed'
                ? 'data is non-atomic'
                : won
                  ? 'loop until true'
                  : bounce
                    ? 'retry is required'
                    : 'weak may fail'

  const code =
    id === 'seq'
      ? `std::atomic<int> x{0};
// default memory_order_seq_cst
x.store(1);
int v = x.load();          // 1
// a total order of all seq_cst ops`
      : id === 'pub'
        ? i < 2
          ? `payload = compute();                       // 7
ready.store(true, std::memory_order_release);`
          : `// listener
if (ready.load(std::memory_order_acquire)) {
  use(payload);            // sees 7
}`
        : id === 'relaxed'
          ? i < 2
            ? `payload = compute();                       // non-atomic
ready.store(true, std::memory_order_relaxed);`
            : `if (ready.load(std::memory_order_relaxed)) {
  use(payload);            // no happens-before
}                          // data race / stale`
          : i < 3
            ? `int e = 0;
bool ok = x.compare_exchange_weak(
    e, 1);                 // may fail spuriously
// e is overwritten with the current value`
            : `int e = 0;
while (!x.compare_exchange_weak(e, 1)) {
  e = 0;                   // retry; e was updated
}
// strong: no spurious fail, still in a loop
// if another thread can win`

  const caption =
    i === 0
      ? id === 'seq'
        ? 'Play seq_cst. A data race on a non-atomic is UB, not a torn read. atomic<T> loads and stores are atomic. Start with seq_cst — the default.'
        : id === 'pub'
          ? 'Play publish. Write the payload, then a release store on a flag. An acquire load of that flag synchronizes-with the store and sees the payload.'
          : id === 'relaxed'
            ? 'Play relaxed. Relaxed is for a counter you do not use as a signal. A relaxed flag does not publish a non-atomic payload. That is still a data race.'
            : 'Play CAS. compare_exchange_weak may fail spuriously — correct inside a retry loop. strong fails only when the value truly differs.'
      : id === 'seq' && i === 1
        ? 'store hops onto the atomic. seq_cst is a total order of all seq_cst operations. Slowest, easiest to reason about. T should be trivially copyable.'
        : id === 'seq' && i === 2
          ? 'load hops out as 1. is_lock_free() tells you if the implementation hid a mutex. mutex + lock_guard remains the default for anything bigger than a counter or a flag.'
          : id === 'seq'
            ? 'Sharing a mutex without documenting which data it guards is the other half of this page. Atomic does not replace a protocol.'
            : id === 'pub' && i === 1
              ? 'payload hops first. The non-atomic write happens-before the release store in this thread. Order in one thread is still sequenced-before.'
              : id === 'pub' && i === 2
                ? 'flag hops as a release. The listener’s acquire load synchronizes-with that store, so it is allowed to see payload = 7. That is the publish protocol.'
                : id === 'pub'
                  ? 'Release/acquire is not seq_cst: two independent flags can be seen in different orders. Use it when you have measured and you know the protocol.'
                  : id === 'relaxed' && i === 1
                    ? 'flag hops with relaxed. The counter-style increment (fetch_add relaxed) is fine. Using the same order to publish a payload is not.'
                    : id === 'relaxed' && i === 2
                      ? 'payload bounces. No happens-before from the flag to the listener. A non-atomic write in one thread and a read in another is UB, even for a bool payload.'
                      : id === 'relaxed'
                        ? 'Using relaxed everywhere because it is faster loses the happens-before you needed. Measure first; then write the protocol down.'
                        : i === 1
                          ? 'CAS hops: expected 0, desired 1. The atomic compares, and on success stores 1. expected is an in/out parameter.'
                          : i === 2
                            ? 'weak fails spuriously. The value is still 0, but the call returned false. That is not a bug if the next line retries.'
                            : 'retry hops and wins. compare_exchange_strong would not have failed that time — still loop while another thread can change the value.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'ao-stage--reject' : won ? 'ao-stage--win' : ''

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {MODES.map((x) => (
          <button
            key={x.id}
            className={`chip${id === x.id ? ' chip--active' : ''}`}
            onClick={() => select(x.id)}
            disabled={playing}
          >
            {x.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play order
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage ao-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="ao-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">in</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">thread</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">order</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">out</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span
            className={`ptr-pulse ao-flyer${trapped || bounce ? ' ao-flyer--trap' : ''}`}
            style={{ left: pos.x, top: pos.y }}
          >
            {flyerText}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
