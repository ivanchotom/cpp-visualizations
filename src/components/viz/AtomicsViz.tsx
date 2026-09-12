import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'seq' | 'pub' | 'relaxed' | 'cas'

const MODES: { id: Mode; title: string }[] = [
  { id: 'seq', title: 'seq_cst' },
  { id: 'pub', title: 'publish' },
  { id: 'relaxed', title: 'relaxed' },
  { id: 'cas', title: 'CAS' },
]

export function AtomicsViz() {
  const [id, setId] = useState<Mode>('seq')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const relaxedTrap = id === 'relaxed' && decided
  const casFail = id === 'cas' && i === 2
  const casWin = id === 'cas' && recap
  const seqOk = id === 'seq' && decided
  const pubOk = id === 'pub' && decided
  const trap = relaxedTrap
  const warn = casFail
  const ok = seqOk || pubOk || casWin

  const code =
    id === 'seq'
      ? `std::atomic<int> x{0};
// default memory_order_seq_cst
x.store(1);
int v = x.load();          // 1
// a total order of all seq_cst ops`
      : id === 'pub'
        ? decided
          ? `if (ready.load(std::memory_order_acquire)) {
  use(payload);            // sees 7
}`
          : `payload = compute();                       // 7
ready.store(true, std::memory_order_release);`
        : id === 'relaxed'
          ? decided
            ? `if (ready.load(std::memory_order_relaxed)) {
  use(payload);            // no happens-before
}                          // data race / stale`
            : `payload = compute();                       // non-atomic
ready.store(true, std::memory_order_relaxed);`
          : recap
            ? `int e = 0;
while (!x.compare_exchange_weak(e, 1)) {
  e = 0;                   // retry; e was updated
}
// strong: no spurious fail, still in a loop
// if another thread can win`
            : `int e = 0;
bool ok = x.compare_exchange_weak(
    e, 1);                 // may fail spuriously
// e is overwritten with the current value`

  const caption =
    i === 0
      ? id === 'seq'
        ? 'Play seq_cst. A data race on a non-atomic is UB, not a torn read. atomic<T> loads and stores are atomic. Start with seq_cst — the default.'
        : id === 'pub'
          ? 'Play release/acquire. Write the payload, then a release store on a flag. An acquire load of that flag synchronizes-with the store and sees the payload.'
          : id === 'relaxed'
            ? 'Play relaxed. Relaxed is for a counter you do not use as a signal. A relaxed flag does not publish a non-atomic payload. That is still a data race.'
            : 'Play CAS. compare_exchange_weak may fail spuriously — correct inside a retry loop. strong fails only when the value truly differs.'
      : id === 'seq' && i === 1
        ? 'store writes 1 into the atomic. seq_cst is a total order of all seq_cst operations. Slowest, easiest to reason about. T should be trivially copyable.'
        : id === 'seq' && i === 2
          ? 'load sees 1. is_lock_free() tells you if the implementation hid a mutex. mutex + lock_guard remains the default for anything bigger than a counter or a flag.'
          : id === 'seq'
            ? 'Sharing a mutex without documenting which data it guards is the other half of this page. Atomic does not replace a protocol.'
            : id === 'pub' && i === 1
              ? 'payload = 7 first. The non-atomic write happens-before the release store in this thread. Order in one thread is still sequenced-before. Stations light in place.'
              : id === 'pub' && i === 2
                ? 'The listener’s acquire load synchronizes-with that store, so it is allowed to see payload = 7. That is the publish protocol.'
                : id === 'pub'
                  ? 'Release/acquire is not seq_cst: two independent flags can be seen in different orders. Use it when you have measured and you know the protocol.'
                  : id === 'relaxed' && i === 1
                    ? 'flag stores relaxed. The counter-style increment (fetch_add relaxed) is fine. Using the same order to publish a payload is not.'
                    : id === 'relaxed' && i === 2
                      ? 'No happens-before from the flag to the listener. A non-atomic write in one thread and a read in another is UB, even for a bool payload.'
                      : id === 'relaxed'
                        ? 'Using relaxed everywhere because it is faster loses the happens-before you needed. Measure first; then write the protocol down.'
                        : i === 1
                          ? 'CAS: expected 0, desired 1. The atomic compares, and on success stores 1. expected is an in/out parameter.'
                          : i === 2
                            ? 'weak fails spuriously. The value is still 0, but the call returned false. That is not a bug if the next line retries.'
                            : 'retry wins. compare_exchange_strong would not have failed that time — still loop while another thread can change the value.'

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'seq' ? 'Play seq_cst' : id === 'pub' ? 'Play release/acquire' : id === 'relaxed' ? 'Play relaxed' : 'Play CAS'

  const verdict =
    id === 'seq' && i === 1
      ? 'store · seq_cst total order'
      : seqOk
        ? 'load · 1'
        : id === 'pub' && i === 1
          ? 'payload then flag'
          : pubOk
            ? 'acquire saw release'
            : id === 'relaxed' && i === 1
              ? 'relaxed flag · no sync'
              : relaxedTrap
                ? 'no happens-before · data race'
                : id === 'cas' && i === 1
                  ? 'CAS · expected 0'
                  : casFail
                    ? 'weak fail · retry'
                    : casWin
                      ? 'retry · stored 1'
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
      {id === 'seq' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">st</span>
            <span className="fx-note">{stepped ? '1' : '—'}</span>
          </div>
          <div className={`fx-rank${seqOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>v</code>
            <span className="fx-note">ld</span>
            <span className="fx-note">{seqOk ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'pub' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>data</code>
            <span className="fx-note">wr</span>
            <span className="fx-note">{stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>flag</code>
            <span className="fx-note">rel</span>
            <span className="fx-note">{pubOk ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'relaxed' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${relaxedTrap ? ' fx-rank--trap' : ''}`}>
            <code>data</code>
            <span className="fx-note">na</span>
            <span className="fx-note">{relaxedTrap ? 'ub' : stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${relaxedTrap ? ' fx-rank--trap' : ''}`}>
            <code>flag</code>
            <span className="fx-note">relx</span>
            <span className="fx-note">{decided ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cas' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>e</code>
            <span className="fx-note">exp</span>
            <span className="fx-note">{stepped ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${casFail ? ' fx-rank--trap' : ''}${casWin ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">cas</span>
            <span className="fx-note">{casWin ? '1' : casFail ? 'fail' : stepped ? '0' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : warn ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
