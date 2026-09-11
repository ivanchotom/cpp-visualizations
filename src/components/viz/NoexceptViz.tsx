import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'move' | 'term' | 'query' | 'ec'

const MODES: { id: Mode; title: string }[] = [
  { id: 'move', title: 'vector move' },
  { id: 'term', title: 'terminate' },
  { id: 'query', title: 'noexcept()' },
  { id: 'ec', title: 'error_code' },
]

export function NoexceptViz() {
  const [id, setId] = useState<Mode>('move')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const termTrap = id === 'term' && decided
  const ignored = id === 'ec' && i === 2
  const checked = id === 'ec' && recap
  const copied = id === 'move' && recap
  const throwing = id === 'move' && decided
  const queried = id === 'query' && decided
  const trap = termTrap
  const warn = ignored
  const ok = copied || queried || checked

  const code =
    id === 'move'
      ? i < 3
        ? `template <typename T>
void relocate(T* d, T* s)
    noexcept(std::is_nothrow_move_constructible<T>::value) {
  new (d) T(std::move(*s));
}`
        : `// vector resize uses move_if_noexcept
// throwing move → copy the old buffer
// noexcept move → steal`
      : id === 'term'
        ? i < 2
          ? `void f() noexcept {
  g();  // if g throws…
}`
          : `void f() noexcept {
  g();
}  // throw → std::terminate
// no catch. Unwind is not allowed.`
        : id === 'query'
          ? `void f() noexcept;
static_assert(noexcept(f()), "f must not throw");
// noexcept(expr) is a bool, not a flow`
          : i < 3
            ? `std::error_code ec;
open(path, ec);  // no throw
// ignoring ec is the whole hazard`
            : `if (ec) {
  log(ec.message());
}`

  const caption =
    i === 0
      ? id === 'move'
        ? 'Play move_if_noexcept. vector will not use a throwing move on resize — it copies instead. Mark moves noexcept or you pay copies. C++14: is_nothrow_move_constructible<T>::value, not _v.'
        : id === 'term'
          ? 'Play f() noexcept. noexcept is a contract. If anything throws out of that function, there is no catch: std::terminate runs.'
          : id === 'query'
            ? 'Play noexcept(f()). noexcept(expr) is a compile-time bool. Templates use it to pick copy vs move.'
            : 'Play open(path, ec). No unwind. The error sits in a value that is trivial to ignore. Pick a policy and stick to it.'
      : id === 'move' && i === 1
        ? 'The vector is full. Resize must relocate every element into a new buffer. Stations light in place — nothing hops.'
        : id === 'move' && i === 2
          ? 'is_nothrow_move_constructible<T>::value is false. A throwing move during this loop would strand the container. So it will not move.'
          : id === 'move'
            ? 'Copy. The old objects stay valid if a later copy throws. That is the safety. The cost is why people write noexcept moves.'
            : id === 'term' && i === 1
              ? 'f may only call things that truly cannot throw, or catch inside. g() is an ordinary call.'
              : id === 'term' && i === 2
                ? 'g throws. noexcept on f forbids leaving via that exception. There is no handler to try.'
                : id === 'term'
                  ? 'std::terminate. Never throw from a destructor either — same end during unwind.'
                  : id === 'query' && i === 1
                    ? 'noexcept(f()) inspects the exception specification, not a runtime try.'
                    : id === 'query' && i === 2
                      ? 'true. static_assert can demand it. vector does the same check for T’s move ctor.'
                      : id === 'query'
                        ? 'A function marked noexcept that then throws still compiles — the violation is at run time.'
                        : i === 1
                          ? 'open writes into ec. Success or failure, you get a code. Nothing unwinds.'
                          : i === 2
                            ? 'Ignore it and the program continues in a lie. That is the error-code footgun — silent, cheap, and wrong.'
                            : 'Check. Translate at a boundary if the rest of the program uses exceptions.'

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'move'
      ? 'Play move_if_noexcept'
      : id === 'term'
        ? 'Play f() noexcept'
        : id === 'query'
          ? 'Play noexcept(f())'
          : 'Play open(path, ec)'

  const verdict =
    copied
      ? 'throwing move · copy instead'
      : id === 'move' && throwing
        ? 'is_nothrow_move · false'
        : id === 'move' && stepped
          ? 'resize · need a new buffer'
          : termTrap && recap
            ? 'noexcept violated · terminate'
            : termTrap
              ? 'g threw · no unwind'
              : id === 'term' && stepped
                ? 'f() noexcept · g() may throw'
                : queried
                  ? 'noexcept(f()) · true'
                  : id === 'query' && stepped
                    ? 'compile-time bool'
                    : ignored
                      ? 'ec ignored · silent failure'
                      : checked
                        ? 'if (ec) · handle it'
                        : id === 'ec' && stepped
                          ? 'ec written · no throw'
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
      {id === 'move' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${copied ? ' fx-rank--done' : ''}`}>
            <code>old</code>
            <span className="fx-note">full buffer</span>
            <span className="fx-note">{copied ? 'ok' : stepped ? 'full' : '—'}</span>
          </div>
          <div className={`fx-rank${throwing ? ' fx-rank--on' : ''}${throwing && !copied ? ' fx-rank--trap' : ''}`}>
            <code>new</code>
            <span className="fx-note">move_if_noexcept</span>
            <span className="fx-note">{copied ? 'copy' : throwing ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'term' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${termTrap ? ' fx-rank--trap' : ''}`}>
            <code>f</code>
            <span className="fx-note">
              <code>noexcept</code>
            </span>
            <span className="fx-note">{termTrap ? 'ill' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${termTrap ? ' fx-rank--trap' : ''}`}>
            <code>g</code>
            <span className="fx-note">may throw</span>
            <span className="fx-note">{recap ? 'end' : termTrap ? 'throw' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'query' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${queried ? ' fx-rank--done' : ''}`}>
            <code>f</code>
            <span className="fx-note">spec</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${queried ? ' fx-rank--on' : ''}`}>
            <code>q</code>
            <span className="fx-note">
              <code>noexcept()</code>
            </span>
            <span className="fx-note">{queried ? 'true' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ec' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${checked ? ' fx-rank--done' : ''}`}>
            <code>open</code>
            <span className="fx-note">no throw</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${ignored ? ' fx-rank--trap' : ''}`}>
            <code>ec</code>
            <span className="fx-note">error_code</span>
            <span className="fx-note">{checked ? 'ok' : ignored ? 'no' : stepped ? 'err' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : warn ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
