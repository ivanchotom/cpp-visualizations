import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'pipe' | 'header' | 'undef' | 'odr'

const STATIONS = ['src', 'pp', 'cc', 'as', 'ld', 'out'] as const

const MODES: { id: Mode; title: string }[] = [
  { id: 'pipe', title: 'two TUs' },
  { id: 'header', title: 'missing .h' },
  { id: 'undef', title: 'U vs T' },
  { id: 'odr', title: 'ODR' },
]

function cls(on: boolean, trap = false): string {
  if (trap) return ' fx-letter--dead'
  if (on) return ' fx-letter--on'
  return ' fx-letter--empty'
}

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
  const undefTrap = id === 'undef' && recap
  const odrTrap = id === 'odr' && recap
  const pipeOk = id === 'pipe' && recap
  const trap = (id === 'header' && decided) || undefTrap || odrTrap

  const mathOn = (s: number) => {
    if (!stepped) return false
    if (id === 'header') return s <= 2 && i >= 1 && !(headerTrap && s >= 4)
    if (id === 'undef') return recap ? s <= 3 : decided ? s <= 3 : s <= 1
    if (id === 'odr') return recap ? s <= 4 : decided ? s <= 3 : s <= 1
    return recap ? true : decided ? s <= 3 : s <= 1
  }

  const mainOn = (s: number) => {
    if (!stepped) return false
    if (id === 'header') {
      if (s <= 1) return i >= 1
      if (s === 2) return decided
      return false
    }
    if (id === 'undef') return recap ? s <= 4 && s !== 5 : decided ? s <= 3 : s <= 1
    if (id === 'odr') return recap ? s <= 4 : decided ? s <= 3 : s <= 1
    return recap ? true : decided ? s <= 3 : s <= 1
  }

  const mathTrap = (s: number) => id === 'odr' && recap && s === 4
  const mainTrap = (s: number) => (id === 'header' && decided && s === 2) || (id === 'undef' && recap && s === 4) || (id === 'odr' && recap && s === 4)

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
        ? 'Play two TUs. The compiler never sees the whole program — only one .cpp plus the headers it includes. Stations light in place; tokens do not slide.'
        : id === 'header'
          ? 'Play missing .h. A missing header fails at compile, not at link. The TU never produces a .o.'
          : id === 'undef'
            ? 'Play U vs T. main.o has an undefined add. math.o would provide the definition. Leave it off the link line and the linker fails.'
            : 'Play ODR. Two translation units that both define add. The linker sees two T symbols. That is a multiple-definition error.'
      : id === 'pipe' && i === 1
        ? 'Preprocess is still text: paste headers, expand macros. math.cpp and main.cpp stay separate files on separate rows.'
        : id === 'pipe' && i === 2
          ? 'Compile type-checks and emits IR per TU. main cannot see add’s body. Assemble writes .o files. main.o still has U add.'
          : id === 'pipe'
            ? 'The linker matches names. U add in main.o binds to T add in math.o. One executable. C++14 is still headers + TUs; modules are a later model.'
            : id === 'header' && i === 1
              ? 'Preprocess starts. #include "missing.h" is a text paste. The file is not there.'
              : id === 'header' && i === 2
                ? 'Compile never finishes. Missing headers fail at this station, not later. Link and a.out stay dark.'
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
                            ? 'Both compile and assemble. Each .o has T add. That is legal until the linker sees both.'
                            : 'Linker: multiple definition of add. The One Definition Rule is a link-time check for these functions.'

  const tone = trap ? 'trap' : pipeOk ? 'ok' : 'idle'
  const playLabel =
    id === 'pipe' ? 'Play two TUs' : id === 'header' ? 'Play missing .h' : id === 'undef' ? 'Play U vs T' : 'Play ODR'

  const verdict =
    id === 'pipe' && i === 1
      ? 'two TUs · two rows'
      : id === 'pipe' && i === 2
        ? 'compile per TU · U add in main.o'
        : pipeOk
          ? 'linker: U add ← T add · a.out'
          : id === 'header' && i === 1
            ? '#include · text paste'
            : headerTrap
              ? 'compile fails · no .o'
              : id === 'undef' && i === 1
                ? 'declaration enough to compile'
                : id === 'undef' && i === 2
                  ? 'main.o · U add'
                  : undefTrap
                    ? 'undefined reference to add'
                    : id === 'odr' && i === 1
                      ? 'two TUs · both look fine'
                      : id === 'odr' && i === 2
                        ? 'two .o · two T add'
                        : odrTrap
                          ? 'multiple definition · ODR'
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
      <div className="fx-sh">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${id === 'undef' && recap ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">math.cpp</span>
          <div className="fx-buf-row">
            {STATIONS.map((_, s) => (
              <span key={`m${s}`} className={`fx-letter${cls(mathOn(s), mathTrap(s))}`} title={STATIONS[s]}>
                {String(s + 1)}
              </span>
            ))}
          </div>
          <span className="fx-note">{id === 'undef' && recap ? 'not on the link line' : id === 'odr' && recap ? 'T add' : 'TU'}</span>
        </div>
        <div className={`fx-link${trap ? ' fx-link--dead' : pipeOk ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">main.cpp</span>
          <div className="fx-buf-row">
            {STATIONS.map((_, s) => (
              <span key={`n${s}`} className={`fx-letter${cls(mainOn(s), mainTrap(s))}`} title={STATIONS[s]}>
                {String(s + 1)}
              </span>
            ))}
          </div>
          <span className="fx-note">{id === 'pipe' && recap ? 'U add bound' : id === 'header' && decided ? 'no .o' : 'TU'}</span>
        </div>
      </div>
      <div className="fx-ladder" style={{ marginTop: 8 }}>
        <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${id === 'undef' && recap ? ' fx-rank--done' : ''}${id === 'odr' && recap ? ' fx-rank--trap' : ''}`}>
          <span className="fx-note">math</span>
          <code>T add</code>
          <span className="fx-note">
            {id === 'header'
              ? '—'
              : id === 'undef' && recap
                ? 'off'
                : id === 'odr' && recap
                  ? 'dbl'
                  : stepped
                    ? 'ok'
                    : '—'}
          </span>
        </div>
        <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${trap ? ' fx-rank--trap' : pipeOk ? ' fx-rank--on' : ''}`}>
          <span className="fx-note">main</span>
          <code>{id === 'odr' ? 'T add' : id === 'header' ? 'cc' : 'U add'}</code>
          <span className="fx-note">
            {headerTrap ? 'ill' : undefTrap ? 'ill' : odrTrap ? 'dbl' : pipeOk ? 'bind' : stepped ? 'ok' : '—'}
          </span>
        </div>
      </div>
      <p className="fx-note" style={{ textAlign: 'center' }}>
        1 src · 2 pp · 3 cc · 4 as · 5 ld · 6 a.out
      </p>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${trap ? 'fx-verdict--trap' : pipeOk ? 'fx-verdict--ok' : ''}`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
