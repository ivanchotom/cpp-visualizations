import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'race' | 'guard' | 'join' | 'atomic'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'race', title: 'data race', sig: '++hits' },
  { id: 'guard', title: 'lock_guard', sig: 'lock_guard<mutex>' },
  { id: 'join', title: 'join', sig: '~thread' },
  { id: 'atomic', title: 'atomic', sig: 'atomic<int>' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function ConcurrencyViz() {
  const [id, setId] = useState<Mode>('race')
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
  const bounce = id === 'join' && i >= 3
  const trapped = (id === 'race' && i >= 2) || (id === 'join' && i >= 2)
  const won = (id === 'guard' && i >= 3) || (id === 'atomic' && i >= 2)

  const useRight =
    (id === 'race' && i >= 2) ||
    (id === 'guard' && i >= 2) ||
    (id === 'join' && i >= 2) ||
    (id === 'atomic' && i >= 2)

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
    id === 'race'
      ? i === 1
        ? 't1 ++'
        : 't2 ++'
      : id === 'guard'
        ? i === 1
          ? 'lock'
          : i === 2
            ? 't1 ++'
            : 't2 ++'
        : id === 'join'
          ? i === 1
            ? 't'
            : i === 2
              ? '~t'
              : 'term'
          : i === 1
            ? 't1'
            : 't2'

  const leftName = id === 'race' ? 'thread t1' : id === 'guard' ? 'thread t1' : id === 'join' ? 'std::thread t' : 'thread t1'
  const leftVal =
    id === 'race'
      ? '++hits'
      : id === 'guard'
        ? 'lock then ++'
        : id === 'join'
          ? i >= 2
            ? 'joinable'
            : 'running'
          : 'fetch_add'
  const midName =
    id === 'race' ? 'int hits' : id === 'guard' ? 'mutex m' : id === 'join' ? 'destructor' : 'atomic<int>'
  const midVal =
    id === 'race' && i >= 2
      ? 'UB'
      : id === 'guard' && i >= 1
        ? i >= 3
          ? 'unlocked'
          : 'held'
        : id === 'join' && i >= 2
          ? 'joinable still'
          : id === 'atomic' && i >= 1
            ? 'seq_cst'
            : '—'
  const midNote =
    id === 'race'
      ? 'not “just an int”'
      : id === 'guard'
        ? 'RAII: all exit paths'
        : id === 'join'
          ? 'must join or detach'
          : 'one object, not a mutex'
  const rightName =
    id === 'race' ? 'thread t2' : id === 'guard' ? 'thread t2' : id === 'join' ? 'std::terminate' : 'hits'
  const rightVal =
    id === 'race' && i >= 2
      ? 'same object'
      : id === 'guard' && i >= 3
        ? 'after unlock'
        : id === 'join' && i >= 2
          ? 'abort'
          : id === 'atomic' && i >= 2
            ? 'defined'
            : '—'
  const rightNote =
    id === 'race' && trapped
      ? 'data race = UB'
      : id === 'race'
        ? 'unsynchronized write'
        : id === 'guard' && won
          ? 'serialized'
          : id === 'guard'
            ? 'waits on the lock'
            : id === 'join' && trapped
              ? 'no catch'
              : id === 'join'
                ? 'C++14: not jthread'
                : 'not a data race'

  const code =
    id === 'race'
      ? i < 2
        ? `int hits = 0;
std::thread t1([&] { ++hits; });
std::thread t2([&] { ++hits; });
t1.join();
t2.join();`
        : `// two threads, one int, no mutex
// data race → UB, not “maybe 1”`
      : id === 'guard'
        ? `std::mutex m;
int hits = 0;
std::thread t([&] {
  std::lock_guard<std::mutex> lock(m);
  ++hits;
});
t.join();`
        : id === 'join'
          ? i < 2
            ? `std::thread t(work);
// forgot t.join();`
            : `}  // ~thread while joinable
// std::terminate. C++14 has no jthread.`
          : `std::atomic<int> hits{0};
std::thread t1([&] { hits.fetch_add(1); });
std::thread t2([&] { hits.fetch_add(1); });
t1.join();
t2.join();`

  const caption =
    i === 0
      ? id === 'race'
        ? 'Play data race. Two threads writing hits with no mutex and no atomic. That is undefined behavior — the compiler may assume it never happens, not “print 1 or 2.”'
        : id === 'guard'
          ? 'Play lock_guard. The mutex serializes the increment. The guard unlocks on every exit, including throw. C++14: lock_guard / unique_lock, not scoped_lock.'
          : id === 'join'
            ? 'Play join. A joinable std::thread whose destructor runs calls terminate. join() or detach() every thread. C++20 adds jthread; this page is C++14.'
            : 'Play atomic. A single atomic object is free of data races for that object. It is not a substitute for a mutex around a bigger invariant.'
      : id === 'race' && i === 1
        ? 't1 hops ++ into hits. Alone, that write is fine. The object is still a plain int.'
        : id === 'race' && i === 2
          ? 't2 hops ++ into the same int with no happens-before. That is a data race. UB, not a “torn 1.”'
          : id === 'race'
            ? 'TSan would report this. “It’s just an int” is the most common C++ concurrency myth. Protect it or make it atomic.'
            : id === 'guard' && i === 1
              ? 'lock_guard locks m. If this constructor throws, you never entered the critical section — and you never leak a lock you didn’t take.'
              : id === 'guard' && i === 2
                ? 't1 increments under the lock. t2 cannot enter yet. The critical section is the scope of the guard.'
                : id === 'guard'
                  ? 'Unlock in the destructor. Then t2 runs. Deadlock is the other footgun: two mutexes, opposite order. std::lock (C++11) / scoped_lock (C++17).'
                  : id === 'join' && i === 1
                    ? 't is running. The std::thread object is joinable. You still own the obligation to join or detach.'
                    : id === 'join' && i === 2
                      ? 'Scope ends. ~thread sees joinable == true. The standard requires terminate, not a silent detach.'
                      : id === 'join'
                        ? 'No catch, no unwind of other threads. Join in the same scope you started, or use a wrapper that joins in its destructor (that wrapper is jthread in C++20).'
                        : i === 1
                          ? 't1 fetch_add. Default memory order is seq_cst. The modification is a single atomic RMW.'
                          : i === 2
                            ? 't2 fetch_add on the same atomic. No data race. The sum is 2. This does not protect a whole struct of fields.'
                            : 'Need a bigger invariant? mutex. Need one counter? atomic. Need a condition? wait on a predicate in a loop — spurious wakeups exist.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const stageKind = trapped ? 'th-stage--reject' : won ? 'th-stage--win' : ''

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
          Play thread
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage th-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="th-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">t1</span>
            <span className="own-name">{leftName}</span>
            <span className="mem-val">{leftVal}</span>
            <span className="mem-note">callable</span>
          </div>
          <div ref={midRef} className={`own-card${i >= 1 && !useRight ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">shared</span>
            <span className="own-name">{midName}</span>
            <span className="mem-val">{midVal}</span>
            <span className="mem-note">{midNote}</span>
          </div>
          <div
            ref={rightRef}
            className={`own-card${won ? ' own-card--unique' : ''}${trapped ? ' nd-card--ub' : ''}`}
          >
            <span className="lf-tag">{id === 'join' ? 'out' : 't2'}</span>
            <span className="own-name">{rightName}</span>
            <span className="mem-val">{rightVal}</span>
            <span className="mem-note">{rightNote}</span>
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse th-flyer${trapped || bounce ? ' th-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
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
