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

const OLD = ['A', 'B', 'C', 'D'] as const

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
        ? 'Play vector move. vector will not use a throwing move on resize — it copies instead (move_if_noexcept). Mark moves noexcept or you pay copies. C++14: is_nothrow_move_constructible<T>::value, not _v.'
        : id === 'term'
          ? 'Play terminate. noexcept is a contract. If anything throws out of that function, there is no catch: std::terminate runs.'
          : id === 'query'
            ? 'Play query. noexcept(expr) is a compile-time bool. Templates use it to pick copy vs move.'
            : 'Play error_code. No unwind. The error sits in a value that is trivial to ignore. Pick a policy and stick to it.'
      : id === 'move' && i === 1
        ? 'The vector is full. Resize must relocate every element into a new buffer.'
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

  const tone = termTrap ? 'trap' : ignored ? 'warn' : copied || queried || checked ? 'ok' : 'idle'
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
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">old buffer</span>
            <div className="fx-buf-row">
              {OLD.map((ch) => (
                <span key={ch} className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                  {stepped ? ch : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">{copied ? 'still valid' : stepped ? 'full · grow' : 'idle'}</span>
          </div>
          <div className={`fx-link${copied ? ' fx-link--dead' : throwing ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${copied ? ' fx-pane--focus' : ''}${throwing && !copied ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">new buffer</span>
            <div className="fx-buf-row">
              {OLD.map((ch) => (
                <span key={ch} className={`fx-letter${copied ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                  {copied ? ch : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">{copied ? 'copied · not stolen' : throwing ? 'will not move' : 'waiting'}</span>
          </div>
        </div>
      )}
      {id === 'term' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${termTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">f() noexcept</span>
            <div className={`fx-slot${termTrap ? ' fx-slot--trap' : stepped ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">contract</span>
              <span className="fx-value">{stepped ? 'f' : '—'}</span>
              <span className="fx-note">{termTrap ? 'must not throw' : 'no exception out'}</span>
            </div>
          </div>
          <div className={`fx-link${termTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${termTrap ? ' fx-pane--focus' : ''}${termTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">g()</span>
            <div className={`fx-slot${termTrap ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">call</span>
              <span className="fx-value">{termTrap ? 'throw' : '—'}</span>
              <span className="fx-note">{recap ? 'std::terminate' : termTrap ? 'no catch' : 'may throw'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'query' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${queried ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">f()</span>
            <code>noexcept</code>
            <span className="fx-note">{stepped ? 'spec' : '—'}</span>
          </div>
          <div className={`fx-rank${queried ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">query</span>
            <code>noexcept(f())</code>
            <span className="fx-note">{queried ? 'true' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ec' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">open</span>
            <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">path</span>
              <span className="fx-value">{stepped ? 'file' : '—'}</span>
              <span className="fx-note">no throw</span>
            </div>
          </div>
          <div className={`fx-link${checked ? ' fx-link--weld' : ignored ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${ignored ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">ec</span>
            <div className={`fx-slot${checked ? ' fx-slot--ok' : ignored ? ' fx-slot--trap' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">error_code</span>
              <span className="fx-value">{checked ? 'if' : stepped ? 'err' : '—'}</span>
              <span className="fx-note">{checked ? 'handled' : ignored ? 'ignored' : stepped ? 'written' : 'waiting'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          termTrap ? 'fx-verdict--trap' : ignored ? 'fx-verdict--warn' : copied || queried || checked ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
