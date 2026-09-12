import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'catch' | 'uncaught' | 'noexcept' | 'dtor'

const MODES: { id: Mode; title: string }[] = [
  { id: 'catch', title: 'catch' },
  { id: 'uncaught', title: 'uncaught' },
  { id: 'noexcept', title: 'noexcept' },
  { id: 'dtor', title: 'dtor' },
]

export function ExceptionsViz() {
  const [id, setId] = useState<Mode>('catch')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const caught = id === 'catch' && recap
  const uncaughtTrap = id === 'uncaught' && decided
  const noexceptTrap = id === 'noexcept' && decided
  const dtorTrap = id === 'dtor' && decided
  const trap = uncaughtTrap || noexceptTrap || dtorTrap
  const ok = caught

  const code =
    id === 'catch'
      ? recap
        ? `} catch (const std::exception& e) {
  log(e.what());
} // ~fstream already ran`
        : `void run() {
  try { openFile(); }
  catch (const std::exception& e) {
    log(e.what());
  }
}`
      : id === 'uncaught'
        ? recap
          ? `int main() {
  parse();
} // no handler → std::terminate`
          : `void parse() {
  throw std::runtime_error("bad");
}
int main() { parse(); }`
        : id === 'noexcept'
          ? `void parse() noexcept {
  throw std::runtime_error("bad");
} // throw in noexcept → terminate`
          : recap
            ? `struct File {
  ~File() { throw 1; } // implicitly noexcept
};
// throw in dtor → std::terminate`
            : `void openFile() {
  File file;
  parse(); // parse throws, then ~File
}`

  const caption =
    i === 0
      ? id === 'catch'
        ? 'Play throw → catch. throw packages a value and walks the stack. Destructors of automatics run. Catch by const reference.'
        : id === 'uncaught'
          ? 'Play uncaught. If no handler matches, the implementation calls std::terminate. RAII still ran on the way up — then the program dies.'
          : id === 'noexcept'
            ? 'Play noexcept. A throw that would leave a noexcept function calls std::terminate. Unwind of callers does not happen.'
            : 'Play throw in dtor. Since C++11 a destructor is noexcept by default. Throw from it and you get std::terminate, not a second exception.'
      : id === 'catch' && i === 1
        ? 'parse() throws. The exception object exists. This frame has no handler, so it will die and its locals will run destructors. Stations light in place.'
        : id === 'catch' && i === 2
          ? 'parse() is gone. openFile() still has an fstream. Unwind will run ~fstream — that is why RAII exists.'
          : id === 'catch'
            ? 'run() caught it by const std::exception&. The file is already closed. The exception object is bound to e, not copied as a base slice.'
            : id === 'uncaught' && i === 1
              ? 'parse() throws. main() has no try. The exception still has to leave every frame on the way out.'
              : id === 'uncaught' && i === 2
                ? 'Frames die. Locals are destroyed. There is still no catch. The exception is uncaught.'
                : id === 'uncaught'
                  ? 'std::terminate. You do not get to “handle it later.” An uncaught exception ends the program.'
                  : id === 'noexcept' && i === 1
                    ? 'throw inside parse() noexcept. The exception specification is part of the type. Leaving this function with an exception is not allowed.'
                    : id === 'noexcept' && i === 2
                      ? 'Callers stay alive. The implementation does not unwind openFile / run / main to look for a catch. It stops here.'
                      : id === 'noexcept'
                        ? 'std::terminate. Mark a function noexcept only when it truly cannot throw — or when terminate is the policy you want.'
                        : i === 1
                          ? 'parse() threw. Unwind starts. openFile() has a File local. Its destructor is next, and that destructor throws.'
                          : i === 2
                            ? '~File() throws. A destructor is noexcept by default in C++11/14. The second throw is not delivered as a second exception.'
                            : 'std::terminate. Never throw from a destructor. If cleanup can fail, report it some other way — not by throw.'

  const tone = ok ? 'ok' : trap ? 'trap' : 'idle'
  const playLabel =
    id === 'catch'
      ? 'Play throw → catch'
      : id === 'uncaught'
        ? 'Play uncaught'
        : id === 'noexcept'
          ? 'Play noexcept'
          : 'Play throw in dtor'

  const verdict =
    caught
      ? 'caught in run() · file already closed'
      : id === 'uncaught' && recap
        ? 'uncaught → std::terminate'
        : uncaughtTrap
          ? 'no handler · still unwinding'
          : id === 'noexcept' && recap
            ? 'throw in noexcept → terminate'
            : noexceptTrap
              ? 'no unwind of callers'
              : id === 'dtor' && recap
                ? '~File threw · std::terminate'
                : dtorTrap
                  ? '~File() is noexcept · throw'
                  : id === 'catch' && decided
                    ? '~fstream ran · file closed on the way out'
                    : stepped
                      ? 'throw std::runtime_error · no catch here'
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
      {id === 'catch' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>un</code>
            <span className="fx-note">un</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>ct</code>
            <span className="fx-note">hdl</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'uncaught' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>un</code>
            <span className="fx-note">un</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${uncaughtTrap ? ' fx-rank--trap' : ''}`}>
            <code>tm</code>
            <span className="fx-note">term</span>
            <span className="fx-note">{uncaughtTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'noexcept' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${noexceptTrap ? ' fx-rank--trap' : ''}`}>
            <code>un</code>
            <span className="fx-note">un</span>
            <span className="fx-note">{noexceptTrap ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${noexceptTrap ? ' fx-rank--trap' : ''}`}>
            <code>tm</code>
            <span className="fx-note">term</span>
            <span className="fx-note">{noexceptTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dtor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${dtorTrap ? ' fx-rank--trap' : ''}`}>
            <code>dt</code>
            <span className="fx-note">~F</span>
            <span className="fx-note">{dtorTrap ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${dtorTrap ? ' fx-rank--trap' : ''}`}>
            <code>tm</code>
            <span className="fx-note">term</span>
            <span className="fx-note">{dtorTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          ok ? 'fx-verdict--ok' : trap ? 'fx-verdict--trap' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
