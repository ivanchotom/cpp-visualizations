import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'parse' | 'slice' | 'ns' | 'div'

const MODES: { id: Mode; title: string }[] = [
  { id: 'parse', title: 'parse' },
  { id: 'slice', title: 'slicing' },
  { id: 'ns', title: 'using ns' },
  { id: 'div', title: '1/2' },
]

export function PitfallsViz() {
  const [id, setId] = useState<Mode>('parse')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const parseTrap = id === 'parse' && decided && !recap
  const parseFix = id === 'parse' && recap
  const sliceTrap = id === 'slice' && decided && !recap
  const sliceFix = id === 'slice' && recap
  const nsTrap = id === 'ns' && decided && !recap
  const nsFix = id === 'ns' && recap
  const divTrap = id === 'div' && decided && !recap
  const divFix = id === 'div' && recap
  const trap = parseTrap || sliceTrap || nsTrap || divTrap
  const ok = parseFix || sliceFix || nsFix || divFix

  const code =
    id === 'parse'
      ? recap
        ? `Widget w();     // function declaration
Widget w{};     // object — C++11 brace-init
Widget w;       // also an object`
        : `Widget w();     // function
// not a default-constructed Widget`
      : id === 'slice'
        ? recap
          ? `void f(Base b);   // by value: slices
f(derived);        // extra is gone
void g(Base& b);   // keep the dynamic type`
          : `struct Base { int a; };
struct Derived : Base { int extra; };
void f(Base b);`
        : id === 'ns'
          ? recap
            ? `// header.h
// using namespace std;  // never
// in .cpp, keep it local or don’t
using std::string;        // narrower`
            : `// header.h — don’t
using namespace std;`
          : recap
            ? `int r = 1 / 2;           // 0
double q = 1.0 / 2;      // 0.5
double s = 1 / 2.0;      // 0.5`
            : `int a = 1, b = 2;
int r = a / b;     // 0`

  const caption =
    i === 0
      ? id === 'parse'
        ? 'Play parse. Widget w(); looks like a construction. It is a function declaration. Brace-init Widget w{} is an object.'
        : id === 'slice'
          ? 'Play slicing. f(Base) by value copies only the Base subobject. Virtuals and extra members vanish. Pass Base& or a pointer.'
          : id === 'ns'
            ? 'Play using ns. using namespace in a header dumps names into every translation unit that includes it. Never. In a .cpp, keep it local.'
            : 'Play 1/2. Integer division truncates toward zero. 1/2 is 0, not a ratio. Use a floating operand or a cast.'
      : id === 'parse' && i === 1
        ? 'The parser sees Widget w();. Anything that can be a declaration is one. That is the most vexing parse. There is no object yet.'
        : id === 'parse' && i === 2
          ? 'You wanted an object. There is none. The name w is a function. Widget w{} constructs. Widget w; does too.'
          : id === 'parse'
            ? 'Also: extra braces around iterator pairs dodge the parse. std::vector<int> v(std::istream_iterator<int>{in}, std::istream_iterator<int>{});'
            : id === 'slice' && i === 1
              ? 'The parameter is Base by value. The call copies a Base. Derived’s extra members are not in that object.'
              : id === 'slice' && i === 2
                ? 'extra is dropped. If speak() is virtual, b.speak() is Base::speak. Pass Base& or unique_ptr<Base>.'
                : id === 'slice'
                  ? 'Slicing is silent. A deleted Base copy constructor makes it a compile error — often the right fix for a polymorphic base.'
                  : id === 'ns' && i === 1
                    ? 'using namespace std in a header. Every include of this file now sees std names and any future ones.'
                    : id === 'ns' && i === 2
                      ? 'The leak shows up as a collision: min/max macros, ADL surprises, another library’s size. Keep using-directives out of headers.'
                      : id === 'ns'
                        ? 'using std::string; in a .cpp is a narrower habit. using namespace in a header is a defect.'
                        : i === 1
                          ? '1 / 2 is integer division. Both operands are int. The result type is int.'
                          : i === 2
                            ? '0. Not 0.5. The compiler did exactly what the types asked. Cast one operand or write 1.0 / 2.'
                            : 'This is not UB. It is the wrong type. Same class of bug as mixing int milliseconds with a float dt.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'parse' ? 'Play Widget w()' : id === 'slice' ? 'Play slicing' : id === 'ns' ? 'Play using ns' : 'Play 1/2'

  const inName = id === 'parse' ? 'source' : id === 'slice' ? 'Derived d' : id === 'ns' ? 'header.h' : 'ints'
  const inVal =
    id === 'parse'
      ? recap
        ? 'Widget w{}'
        : 'Widget w()'
      : id === 'slice'
        ? 'extra fields'
        : id === 'ns'
          ? '#include'
          : '1 and 2'
  const midName = id === 'parse' ? 'parser' : id === 'slice' ? 'f(Base b)' : id === 'ns' ? 'std::' : 'operator/'
  const midVal =
    id === 'parse' && recap
      ? 'brace-init'
      : id === 'parse' && stepped
        ? 'function decl'
        : id === 'slice' && recap
          ? 'Base&'
          : id === 'slice' && decided
            ? 'Base only'
            : id === 'slice' && stepped
              ? 'copy'
              : id === 'ns' && stepped
                ? 'leaks names'
                : id === 'div' && recap
                  ? '1.0 / 2'
                  : id === 'div' && stepped
                    ? 'integer /'
                    : '—'
  const outName = id === 'parse' ? 'object' : id === 'slice' ? 'derived part' : id === 'ns' ? 'collision' : 'ratio'
  const outVal = parseTrap
    ? 'none'
    : parseFix
      ? 'Widget'
      : sliceTrap
        ? 'dropped'
        : sliceFix
          ? 'kept'
          : nsTrap
            ? 'min / size'
            : nsFix
              ? 'local using'
              : divTrap
                ? '0'
                : divFix
                  ? '0.5'
                  : '—'

  const leftLink = stepped ? (trap ? 'fx-link--dead' : ok ? 'fx-link--weld' : 'fx-link--on') : ''
  const rightLink = trap ? 'fx-link--dead' : ok ? 'fx-link--weld' : ''

  const verdict =
    id === 'parse' && i === 1
      ? 'w() · function declaration'
      : parseTrap
        ? 'no object · most vexing parse'
        : parseFix
          ? 'Widget w{} · object'
          : id === 'slice' && i === 1
            ? 'f(Base) · copy a Base'
            : sliceTrap
              ? 'extra dropped · virtuals gone'
              : sliceFix
                ? 'pass Base& · keep dynamic type'
                : id === 'ns' && i === 1
                  ? 'using namespace · every TU'
                  : nsTrap
                    ? 'min/max · ADL · collisions'
                    : nsFix
                      ? 'never in a header'
                      : id === 'div' && i === 1
                        ? 'int / int · int result'
                        : divTrap
                          ? '1/2 is 0 · not a ratio'
                          : divFix
                            ? '1.0 / 2 · 0.5'
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
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">in</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">written</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">meaning</span>
          <div
            className={`fx-slot${
              trap ? ' fx-slot--trap' : ok ? ' fx-slot--weld' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'parse' ? 'most vexing' : id === 'slice' ? 'by value' : id === 'ns' ? 'never here' : 'truncates'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div className={`fx-slot${trap ? ' fx-slot--trap' : ok ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {parseTrap
                ? 'use Widget w{}'
                : parseFix
                  ? 'brace-init'
                  : sliceTrap
                    ? 'pass Base&'
                    : sliceFix
                      ? 'dynamic type kept'
                      : nsTrap
                        ? 'keep it local'
                        : nsFix
                          ? 'in a .cpp maybe'
                          : divTrap
                            ? '1.0 / 2'
                            : divFix
                              ? 'not 0.5 until a float'
                              : 'result'}
            </span>
          </div>
        </div>
      </div>
      {id === 'parse' && stepped ? (
        <div className="fx-sh">
          <div className={`fx-pane${parseTrap ? ' fx-pane--trap' : ' fx-pane--focus'}`}>
            <span className="fx-kicker">function</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${parseTrap || !recap ? ' fx-letter--dead' : ' fx-letter--empty'}`}>f</span>
            </div>
            <span className="fx-note">
              <code>w();</code>
            </span>
          </div>
          <div className={`fx-link${parseFix ? ' fx-link--weld' : parseTrap ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${parseFix ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">object</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${parseFix ? ' fx-letter--on' : ' fx-letter--empty'}`}>{parseFix ? 'W' : '·'}</span>
            </div>
            <span className="fx-note">
              <code>w{'{}'}</code>
            </span>
          </div>
        </div>
      ) : null}
      {id === 'slice' && stepped ? (
        <div className="fx-inh">
          <div className={`fx-slice fx-slice--on${sliceFix ? ' fx-slice--hot' : ''}`}>
            <span className="fx-kicker">Base</span>
            <span className="fx-note">int a</span>
          </div>
          <div
            className={`fx-slice fx-slice--derived${
              sliceTrap ? ' fx-slice--off' : stepped ? ' fx-slice--on' : ' fx-slice--dim'
            }`}
          >
            <span className="fx-kicker">Derived</span>
            <span className="fx-note">{sliceTrap ? 'sliced away' : 'int extra'}</span>
          </div>
        </div>
      ) : null}
      {id === 'ns' && stepped ? (
        <div className="fx-buf-row" style={{ justifyContent: 'center' }}>
          {['min', 'max', 'size'].map((ch) => (
            <span key={ch} className={`fx-letter${nsTrap ? ' fx-letter--dead' : nsFix ? ' fx-letter--empty' : ' fx-letter--on'}`}>
              {ch === 'min' ? 'm' : ch === 'max' ? 'M' : 's'}
            </span>
          ))}
        </div>
      ) : null}
      {id === 'div' && stepped ? (
        <div className="fx-buf-row" style={{ justifyContent: 'center' }}>
          <span className="fx-letter fx-letter--on">1</span>
          <span className="fx-letter fx-letter--pad">/</span>
          <span className="fx-letter fx-letter--on">2</span>
          <span className={`fx-letter${divFix ? ' fx-letter--on' : divTrap ? ' fx-letter--dead' : ' fx-letter--empty'}`}>
            {divFix ? '.5' : divTrap ? '0' : '·'}
          </span>
        </div>
      ) : null}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
