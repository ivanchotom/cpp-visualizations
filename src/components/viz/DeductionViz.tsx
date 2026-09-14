import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'decay' | 'fwd' | 'clash' | 'lambda'

const MODES: { id: Mode; title: string }[] = [
  { id: 'decay', title: 'decay T' },
  { id: 'fwd', title: 'T&&' },
  { id: 'clash', title: 'T clash' },
  { id: 'lambda', title: 'auto λ' },
]

export function DeductionViz() {
  const [id, setId] = useState<Mode>('decay')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const clashTrap = id === 'clash' && decided
  const trap = clashTrap
  const ok = (id === 'decay' && recap) || (id === 'fwd' && recap) || (id === 'lambda' && recap)

  const code =
    id === 'decay'
      ? recap
        ? `f(x);  // T = int
// t is a copy — not const int&`
        : `template <class T>
void f(T t);          // T after decay

const int& x = 1;
f(x);                 // T = int`
      : id === 'fwd'
        ? recap
          ? `f(x);  // T = int&
// t has type int&  (collapse)`
          : `template <class T>
void f(T&& t);        // forwarding ref

int x = 1;
f(x);                 // T = int&`
        : id === 'clash'
          ? recap
            ? `add(1, 2.0);          // ill-formed
add<double>(1, 2.0);  // T = double`
            : `template <class T>
T add(T a, T b) {
  return a + b;
}

add(1, 2.0);          // ill-formed`
          : recap
            ? `f(42);  // operator()<int>
// C++14 generic lambda
// = templated call operator`
            : `auto f = [](auto x) { return x; };
f(42);  // operator()<int>`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play f(x) decay. By-value T is deduced after decay: references and top-level const/volatile are stripped.'
        : id === 'fwd'
          ? 'Play f(x) T&&. A deduced T&& is a forwarding reference. An lvalue argument makes T an lvalue reference.'
          : id === 'clash'
            ? 'Play add(1, 2.0). Two parameters that share T must agree after deduction. Mixed 1 and 2.0 cannot pick one T.'
            : 'Play [](auto x). A C++14 generic lambda is a class with a templated operator(). auto is the stamp.'
      : id === 'decay' && i === 1
        ? 'f(x) with const int& x — the argument is an lvalue of const int. Stations light in place.'
        : id === 'decay' && i === 2
          ? 'template <class T> void f(T) deduces T = int, not const int&. The parameter is a copy.'
          : id === 'decay'
            ? 'Mutating t never writes through to x. You wanted T& or T&&. std::decay_t<T> names the same transformation explicitly.'
            : id === 'fwd' && i === 1
              ? 'f(x) with int x — the argument is an lvalue, so the parameter wants to bind as int&.'
              : id === 'fwd' && i === 2
                ? 'T&& + lvalue → T = int&, parameter type int& && collapses to int&. std::forward<T>(t) then restores the lvalue.'
                : id === 'fwd'
                  ? 'C++14: deduced T&& is the forwarding reference. Named type && is always an rvalue ref. A prvalue would have deduced T = int.'
                  : id === 'clash' && i === 1
                    ? 'add(1, 2.0) — first argument wants T = int.'
                    : id === 'clash' && i === 2
                      ? 'Second argument wants T = double. One template parameter cannot be both. The call is ill-formed.'
                      : id === 'clash'
                        ? 'Fix with two parameters, or write add<double>(1, 2.0) so 1 converts. C++17 CTAD is a different feature — not this.'
                        : i === 1
                          ? 'f(42) — the closure’s operator() is instantiated with this argument. auto is not a type yet.'
                          : i === 2
                            ? 'operator()<int>(int x) — auto became int. Each distinct type is a new instantiation.'
                            : 'There is no CTAD here. The lambda type is unique; only operator() is a template. [](auto x) is C++14.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'decay'
      ? 'Play f(x) decay'
      : id === 'fwd'
        ? 'Play f(x) T&&'
        : id === 'clash'
          ? 'Play add(1, 2.0)'
          : 'Play [](auto x)'

  const verdict =
    id === 'decay' && recap
      ? 'T = int · copy'
      : id === 'decay' && decided
        ? 'decay · T = int'
        : id === 'decay' && stepped
          ? 'x · const int&'
          : id === 'fwd' && recap
            ? 'T = int& · collapse'
            : id === 'fwd' && decided
              ? 'T&& + lvalue · int&'
              : id === 'fwd' && stepped
                ? 'x · lvalue'
                : id === 'clash' && recap
                  ? 'add(1, 2.0) · ill'
                  : clashTrap
                    ? 'int vs double · ill'
                    : id === 'clash' && stepped
                      ? 'a · T = int'
                      : id === 'lambda' && recap
                        ? 'operator()<int>'
                        : id === 'lambda' && decided
                          ? 'auto · stamped int'
                          : id === 'lambda' && stepped
                            ? 'x · auto'
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
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">c&</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">val</span>
            <span className="fx-note">{decided ? 'int' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'fwd' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">lv</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">T&&</span>
            <span className="fx-note">{decided ? 'i&' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'clash' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${clashTrap ? ' fx-rank--trap' : ''}`}>
            <code>a</code>
            <span className="fx-note">1</span>
            <span className="fx-note">{stepped ? 'int' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${clashTrap ? ' fx-rank--trap' : ''}`}>
            <code>b</code>
            <span className="fx-note">2.0</span>
            <span className="fx-note">{decided ? 'dbl' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'lambda' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">au</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>op</code>
            <span className="fx-note">gen</span>
            <span className="fx-note">{decided ? 'int' : '—'}</span>
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
