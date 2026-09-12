import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'lv' | 'pr' | 'xv' | 'named'

const MODES: { id: Mode; title: string }[] = [
  { id: 'lv', title: 'x' },
  { id: 'pr', title: '42' },
  { id: 'xv', title: 'std::move(x)' },
  { id: 'named', title: 'named T&&' },
]

export function ValueCategoriesViz() {
  const [id, setId] = useState<Mode>('lv')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const namedTrap = id === 'named' && decided
  const prTrap = id === 'pr' && decided
  const trap = namedTrap || prTrap
  const ok = (id === 'lv' && recap) || (id === 'xv' && recap)

  const code =
    id === 'lv'
      ? recap
        ? `int x = 1;
&x;         // ok — identity
// steal(x) would copy`
        : `int x = 1;
x;          // lvalue`
      : id === 'pr'
        ? recap
          ? `int n = 42;     // initializes
// &42;          // ill-formed`
          : `42;         // prvalue`
        : id === 'xv'
          ? recap
            ? `std::move(x);  // xvalue
// does not move; marks expiring`
            : `std::move(x);  // static_cast<int&&>(x)`
          : recap
            ? `void wrap(std::string&& t) {
  take(std::move(t));  // xvalue
}`
            : `void wrap(std::string&& t) {
  take(t);  // error: t is an lvalue
}`

  const caption =
    i === 0
      ? id === 'lv'
        ? 'Play x. A named variable has identity. You can take &x. You do not steal from it — you copy.'
        : id === 'pr'
          ? 'Play 42. A literal has no identity. It is a pure incoming value (prvalue). In C++14 it initializes or is moved from.'
          : id === 'xv'
            ? 'Play std::move(x). An unconditional cast to T&&. It does not move; it marks the expression as an xvalue.'
            : 'Play named t. A named T&& is still an lvalue. wrap must call std::move (or std::forward) — the name killed the xvalue.'
      : id === 'lv' && i === 1
        ? 'The expression is the object x. glvalue: you can take its address. Stations light in place.'
        : id === 'lv' && i === 2
          ? 'lvalue ∪ xvalue = glvalue. rvalue = xvalue ∪ prvalue. x is glvalue and not rvalue — copy, do not steal.'
          : id === 'lv'
            ? 'Prefix ++x is also an lvalue (the object). Postfix x++ is a prvalue (a copy of the old value).'
            : id === 'pr' && i === 1
              ? '42 has no name and no address. You cannot write &42. The slot is a value, not an object with identity.'
              : id === 'pr' && i === 2
                ? '&42 is ill-formed. prvalues initialize: int n = 42; materializes (C++14: the temporary is the initializer).'
                : id === 'pr'
                  ? 'x++ is also a prvalue: a temporary copy of the old value. The object x is still an lvalue.'
                  : id === 'xv' && i === 1
                    ? 'x still exists. std::move is static_cast<int&&>(x). Same identity, now expiring.'
                    : id === 'xv' && i === 2
                      ? 'xvalue = glvalue + rvalue. You may steal. The cast does not empty x by itself — a move constructor would.'
                      : id === 'xv'
                        ? 'Using x after move without reassigning is valid but unspecified. move is a mark, not a verb.'
                        : i === 1
                          ? 'The parameter is declared T&&. That is an rvalue reference. Binding succeeded because the caller passed an rvalue (or move).'
                          : i === 2
                            ? 'The name t makes it an lvalue. take(t) will not bind to take(string&&). That is the classic trap.'
                            : 'take(std::move(t)) restores the xvalue. On a forwarding reference write std::forward<T>(t) instead.'

  const tone = trap ? 'trap' : id === 'xv' && decided ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'lv' ? 'Play x' : id === 'pr' ? 'Play 42' : id === 'xv' ? 'Play std::move(x)' : 'Play named t'

  const verdict =
    namedTrap && recap
      ? 'name killed the xvalue · move(t)'
      : namedTrap
        ? 't is an lvalue · take(t) fails'
        : id === 'named' && stepped
          ? 'T&& param · still needs a name check'
          : id === 'lv' && recap
            ? 'x · identity · copy, do not steal'
            : id === 'lv' && decided
              ? 'lvalue · glvalue'
              : id === 'lv' && stepped
                ? 'x · has identity'
                : prTrap && recap
                  ? '42 · no identity · initializes'
                  : prTrap
                    ? '&42 · ill-formed'
                    : id === 'pr' && stepped
                      ? 'prvalue · no address'
                      : id === 'xv' && recap
                        ? 'move(x) · identity, expiring · may steal'
                        : id === 'xv' && decided
                          ? 'xvalue · cast, not a move'
                          : id === 'xv' && stepped
                            ? 'same object · now expiring'
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
      {id === 'lv' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>id</code>
            <span className="fx-note">addr</span>
            <span className="fx-note">{stepped ? 'yes' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>st</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{decided ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'pr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>id</code>
            <span className="fx-note">addr</span>
            <span className="fx-note">{stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${prTrap ? ' fx-rank--trap' : ''}`}>
            <code>ad</code>
            <span className="fx-note">&42</span>
            <span className="fx-note">{prTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'xv' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>id</code>
            <span className="fx-note">addr</span>
            <span className="fx-note">{stepped ? 'yes' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>st</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{decided ? 'yes' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'named' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>t</code>
            <span className="fx-note">nm</span>
            <span className="fx-note">{stepped ? 'lv' : '—'}</span>
          </div>
          <div className={`fx-rank${namedTrap ? ' fx-rank--trap' : ''}`}>
            <code>tk</code>
            <span className="fx-note">take</span>
            <span className="fx-note">{namedTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : id === 'xv' && decided ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
