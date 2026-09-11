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

const FRAMES = [
  { id: 'parse', fn: 'parse()' },
  { id: 'openFile', fn: 'openFile()' },
  { id: 'run', fn: 'run()' },
  { id: 'main', fn: 'main()' },
] as const

type FrameId = (typeof FRAMES)[number]['id']

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

  const parseDead = id === 'noexcept' ? false : decided
  const fileDead = id === 'catch' ? recap : id === 'uncaught' ? decided : id === 'dtor' ? recap : false
  const fileThrow = id === 'dtor' && decided
  const parseThrow = stepped && !(id === 'dtor' && recap)
  const caught = id === 'catch' && recap
  const terminated = (id === 'uncaught' && recap) || (id === 'noexcept' && recap) || (id === 'dtor' && recap)
  const trap = (parseThrow && !caught) || fileThrow || terminated
  const ok = caught

  const pc: FrameId =
    id === 'noexcept'
      ? 'parse'
      : id === 'dtor'
        ? decided
          ? 'openFile'
          : 'parse'
        : id === 'uncaught'
          ? recap
            ? 'main'
            : decided
              ? 'run'
              : stepped
                ? 'parse'
                : 'parse'
          : recap
            ? 'run'
            : decided
              ? 'openFile'
              : 'parse'

  const pcTop = 10 + FRAMES.findIndex((f) => f.id === pc) * 48

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
        ? 'parse() throws. The exception object exists. This frame has no handler, so it will die and its locals will run destructors.'
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

  function dead(fid: FrameId): boolean {
    if (fid === 'parse') return parseDead
    if (fid === 'openFile') return fileDead
    return false
  }

  function noteFor(fid: FrameId): string {
    if (fid === 'parse') {
      if (parseDead) return 'frame destroyed'
      if (id === 'noexcept') return 'noexcept · must not throw'
      if (parseThrow) return 'throw runtime_error'
      return 'locals alive'
    }
    if (fid === 'openFile') {
      if (fileThrow && !fileDead) return '~File throws'
      if (fileDead)
        return id === 'dtor' ? '~File · terminate' : id === 'uncaught' ? 'frame destroyed' : '~fstream closed the file'
      return id === 'dtor' ? 'File file  (dtor will run)' : 'fstream file  (will close)'
    }
    if (fid === 'run') {
      if (id === 'uncaught' || id === 'noexcept') return 'no try in this demo'
      return caught ? 'catch (const std::exception&)' : 'try { openFile(); }'
    }
    if (id === 'uncaught') return recap ? 'uncaught → terminate' : 'no try'
    if (id === 'noexcept') return 'not unwound'
    return 'waiting'
  }

  const exNote = caught
    ? 'bound to e · const ref'
    : terminated
      ? 'abandoned · terminate'
      : stepped
        ? 'in flight'
        : 'none'

  const verdict = caught
    ? 'caught in run() · file already closed'
    : id === 'uncaught' && recap
      ? 'uncaught → std::terminate'
      : id === 'noexcept' && recap
        ? 'throw in noexcept → terminate'
        : id === 'dtor' && recap
          ? '~File threw · std::terminate'
          : id === 'dtor' && decided
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
      <div className="fx-flow">
        <div className="fx-rail" />
        <div className="fx-pc" style={{ top: pcTop }} />
        {FRAMES.map((f) => {
          const gone = dead(f.id)
          const isThrow =
            (f.id === 'parse' && parseThrow && !fileThrow && !caught && !terminated) ||
            (f.id === 'openFile' && fileThrow && !terminated)
          const isCatch = f.id === 'run' && caught
          const isTerm = terminated && f.id === pc
          return (
            <div
              key={f.id}
              className={`fx-node${gone ? ' fx-node--skip' : ' fx-node--live'}${isThrow ? ' fx-node--on fx-slot--trap' : ''}${
                isCatch ? ' fx-node--done' : ''
              }${isTerm ? ' fx-slot--trap' : ''}`}
            >
              <span className="fx-kicker">{f.fn}</span>
              <span className="fx-note">{noteFor(f.id)}</span>
              {isThrow && <span className="fx-badge fx-badge--lock">throw</span>}
              {isCatch && <span className="fx-badge fx-badge--open">caught</span>}
              {isTerm && <span className="fx-badge fx-badge--lock">terminate</span>}
              {id === 'noexcept' && f.id === 'parse' && !gone && (
                <span className="fx-badge fx-badge--lock">noexcept</span>
              )}
            </div>
          )
        })}
      </div>
      <div
        className={`fx-slot${stepped ? '' : ' fx-slot--dim'}${caught ? ' fx-slot--weld' : ''}${
          terminated ? ' fx-slot--trap' : parseThrow && !caught ? ' fx-slot--trap' : ''
        }`}
      >
        <span className="fx-kicker">exception object</span>
        <span className="fx-value">
          <code>{stepped ? 'runtime_error' : '—'}</code>
        </span>
        <span className="fx-note">{exNote}</span>
      </div>
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
