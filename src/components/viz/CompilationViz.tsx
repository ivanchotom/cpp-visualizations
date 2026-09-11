import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'pipe' | 'header' | 'undef' | 'odr'

const MODES: { id: Mode; title: string }[] = [
  { id: 'pipe', title: 'two TUs' },
  { id: 'header', title: 'missing .h' },
  { id: 'undef', title: 'U vs T' },
  { id: 'odr', title: 'ODR' },
]

export function CompilationViz() {
  const [id, setId] = useState<Mode>('pipe')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const headerTrap = id === 'header' && decided
  const undefTrap = id === 'undef' && decided
  const odrTrap = id === 'odr' && decided
  const pipeOk = id === 'pipe' && recap
  const trap = headerTrap || undefTrap || odrTrap

  const code =
    id === 'pipe'
      ? recap
        ? `// math.o has T add
// main.o had U add
// linker: one executable`
        : `// math.cpp                // main.cpp
int add(int, int);        int main() {
                          return add(1, 2);
                        }`
      : id === 'header'
        ? decided
          ? `// main.cpp includes missing.h
// compile fails here
// the linker never runs`
          : `// main.cpp
#include "missing.h"   // no such file`
        : id === 'undef'
          ? recap
            ? `// main.o: U add
// math.o was not on the link line
// undefined reference to add`
            : `// main.cpp calls add
// math.cpp is never compiled
int add(int, int);`
          : recap
            ? `// two T add in two .o files
// linker: multiple definition
// ODR — one definition rule`
            : `// a.cpp and b.cpp both define
int add(int a, int b) { return a + b; }`

  const caption =
    i === 0
      ? id === 'pipe'
        ? 'Play two TUs. The compiler never sees the whole program — only one .cpp plus the headers it includes. Stations light in place.'
        : id === 'header'
          ? 'Play missing .h. A missing header fails at compile, not at link. The TU never produces a .o.'
          : id === 'undef'
            ? 'Play U vs T. main.o has an undefined add. math.o would provide the definition. Leave it off the link line and the linker fails.'
            : 'Play ODR. Two translation units that both define add. The linker sees two T symbols. That is a multiple-definition error.'
      : id === 'pipe' && i === 1
        ? 'Preprocess is still text: paste headers, expand macros. math.cpp and main.cpp stay separate translation units.'
        : id === 'pipe' && i === 2
          ? 'Compile type-checks per TU. main cannot see add’s body. main.o still has U add until the linker runs.'
          : id === 'pipe'
            ? 'The linker matches names. U add in main.o binds to T add in math.o. One executable. C++14 is still headers + TUs; modules are a later model.'
            : id === 'header' && i === 1
              ? '#include "missing.h" is a text paste. The file is not there.'
              : id === 'header' && i === 2
                ? 'Compile never finishes. Missing headers fail at this station, not later. Link never runs.'
                : id === 'header'
                  ? 'No object file, no link error about add. Fix the include path or the header — this is not an undefined-reference bug.'
                  : id === 'undef' && i === 1
                    ? 'main.cpp preprocesses and compiles. The declaration of add is enough to type-check the call. The body is not required yet.'
                    : id === 'undef' && i === 2
                      ? 'main.o carries U add. math.o is not on this link line. The compiler already succeeded.'
                      : id === 'undef'
                        ? 'Linker: undefined reference to add. Compile was fine. Add math.o (or the library) to the link.'
                        : i === 1
                          ? 'Both files preprocess. Each looks like a valid TU. The compiler does not compare them.'
                          : i === 2
                            ? 'Both compile. Each .o has T add. That is legal until the linker sees both.'
                            : 'Linker: multiple definition of add. The One Definition Rule is a link-time check for these functions.'

  const tone = trap ? 'trap' : pipeOk ? 'ok' : 'idle'
  const playLabel =
    id === 'pipe' ? 'Play two TUs' : id === 'header' ? 'Play missing .h' : id === 'undef' ? 'Play U vs T' : 'Play ODR'

  const verdict =
    pipeOk
      ? 'linker: U add ← T add · a.out'
      : id === 'pipe' && decided
        ? 'compile per TU · U add in main.o'
        : id === 'pipe' && stepped
          ? 'two TUs · still separate'
          : headerTrap && recap
            ? 'compile fails · no .o'
            : headerTrap
              ? 'missing header · cc dies'
              : id === 'header' && stepped
                ? '#include · text paste'
                : undefTrap && recap
                  ? 'undefined reference to add'
                  : undefTrap
                    ? 'main.o · U add · math off'
                    : id === 'undef' && stepped
                      ? 'declaration enough to compile'
                      : odrTrap && recap
                        ? 'multiple definition · ODR'
                        : odrTrap
                          ? 'two .o · two T add'
                          : id === 'odr' && stepped
                            ? 'two TUs · both look fine'
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
      {id === 'pipe' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">math</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>U</code>
            <span className="fx-note">main</span>
            <span className="fx-note">{recap ? 'ok' : decided ? 'U' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'header' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${headerTrap ? ' fx-rank--trap' : ''}`}>
            <code>cc</code>
            <span className="fx-note">compile</span>
            <span className="fx-note">{headerTrap ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${headerTrap ? ' fx-rank--trap' : ''}`}>
            <code>ld</code>
            <span className="fx-note">link</span>
            <span className="fx-note">{headerTrap ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'undef' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>cc</code>
            <span className="fx-note">compile</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${undefTrap ? ' fx-rank--trap' : ''}`}>
            <code>ld</code>
            <span className="fx-note">U add</span>
            <span className="fx-note">{undefTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'odr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${odrTrap ? ' fx-rank--trap' : ''}`}>
            <code>a</code>
            <span className="fx-note">T add</span>
            <span className="fx-note">{odrTrap ? 'ill' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${odrTrap ? ' fx-rank--trap' : ''}`}>
            <code>b</code>
            <span className="fx-note">T add</span>
            <span className="fx-note">{odrTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : pipeOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
