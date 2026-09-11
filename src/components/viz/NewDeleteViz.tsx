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

const CELLS = ['A', 'B', 'C'] as const

export function NewDeleteViz() {
  const [id, setId] = useState<Mode>('scalar')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const allocated = i >= 1
  const live = i >= 1 && i < 3
  const cleaned = i >= 3
  const isArray = id === 'array' || id === 'mismatch'
  const mismatched = id === 'mismatch' && cleaned
  const placed = id === 'place'
  const heapOn = allocated && !(cleaned && id !== 'mismatch')
  const leftover = mismatched
  const ptrVal = !allocated ? 'unset' : cleaned && id !== 'mismatch' ? 'dangling' : '0xH0'
  const weld = live || leftover

  const code =
    id === 'scalar'
      ? i === 0
        ? `T* p;  // not yet allocated`
        : i === 1 || i === 2
          ? `T* p = new T{7};  // allocate + construct`
          : `delete p;  // destroy, then deallocate`
      : id === 'array'
        ? i === 0
          ? `T* p;  // not yet allocated`
          : i === 1 || i === 2
            ? `T* p = new T[3];  // cookie + 3 objects`
            : `delete[] p;  // ~T on [2], [1], [0], then free`
        : id === 'mismatch'
          ? i < 3
            ? `T* p = new T[3];`
            : `delete p;  // not delete[]  ← UB`
          : i === 0
            ? `alignas(T) unsigned char buf[sizeof(T)];`
            : i < 3
              ? `T* p = new (buf) T{7};  // no allocation`
              : `p->~T();  // you destroy. do not delete`

  const caption =
    i === 0
      ? id === 'scalar'
        ? 'Play new. Allocation and construction are two steps. delete is destruction then deallocation. Prefer make_unique in app code.'
        : id === 'array'
          ? 'Play new T[n]. The implementation stores a count (a “cookie”) so delete[] can run every destructor.'
          : id === 'mismatch'
            ? 'Play the trap. new[] paired with scalar delete is undefined behavior — the cookie is not consulted.'
            : 'Play placement new. The buffer already exists. You construct in place, and you must call the destructor yourself. C++14 has no destroy_at.'
      : id === 'scalar' && i === 1
        ? 'operator new then T’s constructor. p is an address on the stack. The object lives on the heap. No hop — cells light in place.'
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

  const tone = leftover ? 'trap' : cleaned && id !== 'mismatch' ? 'ok' : 'idle'
  const linkKind = leftover ? 'dead' : placed && weld ? 'weld' : weld ? 'on' : ''
  const visible = leftover ? CELLS : isArray ? CELLS : (['T'] as const)
  const dead = leftover ? ['B', 'C'] : []

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
      playLabel="Play new"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-sh">
        <div className={`fx-pane${allocated ? ' fx-pane--focus' : ''}${cleaned && !mismatched ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">{placed ? 'stack buffer' : 'stack'}</span>
          <span className="fx-value">
            <code>p</code>
          </span>
          <span className="fx-note">{ptrVal}</span>
          {placed && <span className="fx-badge fx-badge--open">alignas(T) buf</span>}
          {cleaned && id === 'scalar' && <span className="fx-note">do not use</span>}
        </div>
        <div
          className={`fx-link${linkKind === 'on' ? ' fx-link--on' : ''}${linkKind === 'weld' ? ' fx-link--weld' : ''}${
            linkKind === 'dead' ? ' fx-link--dead' : ''
          }`}
        />
        <div
          className={`fx-pane${heapOn || leftover ? ' fx-pane--focus' : ''}${leftover ? ' fx-pane--trap' : ''}${
            cleaned && id !== 'mismatch' && !placed ? ' fx-pane--gone' : ''
          }`}
        >
          <span className="fx-kicker">{placed ? 'lifetime in buf' : 'heap'}</span>
          {heapOn || leftover ? (
            <>
              <div className="fx-buf-row">
                {visible.map((c) => (
                  <span
                    key={c}
                    className={`fx-letter${dead.includes(c) ? ' fx-letter--empty fx-letter--pad' : ' fx-letter--on'}`}
                  >
                    {isArray ? c : '7'}
                  </span>
                ))}
              </div>
              <span className="fx-note">
                {isArray ? (mismatched ? 'cookie unread' : 'N=3') : placed ? 'no operator new' : 'one T'}
              </span>
            </>
          ) : cleaned && placed ? (
            <>
              <span className="fx-value">buf</span>
              <span className="fx-note">raw bytes · storage remains</span>
            </>
          ) : cleaned ? (
            <>
              <span className="fx-value">freed</span>
              <span className="fx-note">{id === 'array' ? 'delete[] · dtors reverse' : 'deleted'}</span>
            </>
          ) : (
            <span className="fx-note">no object</span>
          )}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          leftover ? 'fx-verdict--trap' : cleaned ? 'fx-verdict--ok' : ''
        }`}
      >
        {leftover
          ? 'delete not delete[] · cookie ignored · UB'
          : id === 'scalar' && cleaned
            ? '~T then operator delete · p dangling'
            : id === 'array' && cleaned
              ? 'delete[] · [2] [1] [0] then free'
              : id === 'place' && cleaned
                ? 'p->~T() · buffer still there'
                : id === 'place' && live
                  ? 'constructed in buf · no heap'
                  : live && isArray
                    ? 'cookie + 3 objects'
                    : live
                      ? 'allocated + constructed'
                      : ''}
      </div>
    </SceneShell>
  )
}
