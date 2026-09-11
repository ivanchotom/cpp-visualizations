import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'race' | 'guard' | 'join' | 'atomic'

const MODES: { id: Mode; title: string }[] = [
  { id: 'race', title: 'data race' },
  { id: 'guard', title: 'lock_guard' },
  { id: 'join', title: 'join' },
  { id: 'atomic', title: 'atomic' },
]

export function ConcurrencyViz() {
  const [id, setId] = useState<Mode>('race')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const raced = id === 'race' && decided
  const joinTrap = id === 'join' && decided
  const locked = id === 'guard' && i === 1
  const serialized = id === 'guard' && recap
  const atomicOk = id === 'atomic' && decided

  const code =
    id === 'race'
      ? decided
        ? `// two threads, one int, no mutex
// data race → UB, not “maybe 1”`
        : `int hits = 0;
std::thread t1([&] { ++hits; });
std::thread t2([&] { ++hits; });
t1.join();
t2.join();`
      : id === 'guard'
        ? `std::mutex m;
int hits = 0;
std::thread t([&] {
  std::lock_guard<std::mutex> lock(m);
  ++hits;
});
t.join();`
        : id === 'join'
          ? decided
            ? `}  // ~thread while joinable
// std::terminate. C++14 has no jthread.`
            : `std::thread t(work);
// forgot t.join();`
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
        ? 't1 writes ++hits. Alone, that write is fine. The object is still a plain int — no happens-before with anyone else yet.'
        : id === 'race' && i === 2
          ? 't2 writes ++ into the same int with no happens-before. That is a data race. UB, not a “torn 1.”'
          : id === 'race'
            ? 'TSan would report this. “It’s just an int” is the most common C++ concurrency myth. Protect it or make it atomic.'
            : id === 'guard' && i === 1
              ? 'lock_guard locks m. The green weld is the lock, not a copy. If this constructor throws, you never entered the critical section.'
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
                          ? 't1 fetch_add. Default memory order is seq_cst. The modification is a single atomic RMW. The pip fills in place.'
                          : i === 2
                            ? 't2 fetch_add on the same atomic. No data race. The sum is 2. This does not protect a whole struct of fields.'
                            : 'Need a bigger invariant? mutex. Need one counter? atomic. Need a condition? wait on a predicate in a loop — spurious wakeups exist.'

  const tone = raced || joinTrap ? 'trap' : serialized || atomicOk ? 'ok' : 'idle'
  const playLabel =
    id === 'race' ? 'Play ++hits' : id === 'guard' ? 'Play lock_guard' : id === 'join' ? 'Play ~thread' : 'Play fetch_add'

  const inName = id === 'join' ? 'std::thread t' : 'thread t1'
  const inVal =
    id === 'race'
      ? '++hits'
      : id === 'guard'
        ? 'lock then ++'
        : id === 'join'
          ? decided
            ? 'joinable'
            : 'running'
          : 'fetch_add'
  const midName = id === 'race' ? 'int hits' : id === 'guard' ? 'mutex m' : id === 'join' ? 'destructor' : 'atomic<int>'
  const midVal =
    raced
      ? 'UB'
      : id === 'guard' && stepped
        ? recap
          ? 'unlocked'
          : 'held'
        : joinTrap
          ? 'joinable still'
          : id === 'atomic' && stepped
            ? 'seq_cst'
            : '—'
  const outName = id === 'join' ? 'std::terminate' : id === 'atomic' ? 'hits' : 'thread t2'
  const outVal = raced ? 'same object' : serialized ? 'after unlock' : joinTrap ? 'abort' : atomicOk ? '2' : '—'

  const leftLink = stepped ? (id === 'guard' && !recap ? 'fx-link--weld' : raced || joinTrap ? 'fx-link--dead' : 'fx-link--on') : ''
  const rightLink = raced || joinTrap ? 'fx-link--dead' : serialized || atomicOk ? 'fx-link--weld' : locked ? 'fx-link--on' : ''

  const hits =
    id === 'race'
      ? raced
        ? 2
        : i === 1
          ? 1
          : 0
      : id === 'guard'
        ? recap
          ? 2
          : i === 2
            ? 1
            : 0
        : id === 'atomic'
          ? atomicOk
            ? 2
            : i === 1
              ? 1
              : 0
          : 0

  const verdict =
    id === 'race' && i === 1
      ? 't1 wrote · still a plain int'
      : raced
        ? 'data race · UB'
        : locked
          ? 'lock_guard · m held'
          : id === 'guard' && i === 2
            ? 'critical section · t2 waits'
            : serialized
              ? 'serialized · RAII unlock'
              : id === 'join' && i === 1
                ? 'joinable · must join or detach'
                : joinTrap
                  ? '~thread joinable · terminate'
                  : id === 'atomic' && i === 1
                    ? 'fetch_add · seq_cst'
                    : atomicOk
                      ? 'no data race · hits = 2'
                      : ''

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setId(id)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">t1</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">callable</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${raced || joinTrap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">shared</span>
          <div
            className={`fx-slot${
              raced || joinTrap
                ? ' fx-slot--trap'
                : id === 'guard' && stepped && !recap
                  ? ' fx-slot--weld'
                  : atomicOk
                    ? ' fx-slot--ok'
                    : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            {id !== 'join' && (
              <div className="fx-count" aria-hidden>
                {[0, 1].map((n) => (
                  <span key={n} className={`fx-count-pip${n < hits ? ' fx-count-pip--on' : ''}`} />
                ))}
              </div>
            )}
            <span className="fx-note">
              {id === 'race'
                ? 'not “just an int”'
                : id === 'guard'
                  ? 'RAII: all exit paths'
                  : id === 'join'
                    ? 'must join or detach'
                    : 'one object, not a mutex'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${raced || joinTrap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">{id === 'join' ? 'out' : 't2'}</span>
          <div
            className={`fx-slot${
              raced || joinTrap ? ' fx-slot--trap' : serialized || atomicOk ? ' fx-slot--ok' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {raced
                ? 'data race = UB'
                : serialized
                  ? 'serialized'
                  : joinTrap
                    ? 'no catch'
                    : atomicOk
                      ? 'not a data race'
                      : id === 'guard'
                        ? 'waits on the lock'
                        : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          raced || joinTrap ? 'fx-verdict--trap' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
