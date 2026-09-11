import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'decay' | 'fwd' | 'clash' | 'lambda'

const MODES: { id: Mode; title: string }[] = [
  { id: 'decay', title: 'by-value T' },
  { id: 'fwd', title: 'T&&' },
  { id: 'clash', title: 'T clash' },
  { id: 'lambda', title: 'auto x' },
]

export function DeductionViz() {
  const [id, setId] = useState<Mode>('decay')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const looked = i >= 1
  const deduced = i >= 2
  const recap = i >= 3
  const clash = id === 'clash' && deduced
  const won = (id === 'decay' || id === 'fwd' || id === 'lambda') && deduced

  const code =
    id === 'decay'
      ? `template <typename T>
void f(T);          // by value

const int& x = 1;
f(x);               // T = int  (cv and & decay)
// arrays and functions decay to pointers`
      : id === 'fwd'
        ? `template <typename T>
void f(T&&);

int x = 1;
f(x);               // T = int&  (lvalue)
f(1);               // T = int   (rvalue)
// T&& is a forwarding ref only if T is deduced`
        : id === 'clash'
          ? deduced
            ? `template <typename T>
T add(T a, T b) { return a + b; }

// add(1, 2.0);     // ill-formed: T is int and double
add<double>(1, 2);  // T given; 1 and 2 convert`
            : `template <typename T>
T add(T a, T b) { return a + b; }

add(1, 2);          // T = int  ok`
          : i < 2
            ? `auto id = [](auto x) { return x; };

id(42);             // C++14 generic lambda`
            : `auto id = [](auto x) { return x; };
// equivalent to
// template <typename T>
// auto operator()(T x) const { return x; }

id(42);             // T = int`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play f(x). f(T) by value decays: refs and top-level cv go. f(x) with const int& x still stamps T = int.'
        : id === 'fwd'
          ? 'Play f(x). A deduced T&& is a forwarding reference. The same lvalue x that decayed to int now keeps T = int&.'
          : id === 'clash'
            ? 'Play add(1, 2.0). Two parameters both named T must deduce the same type. The call is ill-formed, not “the common type.”'
            : 'Play [](auto x). A C++14 generic lambda is an operator() template. Each auto is its own T.'
      : id === 'decay' && i === 1
        ? 'The argument is const int&. The parameter is by value. T itself is not a reference — cv and & are stripped during deduction.'
        : id === 'decay' && i === 2
          ? 'T lands as int. Arrays and functions decay to pointers the same way. auto x = expr decays like T by value.'
          : id === 'decay'
            ? 'decltype(auto) keeps references — returning a local that way is a dangling-ref factory. C++14 has no CTAD.'
            : id === 'fwd' && i === 1
              ? 'x is an lvalue into T&&. T is deduced, so this is a forwarding reference, not “rvalue only.”'
              : id === 'fwd' && i === 2
                ? 'T = int&. Collapsing: int& && → int&. f(1) would deduce T = int. See Forwarding for std::forward.'
                : id === 'fwd'
                  ? 'void f(Widget&&); is just an rvalue ref. Only a deduced T&& (or auto&&) forwards.'
                  : id === 'clash' && i === 1
                    ? 'First argument 1 deducts T = int. The second parameter is the same T, not a second independent type.'
                    : id === 'clash' && i === 2
                      ? '2.0 would want T = double. Two deductions for one T must agree. The call is ill-formed.'
                      : id === 'clash'
                        ? 'add<double>(1, 2) skips deduction: T is given, and 1 converts. That is not “pick the common type.”'
                        : i === 1
                          ? '42 enters auto x. Each auto parameter is a separate template parameter on the call operator.'
                          : i === 2
                            ? 'The compiler stamps operator()<int>. id("hi") stamps a second copy. Unused autos are never generated.'
                            : 'auto f() { return 1; } is the C++14 deduced return type. Every return must agree, or the function is ill-formed.'

  const tone = clash ? 'trap' : won ? 'ok' : 'idle'
  const playLabel =
    id === 'decay'
      ? 'Play f(x) decay'
      : id === 'fwd'
        ? 'Play f(x) T&&'
        : id === 'clash'
          ? 'Play add(1, 2.0)'
          : 'Play [](auto x)'

  const verdict =
    id === 'decay' && deduced
      ? 'T = int · cv and & decay'
      : id === 'decay' && looked
        ? 'const int& · strip for T'
        : id === 'fwd' && deduced
          ? 'T = int& · forwarding ref'
          : id === 'fwd' && looked
            ? 'lvalue into T&&'
            : clash
              ? recap
                ? 'give T · add<double>(1, 2)'
                : 'T clash · ill-formed'
              : id === 'clash' && looked
                ? 'T = int from 1'
                : id === 'lambda' && deduced
                  ? '[](auto x) · operator()<int>'
                  : id === 'lambda' && looked
                    ? 'auto x · a template param'
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
      {id === 'decay' && (
        <div className="fx-sh">
          <div className={`fx-pane${looked ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">argument</span>
            <div className={`fx-slot${looked ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">x</span>
              <span className="fx-value">{looked ? 'int&' : '—'}</span>
              <span className="fx-note">const int&</span>
            </div>
          </div>
          <div className={`fx-link${won ? ' fx-link--weld' : looked ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">T</span>
            <div className={`fx-slot${won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">by value</span>
              <span className="fx-value">{deduced ? 'int' : '—'}</span>
              <span className="fx-note">{deduced ? 'cv and & gone' : 'waiting'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'fwd' && (
        <div className="fx-sh">
          <div className={`fx-pane${looked ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">lvalue x</span>
            <div className={`fx-slot${looked ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">arg</span>
              <span className="fx-value">{looked ? 'x' : '—'}</span>
              <span className="fx-note">named int</span>
            </div>
          </div>
          <div className={`fx-link${won ? ' fx-link--weld' : looked ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">T&&</span>
            <div className={`fx-slot${won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">T</span>
              <span className="fx-value">{deduced ? 'int&' : '—'}</span>
              <span className="fx-note">{deduced ? 'int& && → int&' : 'forwarding ref'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'clash' && (
        <div className="fx-ladder">
          <div className={`fx-rank${looked ? ' fx-rank--on' : ''}${clash ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">from 1</span>
            <code>T</code>
            <span className="fx-note">{looked ? 'int' : '—'}</span>
          </div>
          <div className={`fx-rank${clash ? ' fx-rank--on fx-rank--trap' : ''}`}>
            <span className="fx-note">from 2.0</span>
            <code>T</code>
            <span className="fx-note">{clash ? 'dbl' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'lambda' && (
        <div className="fx-sh">
          <div className={`fx-pane${looked ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">lambda</span>
            <div className={`fx-slot${looked ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">auto x</span>
              <span className="fx-value">{looked ? '42' : '—'}</span>
              <span className="fx-note">generic call op</span>
            </div>
          </div>
          <div className={`fx-link${won ? ' fx-link--weld' : looked ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">stamp</span>
            <div className={`fx-slot${won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">T</span>
              <span className="fx-value">{deduced ? 'int' : '—'}</span>
              <span className="fx-note">{deduced ? 'operator()<int>' : 'waiting'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          clash ? 'fx-verdict--trap' : won ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
