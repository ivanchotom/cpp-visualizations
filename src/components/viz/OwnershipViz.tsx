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
  const lockFail = kind === 'weak' && recap
  const trap = lockFail
  const ok =
    (kind === 'unique' && recap) || (kind === 'move' && recap) || (kind === 'shared' && recap)

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
          ? recap
            ? `p.reset();  // use_count == 0, ~T`
            : `auto p = std::make_shared<T>(42);
auto q = p;  // use_count == 2`
          : recap
            ? `auto locked = w.lock();  // empty`
            : `std::weak_ptr<T> w = p;
p.reset();  // T destroyed, weak still here`

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
        ? 'p is on the stack. T is on the heap. Exclusive, not a raw observer. Stations light in place.'
        : kind === 'unique' && i === 2
          ? 'You cannot copy a unique_ptr. The copy constructor is deleted. Move would steal the stored address.'
          : kind === 'unique'
            ? 'p left scope. Destructor ran delete. No leak, no leftover pointer. That is RAII for the heap.'
            : kind === 'move' && i === 1
              ? 'p owns T. q does not exist yet. There is still one owner. Copy would not compile.'
              : kind === 'move' && i === 2
                ? 'std::move(p). q now holds the address. p is empty (nullptr). T did not move — the pointer did.'
                : kind === 'move'
                  ? 'Copy is deleted. unique_ptr encodes exclusive ownership in the type. After the steal, only q may delete T.'
                  : kind === 'shared' && i === 1
                    ? 'q is a second owner. use_count is 2. T is not cloned — both names share it.'
                    : kind === 'shared' && i === 2
                      ? 'q dropped. Count falls to 1. T stays alive — last owner still holds it.'
                      : kind === 'shared'
                        ? 'Last shared_ptr died. T is destroyed. That is the shared-ownership contract.'
                        : i === 1
                          ? 'w observes p. use_count stays 1. T stays alive because of p, not because of w.'
                          : i === 2
                            ? 'Last shared_ptr dropped. T is gone even though the weak observer remains.'
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

  const verdict =
    kind === 'unique' && recap
      ? '~unique_ptr deleted T'
      : kind === 'unique' && decided
        ? 'exclusive · copy is deleted'
        : kind === 'unique' && stepped
          ? 'p → heap T'
          : kind === 'move' && recap
            ? 'copy deleted · q stole T'
            : kind === 'move' && decided
              ? 'p empty · q exclusive'
              : kind === 'move' && stepped
                ? 'p exclusive · q not yet'
                : kind === 'shared' && recap
                  ? 'last owner gone · ~T'
                  : kind === 'shared' && decided
                    ? 'use_count = 1 · T lives'
                    : kind === 'shared' && stepped
                      ? 'use_count = 2 · same T'
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
      sig={MODES.find((m) => m.id === kind)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {kind === 'unique' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">up</span>
            <span className="fx-note">{recap ? 'gone' : stepped ? 'own' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">hp</span>
            <span className="fx-note">{recap ? 'ok' : decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {kind === 'move' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">up</span>
            <span className="fx-note">{decided ? 'gone' : stepped ? 'own' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>q</code>
            <span className="fx-note">up</span>
            <span className="fx-note">{decided ? 'own' : '—'}</span>
          </div>
        </div>
      )}
      {kind === 'shared' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">use</span>
            <span className="fx-note">{recap ? '0' : decided ? '1' : stepped ? '2' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">hp</span>
            <span className="fx-note">{recap ? 'gone' : decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {kind === 'weak' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--trap' : ''}`}>
            <code>T</code>
            <span className="fx-note">hp</span>
            <span className="fx-note">{decided ? 'gone' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${lockFail ? ' fx-rank--trap' : ''}`}>
            <code>lk</code>
            <span className="fx-note">try</span>
            <span className="fx-note">{lockFail ? 'no' : '—'}</span>
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
