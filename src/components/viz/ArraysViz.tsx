import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'decay' | 'array' | 'cstr' | 'vec'

const MODES: { id: Mode; title: string }[] = [
  { id: 'decay', title: 'T[N] decay' },
  { id: 'array', title: 'std::array' },
  { id: 'cstr', title: 'C-string' },
  { id: 'vec', title: 'std::vector' },
]

export function ArraysViz() {
  const [id, setId] = useState<Mode>('decay')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const cells = id === 'cstr' ? ['h', 'i', '\\0'] : ['1', '2', '3', '4']
  const srcBytes = id === 'cstr' ? 3 : 16
  const called = id === 'vec' ? decided : stepped
  const decayDead = id === 'decay' && decided
  const trap = id === 'decay' && recap
  const arrayCopy = id === 'array' && stepped && !recap
  const asPtr = called && (id === 'decay' || id === 'cstr' || (id === 'array' && recap) || id === 'vec')
  const vecFill = id === 'vec' ? (i === 0 ? ['1', '2', '3'] : ['1', '2', '3', '4']) : cells
  const vecCap = 4

  const calleeBytes = !called ? 0 : id === 'array' && !recap ? 16 : 8
  const calleeCount = !called
    ? '—'
    : id === 'array' && !recap
      ? '4'
      : id === 'cstr' && decided
        ? 'until \\0'
        : id === 'vec' && decided
          ? '4 passed'
          : decayDead
            ? trap
              ? '2??'
              : '?'
            : '?'

  const code =
    id === 'decay'
      ? recap
        ? `sizeof(p) / sizeof(*p);  // 8/4 = 2  ← lie`
        : decided
          ? `void f(int* p) {
  sizeof(p);   // 8 on LP64
}`
          : stepped
            ? `void f(int p[]);  // same as int*
f(a);             // decays`
            : `int a[4] = {1, 2, 3, 4};
// sizeof(a) == 16`
      : id === 'array'
        ? recap
          ? `takePtr(a.data(), a.size());
// pointer + length, on purpose`
          : decided
            ? `x.size();     // still 4
sizeof(x);    // still 16`
            : stepped
              ? `void take(std::array<int, 4> x);
take(a);  // copy, length travels`
              : `std::array<int, 4> a{{1, 2, 3, 4}};
// a.size() == 4, sizeof 16`
        : id === 'cstr'
          ? recap
            ? `Prefer std::string. strcpy overflows.`
            : decided
              ? `// p has no size. Walk until '\\0'.`
              : stepped
                ? `void g(char* p);
g(s);  // decays, length is the '\\0'`
                : `char s[] = "hi";  // {'h','i','\\0'}`
          : recap
            ? `takePtr(v.data(), v.size());
// length is an argument, not decay`
            : decided
              ? `takePtr(v.data(), v.size());
// pointer + length, on purpose`
              : stepped
                ? `v.push_back(4);  // size 4, cap 4`
                : `std::vector<int> v{1, 2, 3};
// size 3, capacity ≥ 3`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play f(a). A built-in array is a raw block. The length lives only in the type T[N] — it does not travel.'
        : id === 'array'
          ? 'Play take(a). std::array is a thin aggregate around T[N] that can be copied and knows its size. Double braces in C++14: a{{1, 2, 3, 4}}.'
          : id === 'cstr'
            ? 'Play g(s). A C-string is a char array that happens to end in a zero byte. That byte is the only length.'
            : 'Play v.data(). vector is the dynamic array: contiguous, size and capacity, reallocates as needed. Length is a member, not a type.'
      : id === 'decay' && i === 1
        ? 'a decays to int* at the call. The four cells stay on the caller. The cyan bar is an address. The callee never sees N.'
        : id === 'decay' && i === 2
          ? 'sizeof(p) is the pointer, 8 on LP64. The 16-byte block is still on the caller. Length is gone. The bar is dead.'
          : id === 'decay'
            ? 'sizeof(p)/sizeof(*p) looks like an element count. It is 2. That is the decay trap — pass n, or use std::array / std::vector.'
            : id === 'array' && i === 1
              ? 'The callee gets a copy. Four ints appear in place on x. Length travels with the object — no hop, no decay. The weld is the copy.'
              : id === 'array' && i === 2
                ? 'x.size() is still 4. sizeof is still 16. That is why std::array is the fixed buffer you actually want.'
                : id === 'array'
                  ? 'Need a C API? takePtr(a.data(), a.size()). You hand the length over on purpose — it is not implicit.'
                  : id === 'cstr' && i === 1
                    ? 's decays to char*. The three cells stay; the callee gets an address and a hunt for \\0.'
                    : id === 'cstr' && i === 2
                      ? 'No sizeof trick works. Length is a convention. Miss the terminator and you walk off the end.'
                      : id === 'cstr'
                        ? 'strcpy / sprintf write past the zero. Prefer std::string, or snprintf when an API demands char*.'
                        : i === 1
                          ? '4 fills the spare slot in place. size is 4, capacity is still 4. Nothing reallocated. Cells do not hop.'
                          : i === 2
                            ? 'takePtr(v.data(), v.size()). The callee gets a pointer and an explicit n. That is the opposite of T[N] decay.'
                            : 'vector grows with push_back. Prefer it for a dynamic buffer. std::array when N is part of the type. T[N] when an API forces it.'

  const tone = trap ? 'trap' : (id === 'array' && decided) || (id === 'vec' && decided) ? 'ok' : 'idle'
  const calleeName = !called ? '—' : id === 'array' && !recap ? 'x' : 'p'
  const calleeLabel =
    id === 'array' && !recap ? 'std::array copy' : id === 'cstr' ? 'char* p' : id === 'vec' && decided ? 'int* + n' : 'int* p'

  const leftName = id === 'cstr' ? 's' : id === 'vec' ? 'v' : 'a'
  const leftKicker =
    id === 'vec' ? `vector · size ${vecFill.length} · cap ${vecCap}` : id === 'cstr' ? 'char s[]' : id === 'array' ? 'std::array' : 'int a[4]'

  const linkCls = !called
    ? ''
    : decayDead
      ? 'fx-link--dead'
      : id === 'array' && arrayCopy
        ? 'fx-link--weld'
        : id === 'vec' && decided
          ? 'fx-link--weld'
          : 'fx-link--on'

  const playLabel =
    id === 'decay' ? 'Play f(a)' : id === 'array' ? 'Play take(a)' : id === 'cstr' ? 'Play g(s)' : 'Play v.push_back'

  const verdict =
    id === 'decay' && decided && !recap
      ? 'sizeof(p) == 8 · N is gone'
      : trap
        ? '8/4 = 2 · the length lied'
        : id === 'array' && decided && !recap
          ? 'copy still has size 4'
          : id === 'array' && recap
            ? 'data() + size · length passed on purpose'
            : id === 'cstr' && decided && !recap
              ? 'length is the zero byte'
              : id === 'cstr' && recap
                ? 'prefer std::string · strcpy overflows'
                : id === 'vec' && i === 1
                  ? 'push_back · spare slot'
                  : id === 'vec' && decided && !recap
                    ? 'data() + size · n travels'
                    : id === 'vec' && recap
                      ? 'dynamic array · length is a member'
                      : ''

  const srcLetters = id === 'vec' ? vecFill : cells
  const srcSlots = id === 'vec' ? vecCap : cells.length

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
      <div className="fx-sh">
        <div className="fx-pane fx-pane--focus">
          <span className="fx-kicker">caller</span>
          <span className="fx-value">
            <code>{leftName}</code>
          </span>
          <Letters slots={srcSlots} fill={srcLetters} hot={id === 'vec' && i === 1 ? 3 : undefined} />
          {id !== 'vec' && <SizeBar bytes={srcBytes} max={16} />}
          <span className="fx-note">{leftKicker}</span>
        </div>
        <div className={`fx-link${linkCls ? ` ${linkCls}` : ''}`} />
        <div className={`fx-pane${called ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">callee</span>
          <span className="fx-value">
            <code>{calleeName}</code>
          </span>
          {called && arrayCopy && <Letters slots={4} fill={cells} />}
          {asPtr && <span className="fx-badge fx-badge--open">{id === 'cstr' ? 'char*' : 'int*'}</span>}
          {id === 'vec' && decided && <span className="fx-badge fx-badge--open">n = 4</span>}
          {called && id !== 'vec' && <SizeBar bytes={calleeBytes} max={16} trap={trap} />}
          {called && (
            <span className="fx-note">
              {id === 'vec' && decided ? 'pointer + length' : `sizeof ${calleeBytes} · N=${calleeCount}`}
            </span>
          )}
          {!called && <span className="fx-note">not called</span>}
          {called && <span className="fx-note">{calleeLabel}</span>}
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : (id === 'array' && decided) || (id === 'vec' && decided) ? 'fx-verdict--ok' : i >= 2 ? 'fx-verdict--warn' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}

function Letters({
  slots,
  fill,
  hot,
}: {
  slots: number
  fill: readonly string[]
  hot?: number
}) {
  return (
    <div className="fx-buf-row">
      {Array.from({ length: slots }, (_, n) => {
        const ch = fill[n]
        const empty = !ch
        return (
          <span
            key={n}
            className={`fx-letter${empty ? ' fx-letter--empty' : n === hot ? ' fx-letter--move' : ch === '\\0' ? ' fx-letter--pad' : ' fx-letter--on'}`}
          >
            {ch || '·'}
          </span>
        )
      })}
    </div>
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
