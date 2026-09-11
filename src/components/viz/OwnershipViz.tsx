import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Kind = 'unique' | 'move' | 'shared' | 'weak'

const MODES: { id: Kind; title: string }[] = [
  { id: 'unique', title: 'unique_ptr' },
  { id: 'move', title: 'move' },
  { id: 'shared', title: 'shared_ptr' },
  { id: 'weak', title: 'weak_ptr' },
]

export function OwnershipViz() {
  const [kind, setKind] = useState<Kind>('unique')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setKind(next as Kind)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const uniqueLive = kind === 'unique' && stepped && !recap
  const uniqueGone = kind === 'unique' && recap
  const pOwnsUnique = uniqueLive
  const qOwnsMove = kind === 'move' && decided
  const pOwnsMove = kind === 'move' && stepped && !decided
  const pShared = kind === 'shared' && !recap
  const qShared = kind === 'shared' && i === 1
  const pWeakOwner = kind === 'weak' && !decided
  const wLive = kind === 'weak' && stepped
  const lockFail = kind === 'weak' && recap

  const useCount =
    kind === 'shared' ? (i === 1 ? 2 : i === 0 || i === 2 ? 1 : 0) : kind === 'weak' ? (pWeakOwner ? 1 : 0) : pOwnsUnique || pOwnsMove || qOwnsMove ? 1 : 0
  const weakCount = kind === 'weak' && stepped ? 1 : 0
  const heapOn =
    kind === 'unique'
      ? uniqueLive
      : kind === 'move'
        ? stepped
        : kind === 'shared'
          ? !recap
          : kind === 'weak' && !decided
  const ctrlLive = kind === 'shared' ? !recap : kind === 'weak' && stepped
  const trap = lockFail
  const ok = uniqueGone || (kind === 'shared' && recap) || (kind === 'move' && recap)

  const code =
    kind === 'unique'
      ? recap
        ? `} // ~unique_ptr deletes T`
        : `auto p = std::make_unique<T>(42);`
      : kind === 'move'
        ? recap
          ? `auto q = std::move(p);
// p is empty · q owns T
// copy is deleted`
          : `auto p = std::make_unique<T>(42);
auto q = std::move(p);`
        : kind === 'shared'
          ? i === 0
            ? `auto p = std::make_shared<T>(42);
// use_count == 1`
            : i === 1
              ? `auto q = p;  // use_count == 2`
              : i === 2
                ? `q.reset();  // use_count == 1`
                : `p.reset();  // use_count == 0, ~T`
          : recap
            ? `auto locked = w.lock();  // empty`
            : decided
              ? `p.reset();  // T destroyed, weak still here`
              : `std::weak_ptr<T> w = p;  // use=1, weak=1`

  const caption =
    i === 0
      ? kind === 'unique'
        ? 'Play make_unique. Exclusive ownership is one pointer, zero overhead — no control block. C++14: std::make_unique.'
        : kind === 'move'
          ? 'Play std::move. unique_ptr is move-only. Copy is deleted. Move steals the stored pointer; the source becomes empty.'
          : kind === 'shared'
            ? 'Play copy. shared_ptr copies share one T. The control block holds use_count. T is not cloned.'
            : 'Play lock(). weak_ptr observes without bumping use_count. lock() either promotes to shared_ptr or returns empty.'
      : kind === 'unique' && i === 1
        ? 'p is on the stack. T is on the heap. The cyan bar is the stored address — exclusive, not a raw observer.'
        : kind === 'unique' && i === 2
          ? 'Green weld: exclusive. You cannot copy a unique_ptr. The copy constructor is deleted. Move would steal this bar.'
          : kind === 'unique'
            ? 'p left scope. Destructor ran delete. No leak, no leftover pointer. That is RAII for the heap.'
            : kind === 'move' && i === 1
              ? 'p owns T. q does not exist yet. There is still one owner. Copy would not compile.'
              : kind === 'move' && i === 2
                ? 'std::move(p). q now holds the address. p is empty (nullptr). T did not move — the pointer did.'
                : kind === 'move'
                  ? 'Copy is deleted. unique_ptr encodes exclusive ownership in the type. After the steal, only q may delete T.'
                  : kind === 'shared' && i === 1
                    ? 'q is a second owner. use_count fills in place to 2. T is not cloned — both names share it.'
                    : kind === 'shared' && i === 2
                      ? 'q dropped. Count falls to 1. T stays alive — last owner still holds it.'
                      : kind === 'shared'
                        ? 'Last shared_ptr died. T is destroyed. That is the shared-ownership contract.'
                        : i === 1
                          ? 'w observes p. use_count stays 1. weak_count is 1. T stays alive because of p, not because of w.'
                          : i === 2
                            ? 'Last shared_ptr dropped. T is gone even though the weak observer remains. The control block stays for the weaks.'
                            : 'w.lock() returns an empty shared_ptr. The control block lives until weaks are gone too.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    kind === 'unique'
      ? 'Play make_unique'
      : kind === 'move'
        ? 'Play std::move'
        : kind === 'shared'
          ? 'Play copy'
          : 'Play lock()'

  const uniqueLink = uniqueGone ? '' : uniqueLive && decided ? 'weld' : uniqueLive ? 'on' : ''

  const verdict =
    kind === 'unique' && uniqueGone
      ? '~unique_ptr deleted T'
      : kind === 'unique' && uniqueLive && decided
        ? 'exclusive · copy is deleted'
        : kind === 'unique' && uniqueLive
          ? 'p → heap T'
          : kind === 'move' && recap
            ? 'copy deleted · q stole T'
            : kind === 'move' && qOwnsMove
              ? 'p empty · q exclusive'
              : kind === 'move' && pOwnsMove
                ? 'p exclusive · q not yet'
                : kind === 'shared' && recap
                  ? 'last owner gone · ~T'
                  : kind === 'shared' && i === 1
                    ? 'use_count = 2 · same T'
                    : kind === 'shared' && i === 2
                      ? 'use_count = 1 · T lives'
                      : kind === 'shared'
                        ? 'use_count = 1'
                        : lockFail
                          ? 'lock() → empty shared_ptr'
                          : kind === 'weak' && decided
                            ? 'T gone · weak remains'
                            : kind === 'weak' && stepped
                              ? 'weak observes · use still 1'
                              : ''

  return (
    <SceneShell
      modes={MODES}
      mode={kind}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setKind(kind)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={
        kind === 'unique'
          ? 'unique_ptr'
          : kind === 'move'
            ? 'move-only'
            : kind === 'shared'
              ? `use = ${useCount}`
              : `use = ${useCount} · weak = ${weakCount}`
      }
      caption={caption}
      code={code}
      tone={tone}
    >
      {kind === 'unique' ? (
        <div className="fx-sh">
          <div className={`fx-pane${pOwnsUnique ? ' fx-pane--focus' : ''}${uniqueGone ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">stack</span>
            <div
              className={`fx-slot${pOwnsUnique && decided ? ' fx-slot--weld' : pOwnsUnique ? ' fx-slot--focus' : ' fx-slot--dim'}${
                uniqueGone ? ' fx-pane--gone' : ''
              }`}
            >
              <span className="fx-kicker">unique_ptr</span>
              <span className="fx-value">
                <code>p</code>
              </span>
              <span className="fx-note">{pOwnsUnique ? 'exclusive owner' : uniqueGone ? 'destroyed' : 'no owner yet'}</span>
              {pOwnsUnique && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
          </div>
          <div className={`fx-link${uniqueLink ? ` fx-link--${uniqueLink}` : ''}`} />
          <div className={`fx-pane${heapOn ? ' fx-pane--focus' : ''}${uniqueGone ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">heap</span>
            <div className={`fx-slot${heapOn ? '' : ' fx-slot--dim'}${uniqueGone ? ' fx-pane--gone' : ''}`}>
              <span className="fx-kicker">T</span>
              <span className="fx-value">{heapOn ? '42' : uniqueGone ? 'gone' : '—'}</span>
              <span className="fx-note">{heapOn ? 'one owner, zero overhead' : uniqueGone ? 'deleted' : 'not allocated'}</span>
            </div>
          </div>
        </div>
      ) : kind === 'move' ? (
        <div className="fx-own">
          <div className="fx-pane">
            <span className="fx-kicker">source</span>
            <div className={`fx-slot${pOwnsMove ? ' fx-slot--weld' : ' fx-slot--dim'}${qOwnsMove ? ' fx-pane--gone' : ''}`}>
              <span className="fx-kicker">unique_ptr</span>
              <span className="fx-value">
                <code>p</code>
              </span>
              <span className="fx-note">{pOwnsMove ? 'exclusive' : qOwnsMove ? 'empty after move' : 'no owner yet'}</span>
              {pOwnsMove && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
          </div>
          <div className={`fx-link${pOwnsMove ? ' fx-link--weld' : qOwnsMove ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${heapOn ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">heap</span>
            <div className={`fx-slot${heapOn ? '' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">T</span>
              <span className="fx-value">{heapOn ? '42' : '—'}</span>
              <span className="fx-note">{heapOn ? 'T stayed put' : 'not allocated'}</span>
            </div>
          </div>
          <div className={`fx-link${qOwnsMove ? ' fx-link--weld' : ''}`} />
          <div className="fx-pane">
            <span className="fx-kicker">destination</span>
            <div className={`fx-slot${qOwnsMove ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">unique_ptr</span>
              <span className="fx-value">
                <code>q</code>
              </span>
              <span className="fx-note">{qOwnsMove ? 'stole the pointer' : 'not yet'}</span>
              {qOwnsMove && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="fx-own">
          <div className="fx-pane">
            <span className="fx-kicker">owners</span>
            <div className={`fx-slot${kind === 'shared' ? (pShared ? ' fx-slot--weld' : ' fx-slot--dim fx-pane--gone') : pWeakOwner ? ' fx-slot--weld' : ' fx-slot--dim fx-pane--gone'}`}>
              <span className="fx-kicker">shared_ptr</span>
              <span className="fx-value">
                <code>p</code>
              </span>
              <span className="fx-note">{kind === 'shared' ? (pShared ? 'owner' : 'reset') : pWeakOwner ? 'owner' : 'reset'}</span>
            </div>
            {kind === 'shared' ? (
              <div className={`fx-slot${qShared ? ' fx-slot--weld' : ' fx-slot--dim'}${i >= 2 ? ' fx-pane--gone' : ''}`}>
                <span className="fx-kicker">shared_ptr</span>
                <span className="fx-value">
                  <code>q</code>
                </span>
                <span className="fx-note">{qShared ? 'copy, not clone' : i === 0 ? 'not yet' : 'reset'}</span>
              </div>
            ) : (
              <div className={`fx-slot${wLive ? ' fx-slot--focus' : ' fx-slot--dim'}${lockFail ? ' fx-slot--trap' : ''}`}>
                <span className="fx-kicker">weak_ptr</span>
                <span className="fx-value">
                  <code>w</code>
                </span>
                <span className="fx-note">{lockFail ? 'lock() empty' : wLive ? 'observes, not owner' : 'not yet'}</span>
              </div>
            )}
          </div>
          <div className={`fx-link${(kind === 'shared' ? pShared || qShared : pWeakOwner) ? ' fx-link--on' : wLive ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${ctrlLive ? ' fx-pane--focus' : ' fx-pane--gone'}`}>
            <span className="fx-kicker">control block</span>
            <span className="fx-note">use_count</span>
            <div className="fx-count">
              {[0, 1].map((n) => (
                <span key={n} className={`fx-count-pip${n < useCount ? ' fx-count-pip--on' : ''}`} />
              ))}
            </div>
            <span className="fx-note">
              use = {useCount}
              {kind === 'weak' ? ` · weak = ${weakCount}` : ''}
            </span>
          </div>
          <div className={`fx-link${heapOn ? (kind === 'weak' ? ' fx-link--on' : ' fx-link--weld') : ''}`} />
          <div className={`fx-pane${heapOn ? ' fx-pane--focus' : ' fx-pane--gone'}`}>
            <span className="fx-kicker">heap</span>
            <div className={`fx-slot${heapOn ? '' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">T</span>
              <span className="fx-value">{heapOn ? '42' : 'gone'}</span>
              <span className="fx-note">{heapOn ? 'shared object' : 'destroyed'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
