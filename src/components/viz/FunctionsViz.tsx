import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'def' | 'virt' | 'inline' | 'hdr'

const MODES: { id: Mode; title: string }[] = [
  { id: 'def', title: 'default arg' },
  { id: 'virt', title: 'virtual default' },
  { id: 'inline', title: 'inline' },
  { id: 'hdr', title: 'header def' },
]

export function FunctionsViz() {
  const [id, setId] = useState<Mode>('def')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const odr = id === 'hdr' && recap
  const trap = odr || (id === 'hdr' && decided)
  const ok = (id === 'def' && recap) || (id === 'virt' && recap) || (id === 'inline' && recap)

  const code =
    id === 'def'
      ? recap
        ? `scale(5);           // caller wrote one arg
scale(5, 2);        // what the compiler sees`
        : `int scale(int x, int factor = 2);
scale(5);`
      : id === 'virt'
        ? recap
          ? `p->f();     // calls D::f
            // with n = 1  (B’s default)`
          : `struct B { virtual void f(int n = 1); };
struct D : B { void f(int n = 2); };
B* p = &d;
p->f();`
        : id === 'inline'
          ? recap
            ? `// a.cpp and b.cpp both include:
inline int add(int a, int b) { return a + b; }
// one definition, many TUs. Allowed.`
            : `// a.cpp and b.cpp both include:
inline int add(int a, int b) { return a + b; }`
          : recap
            ? `// two TUs include it → two definitions
// linker error / ODR violation`
            : `// util.hpp — not inline
int add(int a, int b) { return a + b; }`

  const caption =
    i === 0
      ? id === 'def'
        ? 'Play scale(5). Default arguments are filled at the call site from the declaration the caller can see — not from the definition.'
        : id === 'virt'
          ? 'Play p->f(). Virtual dispatch picks the function. Default arguments still come from the static type of the call.'
          : id === 'inline'
            ? 'Play inline add. inline means “this definition may appear in many TUs.” It is a hint to the inliner, not a command.'
            : 'Play header def. A non-inline definition in a header: each TU that includes it gets a definition. The linker then sees two.'
      : id === 'def' && i === 1
        ? 'x is 5. The second parameter is missing in the source. The declaration the caller saw has factor = 2. Stations light in place.'
        : id === 'def' && i === 2
          ? 'factor fills with 2 in place. A different declaration (no default) would not fill it — the caller would have to pass 2.'
          : id === 'def'
            ? 'Defaults belong on one declaration, once. Put them on the first declaration callers include. Not on a later redecl, not on virtual overrides as a second policy.'
            : id === 'virt' && i === 1
              ? 'p has static type B*, dynamic type D. The call lands in D::f. override is C++11; this default-arg rule is older.'
              : id === 'virt' && i === 2
                ? 'n is 1, not 2. Defaults are a compile-time property of the call expression, not of the final overrider.'
                : id === 'virt'
                  ? 'D::f(1) runs. People write D’s default as 2 and are shocked. Don’t default virtuals, or keep them identical.'
                  : id === 'inline' && i === 1
                    ? 'The same tokens appear in TU a. inline on a function (or a function template) is the ODR exception that makes headers work.'
                    : id === 'inline' && i === 2
                      ? 'The same tokens appear in TU b. Both may define add. The linker coalesces them. They must be token-identical.'
                      : id === 'inline'
                        ? 'A hint, not a command: the compiler may still emit a call. You wrote inline for the ODR, not for speed.'
                        : i === 1
                          ? 'The definition appears in TU a. Without inline, that is “the” definition of add.'
                          : i === 2
                            ? 'The same definition appears in TU b. Two definitions of a non-inline function. The One Definition Rule is already broken.'
                            : 'ODR / linker error. Put non-inline functions in a .cpp. Headers get inline, templates, or just a declaration.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'def' ? 'Play scale(5)' : id === 'virt' ? 'Play p->f()' : id === 'inline' ? 'Play inline add' : 'Play header def'

  const verdict =
    id === 'def' && recap
      ? 'call site · factor = 2'
      : id === 'def' && decided
        ? 'filled · 2'
        : id === 'def' && stepped
          ? 'x · 5'
          : id === 'virt' && recap
            ? 'D::f · n from B is 1'
            : id === 'virt' && decided
              ? 'n = 1 · not 2'
              : id === 'virt' && stepped
                ? 'p · static B*'
                : id === 'inline' && recap
                  ? 'inline · many TUs'
                  : id === 'inline' && decided
                    ? 'TU b · ok'
                    : id === 'inline' && stepped
                      ? 'TU a · ok'
                      : odr
                        ? 'ODR · two defs'
                        : id === 'hdr' && decided
                          ? 'TU b · second def'
                          : id === 'hdr' && stepped
                            ? 'TU a · the def'
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
      {id === 'def' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">scale(5)</span>
            <span className="fx-note">{stepped ? '5' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">factor</span>
            <span className="fx-note">{decided ? '2' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'virt' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">static B*</span>
            <span className="fx-note">{decided ? '1' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>D</code>
            <span className="fx-note">D::f</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'inline' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">TU a</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">TU b</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'hdr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>a</code>
            <span className="fx-note">TU a</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${trap ? ' fx-rank--trap' : ''}`}>
            <code>b</code>
            <span className="fx-note">TU b</span>
            <span className="fx-note">{trap ? 'ill' : decided ? 'ok' : '—'}</span>
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
