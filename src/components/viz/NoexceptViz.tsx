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

  const inName = id === 'move' ? 'T' : id === 'term' ? 'f() noexcept' : id === 'query' ? 'f()' : 'path'
  const inVal =
    id === 'move' ? 'throwing move' : id === 'term' ? 'must not throw' : id === 'query' ? 'noexcept' : '"file"'
  const midName =
    id === 'move'
      ? 'vector::resize'
      : id === 'term'
        ? 'g()'
        : id === 'query'
          ? 'noexcept(f())'
          : 'open(path, ec)'
  const midVal =
    id === 'move' && stepped
      ? decided
        ? 'throws?'
        : 'grow'
      : id === 'term' && stepped
        ? decided
          ? 'throw'
          : 'call'
        : id === 'query' && stepped
          ? 'inspect'
          : id === 'ec' && stepped
            ? 'ec written'
            : '—'
  const outName =
    id === 'move' ? 'relocate' : id === 'term' ? 'std::terminate' : id === 'query' ? 'static_assert' : checked ? 'handle' : 'ignored'
  const outVal =
    copied ? 'copy' : termTrap ? 'abort' : queried ? 'true' : checked ? 'checked' : ignored ? 'lie' : '—'

  const leftLink = stepped ? 'fx-link--on' : ''
  const rightLink = termTrap || ignored ? 'fx-link--dead' : copied || queried || checked ? 'fx-link--weld' : decided ? 'fx-link--on' : ''

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
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">src</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">call site</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">step</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'move'
                ? 'needs a bigger buffer'
                : id === 'term'
                  ? 'may throw'
                  : id === 'query'
                    ? 'compile-time bool'
                    : 'writes the code, no throw'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">out</span>
          <div
            className={`fx-slot${
              termTrap ? ' fx-slot--trap' : ignored ? ' fx-slot--trap' : copied || queried || checked ? ' fx-slot--ok' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {copied
                ? 'move_if_noexcept → copy'
                : termTrap
                  ? 'no catch, no unwind'
                  : queried
                    ? 'C++14: ::value, not _v'
                    : checked
                      ? 'the actual policy'
                      : ignored
                        ? 'easy to skip'
                        : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${copied || termTrap || queried || ignored || checked ? ' fx-verdict--show' : ''} ${
          termTrap ? 'fx-verdict--trap' : ignored ? 'fx-verdict--warn' : copied || queried || checked ? 'fx-verdict--ok' : ''
        }`}
      >
        {copied
          ? 'throwing move · copy instead'
          : termTrap
            ? 'noexcept violated · terminate'
            : queried
              ? 'noexcept(f()) · true'
              : ignored
                ? 'ec ignored · silent failure'
                : checked
                  ? 'if (ec) · handle it'
                  : ''}
      </div>
    </SceneShell>
  )
}
