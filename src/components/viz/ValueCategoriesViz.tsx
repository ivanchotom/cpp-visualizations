import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'lv' | 'pr' | 'xv' | 'named'
type Cat = 'lvalue' | 'xvalue' | 'prvalue'

const MODES: { id: Mode; title: string }[] = [
  { id: 'lv', title: 'x' },
  { id: 'pr', title: '42' },
  { id: 'xv', title: 'std::move(x)' },
  { id: 'named', title: 'named T&&' },
]

const TAXONOMY: { cat: Cat; aka: string; steal: string; identity: string }[] = [
  { cat: 'lvalue', aka: 'glvalue', steal: 'no (copy)', identity: 'yes' },
  { cat: 'xvalue', aka: 'glvalue + rvalue', steal: 'yes (move)', identity: 'yes (expiring)' },
  { cat: 'prvalue', aka: 'rvalue', steal: 'yes (init / move)', identity: 'no' },
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

  const cat: Cat = id === 'pr' ? 'prvalue' : id === 'xv' && decided ? 'xvalue' : 'lvalue'
  const expr = id === 'lv' ? 'x' : id === 'pr' ? '42' : id === 'xv' ? 'std::move(x)' : 't'
  const namedTrap = id === 'named' && decided && !recap
  const namedFix = id === 'named' && recap
  const maySteal = cat === 'xvalue' || (id === 'pr' && recap)
  const canAddr = cat === 'lvalue' || cat === 'xvalue'

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
        ? 'The expression is the object x. glvalue: you can, in spirit, take its address. The cyan slot is identity.'
        : id === 'lv' && i === 2
          ? 'lvalue ∪ xvalue = glvalue. rvalue = xvalue ∪ prvalue. x is glvalue and not rvalue — copy, do not steal.'
          : id === 'lv'
            ? 'Prefix ++x is also an lvalue (the object). Postfix x++ is a prvalue (a copy of the old value).'
            : id === 'pr' && i === 1
              ? '42 has no name and no address. You cannot write &42. The slot is a value, not an object with identity.'
              : id === 'pr' && i === 2
                ? 'prvalues initialize. int n = 42; materializes (C++14: the temporary is the initializer).'
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

  const tone = namedTrap ? 'trap' : cat === 'xvalue' || namedFix ? 'warn' : recap ? 'ok' : 'idle'
  const playLabel =
    id === 'lv' ? 'Play x' : id === 'pr' ? 'Play 42' : id === 'xv' ? 'Play std::move(x)' : 'Play named t'

  const verdict =
    id === 'named' && namedFix
      ? 'name killed the xvalue · move(t)'
      : namedTrap
        ? 't is an lvalue · take(t) fails'
        : id === 'named' && stepped
          ? 'T&& param · still needs a name check'
          : !stepped
            ? ''
            : cat === 'lvalue'
              ? recap
                ? 'x · identity · copy, do not steal'
                : 'lvalue · glvalue'
              : cat === 'xvalue'
                ? recap
                  ? 'move(x) · identity, expiring · may steal'
                  : 'xvalue · cast, not a move'
                : recap
                  ? '42 · no identity · initializes'
                  : 'prvalue · no address'

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
      <div className="fx-cat-expr">
        <span className="fx-kicker">expression</span>
        <span className={`fx-value${stepped ? '' : ''}`}>
          <code>{expr}</code>
        </span>
        <span className="fx-note">{stepped ? cat : 'waiting'}</span>
      </div>
      <div className="fx-cat-row">
        {TAXONOMY.map((t) => {
          const on = stepped && t.cat === cat
          return (
            <div
              key={t.cat}
              className={`fx-slot${on ? ' fx-slot--focus' : ' fx-slot--dim'}${
                on && t.cat === 'prvalue' ? ' fx-slot--ok' : ''
              }${on && t.cat === 'xvalue' ? ' fx-slot--weld' : ''}${namedTrap && t.cat === 'lvalue' ? ' fx-slot--trap' : ''}`}
            >
              <span className="fx-kicker">{t.cat}</span>
              <span className="fx-note">{t.aka}</span>
              <span className="fx-note">identity: {on ? (canAddr && t.cat !== 'prvalue' ? 'yes' : t.identity) : t.identity}</span>
              <span className="fx-note">move from: {on && maySteal && t.cat !== 'lvalue' ? t.steal : t.steal}</span>
            </div>
          )
        })}
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          namedTrap ? 'fx-verdict--trap' : cat === 'xvalue' || namedFix ? 'fx-verdict--warn' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
