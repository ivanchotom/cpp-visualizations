import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'oob' | 'overflow' | 'uninit' | 'alias'

const MODES: { id: Mode; title: string }[] = [
  { id: 'oob', title: 'bounds' },
  { id: 'overflow', title: 'overflow' },
  { id: 'uninit', title: 'uninit' },
  { id: 'alias', title: 'aliasing' },
]

export function UbViz() {
  const [id, setId] = useState<Mode>('oob')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const okRead = id === 'oob' && i === 1
  const oobTrap = id === 'oob' && decided
  const signedTrap = id === 'overflow' && decided && !recap
  const unsignedOk = id === 'overflow' && recap
  const uninitTrap = id === 'uninit' && decided && !recap
  const uninitFix = id === 'uninit' && recap
  const aliasTrap = id === 'alias' && decided && !recap
  const memcpyOk = id === 'alias' && recap
  const trap = oobTrap || signedTrap || uninitTrap || aliasTrap
  const ok = okRead || unsignedOk || uninitFix || memcpyOk

  const code =
    id === 'oob'
      ? decided
        ? `int a[4] = {1, 2, 3, 4};
int i = 4;
int x = a[i];    // out of bounds: UB
// a+4 is a valid pointer; *(a+4) is not`
        : `int a[4] = {1, 2, 3, 4};
int i = 0;
int ok = a[i];   // fine`
      : id === 'overflow'
        ? recap
          ? `unsigned u = UINT_MAX;
u += 1;          // 0 — defined modulo 2^N
int n = INT_MAX;
n += 1;          // signed overflow: UB`
          : decided
            ? `int n = INT_MAX;
n += 1;          // signed overflow: UB`
            : `int n = INT_MAX;
// n still 2147483647`
        : id === 'uninit'
          ? recap
            ? `int z = 0;       // this is the fix
int w{};         // also zero`
            : decided
              ? `int x;
int y = x;       // uninitialized read: UB`
              : `int x;           // not zero
// do not read yet`
          : recap
            ? `int bits;
std::memcpy(&bits, &f, sizeof bits);  // C++14
// C++20 adds std::bit_cast`
            : decided
              ? `float f = 1.0f;
int n = *reinterpret_cast<int*>(&f);  // UB`
              : `float f = 1.0f;
// f's object is a float`

  const caption =
    i === 0
      ? id === 'oob'
        ? 'Play bounds. a[0] is fine. a[4] is not “one past the last element you can read.” The compiler may assume the index is always in range and delete your if.'
        : id === 'overflow'
          ? 'Play overflow. Signed int overflow is undefined. Unsigned wrap is defined. “It wrapped on my machine” is not a contract.'
          : id === 'uninit'
            ? 'Play uninit. An automatic int with no initializer is not 0. Reading it is UB — sanitizers catch this; -O2 may invent nonsense.'
            : 'Play aliasing. The object is a float. Reading it through int* is a strict-aliasing violation. C++14 copies the bits with memcpy, not a union pun.'
      : id === 'oob' && i === 1
        ? 'i = 0. The read is in range. The program has a defined value. Stations light in place — no flyer.'
        : id === 'oob' && i === 2
          ? 'i = 4. There is no element there. UB, not a crash you can catch, not “whatever is on the stack.”'
          : id === 'oob'
            ? 'a+4 is a valid pointer (one-past-last). *(a+4) is not. UBsan: index 4 out of bounds for type int [4].'
            : id === 'overflow' && i === 1
              ? 'INT_MAX sits in n. The value is still in range. The next increment is the footgun.'
              : id === 'overflow' && i === 2
                ? 'n += 1. For signed int that overflow is UB. The compiler may treat “n cannot be INT_MAX” as an invariant and drop if (n + 1 < n).'
                : id === 'overflow'
                  ? 'unsigned is modulo 2^N. If you need wrap, use unsigned. Do not “test” signed overflow at -O0 and ship it.'
                  : id === 'uninit' && i === 1
                    ? 'int x; The object exists. Its value does not. Stack leftover is a myth the abstract machine does not owe you.'
                    : id === 'uninit' && i === 2
                      ? 'int y = x is an uninitialized read. UB. Initialize at the declaration: int x = 0; or int x{};'
                      : id === 'uninit'
                        ? 'MSan/UBsan report this. “It was zero in the debugger” is still UB. Brace-init zeros scalars.'
                        : i === 1
                          ? 'float f = 1.0f. The object’s type is float. char* / memcpy may inspect the bytes. int* may not.'
                          : i === 2
                            ? 'reinterpret_cast<int*>(&f) then load. Strict aliasing: the compiler may assume a store to f never aliases this int.'
                            : 'std::memcpy(&bits, &f, sizeof bits) is the C++14-blessed type pun. C++20 adds bit_cast. Union punning is a C habit, not portable C++.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'oob' ? 'Play a[i]' : id === 'overflow' ? 'Play INT_MAX+1' : id === 'uninit' ? 'Play int x' : 'Play aliasing'

  const verdict =
    id === 'oob' && i === 1
      ? 'a[0] · in range'
      : oobTrap && !recap
        ? 'a[4] · no element'
        : oobTrap
          ? 'a+4 ok · *(a+4) UB'
          : id === 'overflow' && i === 1
            ? 'INT_MAX · still in range'
            : signedTrap
              ? 'signed +1 · UB'
              : unsignedOk
                ? 'unsigned wraps · defined'
                : id === 'uninit' && i === 1
                  ? 'object exists · value does not'
                  : uninitTrap
                    ? 'read x · UB'
                    : uninitFix
                      ? 'int x = 0 · defined'
                      : id === 'alias' && i === 1
                        ? 'object is a float'
                        : aliasTrap
                          ? 'strict aliasing · UB'
                          : memcpyOk
                            ? 'memcpy the bits · C++14'
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
      {id === 'oob' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${oobTrap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">
              <code>{'int[4]'}</code>
            </span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${oobTrap ? ' fx-rank--trap' : okRead ? ' fx-rank--on' : ''}`}>
            <code>{'a[i]'}</code>
            <span className="fx-note">index</span>
            <span className="fx-note">{oobTrap ? 'ub' : okRead ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'overflow' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${signedTrap ? ' fx-rank--trap' : ''}${unsignedOk ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">signed int</span>
            <span className="fx-note">{signedTrap ? 'ub' : stepped ? 'max' : '—'}</span>
          </div>
          <div className={`fx-rank${unsignedOk ? ' fx-rank--on' : ''}`}>
            <code>u</code>
            <span className="fx-note">unsigned wrap</span>
            <span className="fx-note">{unsignedOk ? '0' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'uninit' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${uninitTrap ? ' fx-rank--trap' : ''}${uninitFix ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">automatic</span>
            <span className="fx-note">{uninitFix ? '0' : stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${uninitTrap ? ' fx-rank--trap' : uninitFix ? ' fx-rank--on' : ''}`}>
            <code>y</code>
            <span className="fx-note">copy of x</span>
            <span className="fx-note">{uninitFix ? '0' : uninitTrap ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'alias' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${memcpyOk ? ' fx-rank--done' : ''}`}>
            <code>f</code>
            <span className="fx-note">float object</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${aliasTrap ? ' fx-rank--trap' : memcpyOk ? ' fx-rank--on' : ''}`}>
            <code>{memcpyOk ? 'cpy' : 'p'}</code>
            <span className="fx-note">{memcpyOk ? 'memcpy bits' : 'int* load'}</span>
            <span className="fx-note">{memcpyOk ? 'ok' : aliasTrap ? 'ub' : '—'}</span>
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
