import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'decay' | 'array' | 'cstr'

const MODES: { id: Mode; title: string }[] = [
  { id: 'decay', title: 'T[N] decay' },
  { id: 'array', title: 'std::array' },
  { id: 'cstr', title: 'C-string' },
]

export function ArraysViz() {
  const [id, setId] = useState<Mode>('decay')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const cells = id === 'cstr' ? ['h', 'i', '\\0'] : ['1', '2', '3', '4']
  const srcBytes = id === 'cstr' ? 3 : 16
  const called = i >= 1
  const sized = i >= 2
  const trap = id === 'decay' && i >= 3
  const arrayCopy = id === 'array' && i >= 1 && i < 3
  const asPtr = called && (id !== 'array' || i >= 3)

  const calleeBytes = !called ? 0 : id === 'array' && i < 3 ? 16 : 8
  const calleeCount = !called
    ? '—'
    : id === 'array' && i < 3
      ? '4'
      : id === 'cstr' && sized
        ? 'until \\0'
        : trap
          ? '2??'
          : '?'

  const code =
    id === 'decay'
      ? i === 0
        ? `int a[4] = {1, 2, 3, 4};\n// sizeof(a) == 16`
        : i === 1
          ? `void f(int p[]);  // same as int*\nf(a);             // decays`
          : i === 2
            ? `void f(int* p) {\n  sizeof(p);   // 8 on LP64\n}`
            : `sizeof(p) / sizeof(*p);  // 8/4 = 2  ← lie`
      : id === 'array'
        ? i === 0
          ? `std::array<int, 4> a{{1, 2, 3, 4}};\n// a.size() == 4, sizeof 16`
          : i === 1
            ? `void take(std::array<int, 4> x);\ntake(a);  // copy, length travels`
            : i === 2
              ? `x.size();     // still 4\nsizeof(x);    // still 16`
              : `takePtr(a.data(), a.size());\n// pointer + length, on purpose`
        : i === 0
          ? `char s[] = "hi";  // {'h','i','\\0'}`
          : i === 1
            ? `void g(char* p);\ng(s);  // decays, length is the '\\0'`
            : i === 2
              ? `// p has no size. Walk until '\\0'.`
              : `Prefer std::string. strcpy overflows.`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play f(a). A built-in array is a raw block. The length lives only in the type T[N] — it does not travel.'
        : id === 'array'
          ? 'Play take(a). std::array is a thin aggregate around T[N] that can be copied and knows its size.'
          : 'Play g(s). A C-string is a char array that happens to end in a zero byte. That byte is the only length.'
      : id === 'decay' && i === 1
        ? 'a decays to int* at the call. The four cells stay on the caller. The callee never sees N.'
        : id === 'decay' && i === 2
          ? 'sizeof(p) is the pointer, 8 on LP64. The 16-byte block is still on the caller. Length is gone.'
          : id === 'decay'
            ? 'sizeof(p)/sizeof(*p) looks like an element count. It is 2. That is the decay trap — pass n, or use std::array.'
            : id === 'array' && i === 1
              ? 'The callee gets a copy. Four ints appear in place on x. Length travels with the object — no hop, no decay.'
              : id === 'array' && i === 2
                ? 'x.size() is still 4. sizeof is still 16. That is why std::array is the fixed buffer you actually want.'
                : id === 'array'
                  ? 'Need a C API? takePtr(a.data(), a.size()). You hand the length over on purpose — it is not implicit.'
                  : i === 1
                    ? 's decays to char*. The three cells stay; the callee gets an address and a hunt for \\0.'
                    : i === 2
                      ? 'No sizeof trick works. Length is a convention. Miss the terminator and you walk off the end.'
                      : 'strcpy / sprintf write past the zero. Prefer std::string, or snprintf when an API demands char*.'

  const tone = trap ? 'trap' : id === 'array' && i >= 2 ? 'ok' : 'idle'
  const calleeName = !called ? '—' : id === 'array' && i < 3 ? 'x' : 'p'
  const calleeLabel = id === 'array' && i < 3 ? 'std::array copy' : id === 'cstr' ? 'char* p' : 'int* p'

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
      playLabel="Play call"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-obj-row">
        <div className="fx-pane fx-pane--focus">
          <span className="fx-kicker">caller</span>
          <span className="fx-value">
            <code>{id === 'cstr' ? 's' : 'a'}</code>
          </span>
          <div className="fx-buf-row">
            {cells.map((c) => (
              <span key={c} className={`fx-letter fx-letter--on${c === '\\0' ? ' fx-letter--pad' : ''}`}>
                {c}
              </span>
            ))}
          </div>
          <SizeBar bytes={srcBytes} max={16} />
          <span className="fx-note">
            sizeof {srcBytes} · N={cells.length}
          </span>
        </div>
        <div className={`fx-pane${called ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">callee</span>
          <span className="fx-value">
            <code>{calleeName}</code>
          </span>
          {called && arrayCopy && (
            <div className="fx-buf-row">
              {cells.map((c) => (
                <span key={c} className="fx-letter fx-letter--on">
                  {c}
                </span>
              ))}
            </div>
          )}
          {asPtr && (
            <span className="fx-badge fx-badge--open">{id === 'cstr' ? 'char*' : 'int*'}</span>
          )}
          {called && <SizeBar bytes={calleeBytes} max={16} trap={trap} />}
          {called && (
            <span className="fx-note">
              sizeof {calleeBytes} · N={calleeCount}
            </span>
          )}
          {!called && <span className="fx-note">not called</span>}
          {called && <span className="fx-note">{calleeLabel}</span>}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : id === 'array' && i >= 2 ? 'fx-verdict--ok' : i >= 2 ? 'fx-verdict--warn' : ''
        }`}
      >
        {id === 'decay' && i === 2
          ? 'sizeof(p) == 8 · N is gone'
          : trap
            ? '8/4 = 2 · the length lied'
            : id === 'array' && i === 2
              ? 'copy still has size 4'
              : id === 'array' && i >= 3
                ? 'data() + size · length passed on purpose'
                : id === 'cstr' && i === 2
                  ? 'length is the zero byte'
                  : id === 'cstr' && i >= 3
                    ? 'prefer std::string · strcpy overflows'
                    : ''}
      </div>
    </SceneShell>
  )
}

function SizeBar({ bytes, max, trap }: { bytes: number; max: number; trap?: boolean }) {
  return (
    <div className="fx-size" aria-hidden>
      {Array.from({ length: max }, (_, n) => (
        <span
          key={n}
          className={`fx-size-unit${n < bytes ? ' fx-size-unit--on' : ''}${trap && n < bytes ? ' fx-size-unit--trap' : ''}`}
        />
      ))}
    </div>
  )
}
