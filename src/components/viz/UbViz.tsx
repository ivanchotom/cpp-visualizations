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

const CELLS = ['1', '2', '3', '4'] as const

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
        ? 'i = 0. The read is in range. The program has a defined value. Cells light in place — no flyer.'
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

  const tone = trap ? 'trap' : okRead || unsignedOk || uninitFix || memcpyOk ? 'ok' : 'idle'
  const playLabel =
    id === 'oob' ? 'Play bounds' : id === 'overflow' ? 'Play overflow' : id === 'uninit' ? 'Play uninit' : 'Play aliasing'

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
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">int a[4]</span>
            <div className="fx-buf-row">
              {CELLS.map((ch, n) => (
                <span
                  key={n}
                  className={`fx-letter${okRead && n === 0 ? ' fx-letter--read' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}
                >
                  {stepped ? ch : '·'}
                </span>
              ))}
              <span className={`fx-letter${oobTrap ? ' fx-letter--dead' : ' fx-letter--pad'}`}>
                {oobTrap ? '*' : '·'}
              </span>
            </div>
            <span className="fx-note">{oobTrap ? '*(a+4) is not an element' : 'a+4 is a pointer only'}</span>
          </div>
          <div className={`fx-link${oobTrap ? ' fx-link--dead' : okRead ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${oobTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">a[i]</span>
            <div className={`fx-slot${oobTrap ? ' fx-slot--trap' : okRead ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">index</span>
              <span className="fx-value">{oobTrap ? '4' : okRead ? '0' : '—'}</span>
              <span className="fx-note">{oobTrap ? 'UB' : okRead ? 'value 1' : 'valid 0..3'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'overflow' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !unsignedOk ? ' fx-pane--focus' : ''}${signedTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">signed int</span>
            <div className={`fx-slot${signedTrap ? ' fx-slot--trap' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">n</span>
              <span className="fx-value">{signedTrap ? 'UB' : stepped ? 'max' : '—'}</span>
              <span className="fx-note">{signedTrap ? 'INT_MAX + 1' : 'INT_MAX'}</span>
            </div>
          </div>
          <div className={`fx-link${unsignedOk ? ' fx-link--weld' : signedTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${unsignedOk ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">unsigned</span>
            <div className={`fx-slot${unsignedOk ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">u</span>
              <span className="fx-value">{unsignedOk ? '0' : '—'}</span>
              <span className="fx-note">{unsignedOk ? 'UINT_MAX + 1 wraps' : 'modulo 2^N'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'uninit' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${uninitTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">int x</span>
            <div className="fx-buf-row">
              <span
                className={`fx-letter${
                  uninitFix ? ' fx-letter--on' : uninitTrap || stepped ? ' fx-letter--junk' : ' fx-letter--empty'
                }`}
              >
                {uninitFix ? '0' : stepped ? '?' : '·'}
              </span>
            </div>
            <span className="fx-note">{uninitFix ? 'initialized' : 'indeterminate'}</span>
          </div>
          <div className={`fx-link${uninitFix ? ' fx-link--weld' : uninitTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${uninitTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">int y</span>
            <div className="fx-buf-row">
              <span
                className={`fx-letter${
                  uninitFix ? ' fx-letter--on' : uninitTrap ? ' fx-letter--junk' : ' fx-letter--empty'
                }`}
              >
                {uninitFix ? '0' : uninitTrap ? '?' : '·'}
              </span>
            </div>
            <span className="fx-note">{uninitFix ? 'defined' : uninitTrap ? 'read is UB' : 'waiting'}</span>
          </div>
        </div>
      )}
      {id === 'alias' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">float f</span>
            <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">object</span>
              <span className="fx-value">{stepped ? '1.0' : '—'}</span>
              <span className="fx-note">type is float</span>
            </div>
          </div>
          <div className={`fx-link${memcpyOk ? ' fx-link--weld' : aliasTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${aliasTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">{memcpyOk ? 'memcpy' : 'int*'}</span>
            <div className={`fx-slot${memcpyOk ? ' fx-slot--ok' : aliasTrap ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">bits</span>
              <span className="fx-value">{memcpyOk ? 'ok' : aliasTrap ? 'UB' : '—'}</span>
              <span className="fx-note">{memcpyOk ? 'C++14 type pun' : aliasTrap ? 'strict aliasing' : 'not an int'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : okRead || unsignedOk || uninitFix || memcpyOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
