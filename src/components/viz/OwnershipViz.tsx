import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Kind = 'unique' | 'shared' | 'weak'

const MODES: { id: Kind; title: string }[] = [
  { id: 'unique', title: 'unique_ptr' },
  { id: 'shared', title: 'shared_ptr' },
  { id: 'weak', title: 'weak_ptr' },
]

export function OwnershipViz() {
  const [kind, setKind] = useState<Kind>('unique')
  const stepCount = kind === 'unique' ? 4 : kind === 'shared' ? 4 : 3
  const { i, playing, play, reset } = useBeats(stepCount)

  function select(next: string) {
    reset()
    setKind(next as Kind)
  }

  const uniqueLive = kind === 'unique' && i >= 1 && i < 3
  const uniqueGone = kind === 'unique' && i >= 3
  const uniqueOn = kind === 'unique' && i >= 1

  const pOn = kind === 'shared' ? i < 3 : kind === 'weak' ? i === 0 : uniqueLive
  const qOn = kind === 'shared' && i === 1
  const useCount = kind === 'shared' ? (i === 1 ? 2 : i === 0 || i === 2 ? 1 : 0) : kind === 'weak' ? (i === 0 ? 1 : 0) : uniqueLive ? 1 : 0
  const weakCount = kind === 'weak' ? 1 : 0
  const heapOn = kind === 'unique' ? uniqueLive : kind === 'shared' ? i < 3 : i === 0
  const ctrlLive = kind === 'shared' ? i < 3 : kind === 'weak'
  const lockFail = kind === 'weak' && i >= 2
  const wOn = kind === 'weak'

  const code =
    kind === 'unique'
      ? i === 0
        ? `// no owner yet`
        : i < 3
          ? `auto p = std::make_unique<T>(42);`
          : `} // ~unique_ptr deletes T`
      : kind === 'shared'
        ? i === 0
          ? `auto p = std::make_shared<T>(42);\n// use_count == 1`
          : i === 1
            ? `auto q = p;  // use_count == 2`
            : i === 2
              ? `q.reset();  // use_count == 1`
              : `p.reset();  // use_count == 0, ~T`
        : i === 0
          ? `std::weak_ptr<T> w = p;  // use=1, weak=1`
          : i === 1
            ? `p.reset();  // T destroyed, weak still here`
            : `auto locked = w.lock();  // empty`

  const caption =
    kind === 'unique' && i === 0
      ? 'Play make_unique. Exclusive ownership is one pointer, zero overhead — no control block.'
      : kind === 'unique' && i === 1
        ? 'p is on the stack. T is on the heap. The cyan bar is the stored address.'
        : kind === 'unique' && i === 2
          ? 'Green weld: exclusive. You cannot copy a unique_ptr. Move would steal this bar; copy does not compile.'
          : kind === 'unique'
            ? 'p left scope. Destructor ran delete. No leak, no leftover pointer.'
            : kind === 'shared' && i === 0
              ? 'Play copy then last drop. One shared_ptr. The control block holds use_count = 1.'
              : kind === 'shared' && i === 1
                ? 'q is a second owner. use_count fills in place to 2. T is not cloned — both names share it.'
                : kind === 'shared' && i === 2
                  ? 'q dropped. Count falls to 1. T stays alive — last owner still holds it.'
                  : kind === 'shared'
                    ? 'Last shared_ptr died. T is destroyed. That is the shared-ownership contract.'
                    : i === 0
                      ? 'Play drop then lock(). shared_ptr keeps T alive. weak_ptr observes without bumping use_count.'
                      : i === 1
                        ? 'Last shared_ptr dropped. T is gone even though the weak observer remains. The control block stays for the weaks.'
                        : 'w.lock() returns an empty shared_ptr. The control block lives until weaks are gone too.'

  const tone =
    uniqueGone || (kind === 'shared' && i >= 3)
      ? 'ok'
      : lockFail
        ? 'trap'
        : 'idle'

  const uniqueLink = uniqueGone ? '' : uniqueLive && i >= 2 ? 'weld' : uniqueOn ? 'on' : ''
  const playLabel =
    kind === 'unique' ? 'Play make_unique → delete' : kind === 'shared' ? 'Play copy → last drop' : 'Play drop → lock()'

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
      stepCount={stepCount}
      sig={
        kind === 'unique'
          ? 'unique_ptr'
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
          <div className={`fx-pane${uniqueOn ? ' fx-pane--focus' : ''}${uniqueGone ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">stack</span>
            <div
              className={`fx-slot${uniqueLive ? ' fx-slot--weld' : uniqueGone ? ' fx-slot--dim' : uniqueOn ? ' fx-slot--focus' : ' fx-slot--dim'}`}
            >
              <span className="fx-kicker">unique_ptr</span>
              <span className="fx-value">
                <code>p</code>
              </span>
              <span className="fx-note">{uniqueLive ? 'exclusive owner' : uniqueGone ? 'destroyed' : 'no owner yet'}</span>
              {uniqueLive && <span className="fx-badge fx-badge--owner">owner</span>}
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
      ) : (
        <div className="fx-own">
          <div className="fx-pane">
            <span className="fx-kicker">owners</span>
            <div className={`fx-slot${pOn ? ' fx-slot--weld' : ' fx-slot--dim fx-pane--gone'}`}>
              <span className="fx-kicker">shared_ptr</span>
              <span className="fx-value">
                <code>p</code>
              </span>
              <span className="fx-note">{pOn ? 'owner' : 'reset'}</span>
            </div>
            {kind === 'shared' ? (
              <div className={`fx-slot${qOn ? ' fx-slot--weld' : ' fx-slot--dim'}${i >= 2 ? ' fx-pane--gone' : ''}`}>
                <span className="fx-kicker">shared_ptr</span>
                <span className="fx-value">
                  <code>q</code>
                </span>
                <span className="fx-note">{qOn ? 'copy, not clone' : i === 0 ? 'not yet' : 'reset'}</span>
              </div>
            ) : (
              <div className={`fx-slot${wOn ? ' fx-slot--focus' : ' fx-slot--dim'}${lockFail ? ' fx-slot--trap' : ''}`}>
                <span className="fx-kicker">weak_ptr</span>
                <span className="fx-value">
                  <code>w</code>
                </span>
                <span className="fx-note">{lockFail ? 'lock() empty' : 'observes, not owner'}</span>
              </div>
            )}
          </div>
          <div className={`fx-link${pOn || qOn ? ' fx-link--on' : wOn ? ' fx-link--dead' : ''}`} />
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
              <span className="fx-value">{heapOn ? '42' : i === 0 && kind === 'shared' ? '—' : 'gone'}</span>
              <span className="fx-note">{heapOn ? 'shared object' : 'destroyed'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 1 || kind !== 'unique' ? ' fx-verdict--show' : ''} ${
          lockFail ? 'fx-verdict--trap' : uniqueGone || (kind === 'shared' && i >= 3) ? 'fx-verdict--ok' : ''
        }`}
      >
        {kind === 'unique' && uniqueGone
          ? '~unique_ptr deleted T'
          : kind === 'unique' && uniqueLive && i >= 2
            ? 'exclusive · copy is deleted'
            : kind === 'unique' && uniqueOn
              ? 'p → heap T'
              : kind === 'shared' && i >= 3
                ? 'last owner gone · ~T'
                : kind === 'shared' && i === 1
                  ? 'use_count = 2 · same T'
                  : kind === 'shared' && i === 2
                    ? 'use_count = 1 · T lives'
                    : kind === 'shared'
                      ? 'use_count = 1'
                      : lockFail
                        ? 'lock() → empty shared_ptr'
                        : i === 1
                          ? 'T gone · weak remains'
                          : 'weak observes · use still 1'}
      </div>
    </SceneShell>
  )
}
