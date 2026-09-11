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

  const inName = id === 'decay' ? 'argument' : id === 'fwd' ? 'lvalue x' : id === 'clash' ? 'add(T, T)' : 'generic λ'
  const inVal = id === 'decay' ? 'const int&' : id === 'fwd' ? 'int x' : id === 'clash' ? '1, 2.0' : '[](auto x)'
  const midName = id === 'decay' ? 'param T' : id === 'fwd' ? 'param T&&' : id === 'clash' ? 'T from 1' : 'operator()'
  const midVal =
    id === 'decay' && looked
      ? 'by value'
      : id === 'fwd' && looked
        ? 'forwarding ref'
        : id === 'clash' && looked
          ? 'T = int'
          : id === 'lambda' && looked
            ? 'template'
            : '—'
  const outName = id === 'clash' ? 'T from 2.0' : 'T'
  const outVal =
    id === 'decay' && deduced
      ? 'int'
      : id === 'fwd' && deduced
        ? 'int&'
        : clash
          ? 'double ≠ int'
          : id === 'lambda' && deduced
            ? 'int'
            : '—'

  const leftLink = looked ? 'fx-link--on' : ''
  const rightLink = clash ? 'fx-link--dead' : won ? 'fx-link--weld' : deduced ? 'fx-link--on' : ''

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
        <div className={`fx-pane${looked ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">call</span>
          <div className={`fx-slot${looked ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">argument</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${looked ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">param</span>
          <div className={`fx-slot${looked ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'decay' ? 'cv and & drop' : id === 'fwd' ? 'T deduced' : id === 'clash' ? 'first argument' : 'C++14'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">result</span>
          <div className={`fx-slot${clash ? ' fx-slot--trap' : won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {id === 'decay' && won
                ? 'decayed'
                : id === 'fwd' && won
                  ? 'keeps lvalue'
                  : clash
                    ? 'must agree'
                    : won
                      ? recap
                        ? 'stamped operator()'
                        : 'call operator'
                      : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          clash ? 'fx-verdict--trap' : won ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'decay' && deduced
          ? 'T = int · cv and & decay'
          : id === 'fwd' && deduced
            ? 'T = int& · forwarding ref'
            : clash
              ? recap
                ? 'give T · add<double>(1, 2)'
                : 'T clash · ill-formed'
              : id === 'lambda' && deduced
                ? '[](auto x) · operator()<int>'
                : ''}
      </div>
    </SceneShell>
  )
}
