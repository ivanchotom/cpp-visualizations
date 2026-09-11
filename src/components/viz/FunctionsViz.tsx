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

  const filled = id === 'def' && i >= 2
  const dispatched = id === 'virt' && i >= 2
  const inlined = id === 'inline' && i >= 2
  const odr = id === 'hdr' && i >= 3
  const tuA = (id === 'inline' || id === 'hdr') && i >= 1
  const tuB = (id === 'inline' || id === 'hdr') && i >= 2

  const code =
    id === 'def'
      ? i < 2
        ? `int scale(int x, int factor = 2);
scale(5);`
        : `scale(5);           // caller wrote one arg
scale(5, 2);        // what the compiler sees`
      : id === 'virt'
        ? i < 2
          ? `struct B { virtual void f(int n = 1); };
struct D : B { void f(int n = 2); };
B* p = &d;
p->f();`
          : `p->f();     // calls D::f
            // with n = 1  (B’s default)`
        : id === 'inline'
          ? `// a.cpp and b.cpp both include:
inline int add(int a, int b) { return a + b; }
// one definition, many TUs. Allowed.`
          : i < 3
            ? `// util.hpp — not inline
int add(int a, int b) { return a + b; }`
            : `// two TUs include it → two definitions
// linker error / ODR violation`

  const caption =
    i === 0
      ? id === 'def'
        ? 'Play scale(5). Default arguments are filled at the call site from the declaration the caller can see — not from the definition.'
        : id === 'virt'
          ? 'Play p->f(). Virtual dispatch picks the function. Default arguments still come from the static type of the call.'
          : id === 'inline'
            ? 'Play inline. inline means “this definition may appear in many TUs.” It is a hint to the inliner, not a command.'
            : 'Play a non-inline definition in a header. Each TU that includes it gets a definition. The linker then sees two.'
      : id === 'def' && i === 1
        ? 'x is 5. The second parameter is missing in the source. The declaration the caller saw has factor = 2.'
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

  const tone = odr ? 'trap' : dispatched || inlined || filled ? 'ok' : 'idle'

  const playLabel =
    id === 'def' ? 'Play scale(5)' : id === 'virt' ? 'Play p->f()' : id === 'inline' ? 'Play inline add' : 'Play header def'

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
        <div className="fx-expr">
          <span className="fx-tok fx-tok--hot">scale</span>
          <span className={`fx-tok${i >= 1 ? ' fx-tok--hot' : ''}`}>(5</span>
          <span className={`fx-tok${filled ? ' fx-tok--hot' : ' fx-tok--warn'}`}>{filled ? ', 2)' : ', ?)'}</span>
        </div>
      )}
      {id === 'virt' && (
        <div className="fx-sh">
          <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">static B*</span>
            <span className="fx-value">
              <code>p</code>
            </span>
            <span className="fx-note">defaults from B · n = 1</span>
          </div>
          <div className={`fx-link${dispatched ? ' fx-link--on' : i >= 1 ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${dispatched ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">dynamic D</span>
            <div className={`fx-vt-slot${dispatched ? ' fx-vt-slot--hot' : i >= 1 ? ' fx-vt-slot--on' : ''}`}>
              <code>f</code>
              <span className="fx-vt-fn">{dispatched ? 'D::f(1)  not 2' : 'D::f'}</span>
            </div>
          </div>
        </div>
      )}
      {(id === 'inline' || id === 'hdr') && (
        <div className="fx-compare" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <div className={`fx-slot${tuA ? (odr ? ' fx-slot--trap' : ' fx-slot--ok') : ' fx-slot--dim'}`}>
            <span className="fx-kicker">TU a</span>
            <span className="fx-note">{tuA ? 'add() defined' : 'not yet included'}</span>
          </div>
          <span className={`fx-op${tuB ? ' fx-op--on' : ''}`}>{id === 'inline' ? 'inline' : 'ODR'}</span>
          <div className={`fx-slot${tuB ? (odr ? ' fx-slot--trap' : ' fx-slot--ok') : ' fx-slot--dim'}`}>
            <span className="fx-kicker">TU b</span>
            <span className="fx-note">{tuB ? (odr ? 'second definition' : 'same add()') : 'not yet included'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          odr ? 'fx-verdict--trap' : dispatched || inlined || filled ? 'fx-verdict--ok' : ''
        }`}
      >
        {filled
          ? 'call site filled factor = 2'
          : dispatched
            ? 'D::f · default from B is 1'
            : inlined && i >= 3
              ? 'inline · many TUs, one entity'
              : odr
                ? 'ODR · two definitions'
                : ''}
      </div>
    </SceneShell>
  )
}
