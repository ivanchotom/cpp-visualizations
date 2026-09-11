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
      {id === 'parse' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !parseFix ? ' fx-pane--focus' : ''}${parseTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">function</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${parseTrap || (stepped && !parseFix) ? ' fx-letter--dead' : ' fx-letter--empty'}`}>
                f
              </span>
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
      )}
      {id === 'slice' && (
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
      )}
      {id === 'ns' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !nsFix ? ' fx-pane--focus' : ''}${nsTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">header</span>
            <div className="fx-buf-row">
              {['m', 'M', 's'].map((ch) => (
                <span key={ch} className={`fx-letter${nsTrap ? ' fx-letter--dead' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                  {stepped ? ch : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">using namespace std</span>
          </div>
          <div className={`fx-link${nsFix ? ' fx-link--weld' : nsTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${nsFix ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">.cpp</span>
            <div className={`fx-slot${nsFix ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">using</span>
              <span className="fx-value">{nsFix ? 'str' : '—'}</span>
              <span className="fx-note">{nsFix ? 'using std::string' : 'keep it local'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'div' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !divFix ? ' fx-pane--focus' : ''}${divTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">int / int</span>
            <div className={`fx-slot${divTrap ? ' fx-slot--trap' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">1 / 2</span>
              <span className="fx-value">{divTrap || stepped ? '0' : '—'}</span>
              <span className="fx-note">truncates toward 0</span>
            </div>
          </div>
          <div className={`fx-link${divFix ? ' fx-link--weld' : divTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${divFix ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">float</span>
            <div className={`fx-slot${divFix ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">1.0 / 2</span>
              <span className="fx-value">{divFix ? '0.5' : '—'}</span>
              <span className="fx-note">{divFix ? 'a ratio' : 'need a floating operand'}</span>
            </div>
          </div>
        </div>
      )}
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
