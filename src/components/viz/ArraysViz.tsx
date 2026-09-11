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
  const trap = id === 'decay' && recap
  const arrayOk = id === 'array' && decided
  const vecOk = id === 'vec' && decided
  const ok = (id === 'array' && recap) || (id === 'vec' && recap)

  const code =
    id === 'decay'
      ? recap
        ? `sizeof(p) / sizeof(*p);  // 8/4 = 2  ← lie`
        : decided
          ? `void f(int* p) {
  sizeof(p);   // 8 on LP64
}`
          : `int a[4] = {1, 2, 3, 4};
void f(int p[]);  // same as int*
f(a);             // decays`
      : id === 'array'
        ? recap
          ? `takePtr(a.data(), a.size());
// pointer + length, on purpose`
          : `std::array<int, 4> a{{1, 2, 3, 4}};
void take(std::array<int, 4> x);
take(a);  // copy, length travels`
        : id === 'cstr'
          ? recap
            ? `Prefer std::string. strcpy overflows.`
            : `char s[] = "hi";  // {'h','i','\\0'}
void g(char* p);
g(s);  // decays, length is the '\\0'`
          : recap
            ? `takePtr(v.data(), v.size());
// length is an argument, not decay`
            : `std::vector<int> v{1, 2, 3};
v.push_back(4);  // size 4, cap 4`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play f(a). A built-in array is a raw block. The length lives only in the type T[N] — it does not travel.'
        : id === 'array'
          ? 'Play take(a). std::array is a thin aggregate around T[N] that can be copied and knows its size. Double braces in C++14: a{{1, 2, 3, 4}}.'
          : id === 'cstr'
            ? 'Play g(s). A C-string is a char array that happens to end in a zero byte. That byte is the only length.'
            : 'Play v.push_back. vector is the dynamic array: contiguous, size and capacity, reallocates as needed. Length is a member, not a type.'
      : id === 'decay' && i === 1
        ? 'a decays to int* at the call. The four cells stay on the caller. The callee never sees N. Stations light in place.'
        : id === 'decay' && i === 2
          ? 'sizeof(p) is the pointer, 8 on LP64. The 16-byte block is still on the caller. Length is gone.'
          : id === 'decay'
            ? 'sizeof(p)/sizeof(*p) looks like an element count. It is 2. That is the decay trap — pass n, or use std::array / std::vector.'
            : id === 'array' && i === 1
              ? 'The callee gets a copy. Length travels with the object — no decay. The type still knows N.'
              : id === 'array' && i === 2
                ? 'x.size() is still 4. sizeof is still 16. That is why std::array is the fixed buffer you actually want.'
                : id === 'array'
                  ? 'Need a C API? takePtr(a.data(), a.size()). You hand the length over on purpose — it is not implicit.'
                  : id === 'cstr' && i === 1
                    ? 's decays to char*. The callee gets an address and a hunt for the zero byte.'
                    : id === 'cstr' && i === 2
                      ? 'No sizeof trick works. Length is a convention. Miss the terminator and you walk off the end.'
                      : id === 'cstr'
                        ? 'strcpy / sprintf write past the zero. Prefer std::string, or snprintf when an API demands char*.'
                        : i === 1
                          ? 'push_back fills a spare slot. size is 4, capacity is still 4. Nothing reallocated.'
                          : i === 2
                            ? 'takePtr(v.data(), v.size()). The callee gets a pointer and an explicit n. That is the opposite of T[N] decay.'
                            : 'vector grows with push_back. Prefer it for a dynamic buffer. std::array when N is part of the type. T[N] when an API forces it.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'decay' ? 'Play f(a)' : id === 'array' ? 'Play take(a)' : id === 'cstr' ? 'Play g(s)' : 'Play v.push_back'

  const verdict =
    trap
      ? '8/4 = 2 · the length lied'
      : id === 'decay' && decided
        ? 'sizeof(p) == 8 · N is gone'
        : id === 'array' && recap
          ? 'data() + size · length passed on purpose'
          : arrayOk
            ? 'copy still has size 4'
            : id === 'cstr' && recap
              ? 'prefer std::string · strcpy overflows'
              : id === 'cstr' && decided
                ? 'length is the zero byte'
                : id === 'vec' && recap
                  ? 'dynamic array · length is a member'
                  : vecOk
                    ? 'data() + size · n travels'
                    : id === 'vec' && stepped
                      ? 'push_back · size 4'
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
      {id === 'decay' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">
              <code>{'int[4]'}</code>
            </span>
            <span className="fx-note">{stepped ? '16' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--trap' : stepped ? ' fx-rank--on' : ''}`}>
            <code>p</code>
            <span className="fx-note">
              <code>{'int*'}</code>
            </span>
            <span className="fx-note">{trap ? '2' : decided ? '8' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'array' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">
              <code>{'array<int,4>'}</code>
            </span>
            <span className="fx-note">{stepped ? '4' : '—'}</span>
          </div>
          <div className={`fx-rank${arrayOk ? ' fx-rank--on' : ''}`}>
            <code>x</code>
            <span className="fx-note">copy · size travels</span>
            <span className="fx-note">{arrayOk ? '4' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cstr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--done' : ''}`}>
            <code>s</code>
            <span className="fx-note">
              <code>{'char[]'}</code>
            </span>
            <span className="fx-note">{stepped ? '3' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--trap' : stepped ? ' fx-rank--on' : ''}`}>
            <code>p</code>
            <span className="fx-note">
              <code>{'char*'}</code>
            </span>
            <span className="fx-note">{decided ? 'nul' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'vec' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${vecOk ? ' fx-rank--done' : ''}`}>
            <code>v</code>
            <span className="fx-note">size / cap</span>
            <span className="fx-note">{stepped ? '4' : '—'}</span>
          </div>
          <div className={`fx-rank${vecOk ? ' fx-rank--on' : ''}`}>
            <code>p</code>
            <span className="fx-note">
              <code>data() + n</code>
            </span>
            <span className="fx-note">{vecOk ? 'ok' : '—'}</span>
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
