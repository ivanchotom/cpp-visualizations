import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'scalar' | 'array' | 'mismatch' | 'place'

const MODES: { id: Mode; title: string }[] = [
  { id: 'scalar', title: 'new T' },
  { id: 'array', title: 'new T[n]' },
  { id: 'mismatch', title: 'mismatch' },
  { id: 'place', title: 'placement' },
]

export function NewDeleteViz() {
  const [id, setId] = useState<Mode>('scalar')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const live = stepped && !recap
  const cleaned = recap
  const mismatched = id === 'mismatch' && recap
  const trap = mismatched
  const ok = cleaned && !mismatched

  const code =
    id === 'scalar'
      ? recap
        ? `delete p;  // destroy, then deallocate`
        : `T* p = new T{7};  // allocate + construct`
      : id === 'array'
        ? recap
          ? `delete[] p;  // ~T on [2], [1], [0], then free`
          : `T* p = new T[3];  // cookie + 3 objects`
        : id === 'mismatch'
          ? recap
            ? `delete p;  // not delete[]  ← UB`
            : `T* p = new T[3];`
          : recap
            ? `p->~T();  // you destroy. do not delete`
            : `T* p = new (buf) T{7};  // no allocation`

  const caption =
    i === 0
      ? id === 'scalar'
        ? 'Play new T. Allocation and construction are two steps. delete is destruction then deallocation. Prefer make_unique in app code.'
        : id === 'array'
          ? 'Play new T[n]. The implementation stores a count (a “cookie”) so delete[] can run every destructor.'
          : id === 'mismatch'
            ? 'Play delete p. new[] paired with scalar delete is undefined behavior — the cookie is not consulted.'
            : 'Play placement new. The buffer already exists. You construct in place, and you must call the destructor yourself. C++14 has no destroy_at.'
      : id === 'scalar' && i === 1
        ? 'operator new then T’s constructor. p is an address on the stack. The object lives on the heap. Stations light in place.'
        : id === 'scalar' && i === 2
          ? 'Object is live. delete nullptr is safe; this p is not null. One new, one matching delete.'
          : id === 'scalar'
            ? '~T ran, then operator delete. p is dangling — do not use it. make_unique closes the leak window if an exception fires here.'
            : id === 'array' && i === 1
              ? 'Three objects plus a hidden count. new T[n] is not “new T, n times” in a way delete can see — only delete[] knows N.'
              : id === 'array' && i === 2
                ? 'All three are constructed. Destructors will run in reverse order of construction when you delete[].'
                : id === 'array'
                  ? 'delete[] walks [2], [1], [0], then frees the block. That reverse order matches how members die in a class.'
                  : id === 'mismatch' && i === 1
                    ? 'Same allocation as the array mode: three objects and a cookie. The type of p is still T*. The cookie is not in the type.'
                    : id === 'mismatch' && i === 2
                      ? 'Scalar delete does not read the cookie. It destroys as if there were one T. The other two are leftover — UB.'
                      : id === 'mismatch'
                        ? 'UB: wrong deallocator, skipped destructors. Pair new with delete, new[] with delete[].'
                        : i === 1
                          ? 'Constructor runs inside buf. No heap block. This is how vector and optional build objects.'
                          : i === 2
                            ? 'The object is live inside the buffer. delete p would free stack memory — also UB. Storage and lifetime are separate.'
                            : 'p->~T() ends the lifetime. The buffer is still there. C++14 has no std::destroy_at; you call the destructor by name.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'scalar' ? 'Play new T' : id === 'array' ? 'Play new T[n]' : id === 'mismatch' ? 'Play delete p' : 'Play placement new'

  const verdict =
    mismatched
      ? 'delete not delete[] · cookie ignored · UB'
      : id === 'scalar' && recap
        ? '~T then operator delete · p dangling'
        : id === 'array' && recap
          ? 'delete[] · [2] [1] [0] then free'
          : id === 'place' && recap
            ? 'p->~T() · buffer still there'
            : id === 'place' && live
              ? 'constructed in buf · no heap'
              : live && (id === 'array' || id === 'mismatch')
                ? 'cookie + 3 objects'
                : live && id === 'scalar'
                  ? 'allocated + constructed'
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
      {id === 'scalar' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${cleaned ? ' fx-rank--done' : ''}`}>
            <code>new</code>
            <span className="fx-note">mem</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${cleaned ? ' fx-rank--on' : ''}${cleaned ? ' fx-rank--done' : ''}`}>
            <code>del</code>
            <span className="fx-note">free</span>
            <span className="fx-note">{cleaned ? 'gone' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'array' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${cleaned ? ' fx-rank--done' : ''}`}>
            <code>n[]</code>
            <span className="fx-note">n</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${cleaned ? ' fx-rank--on' : ''}${cleaned ? ' fx-rank--done' : ''}`}>
            <code>d[]</code>
            <span className="fx-note">rev</span>
            <span className="fx-note">{cleaned ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'mismatch' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n[]</code>
            <span className="fx-note">n</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${mismatched ? ' fx-rank--trap' : decided ? ' fx-rank--on' : ''}`}>
            <code>del</code>
            <span className="fx-note">scal</span>
            <span className="fx-note">{mismatched ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'place' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${cleaned ? ' fx-rank--done' : ''}`}>
            <code>buf</code>
            <span className="fx-note">buf</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${cleaned ? ' fx-rank--on' : ''}${cleaned ? ' fx-rank--done' : ''}`}>
            <code>~T</code>
            <span className="fx-note">dtor</span>
            <span className="fx-note">{cleaned ? 'ok' : '—'}</span>
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
