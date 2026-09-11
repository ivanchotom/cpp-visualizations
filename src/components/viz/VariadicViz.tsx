import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'sum' | 'sizeof' | 'index' | 'nobase'

const MODES: { id: Mode; title: string }[] = [
  { id: 'sum', title: 'sum pack' },
  { id: 'sizeof', title: 'sizeof...' },
  { id: 'index', title: 'index_seq' },
  { id: 'nobase', title: 'no base' },
]

export function VariadicViz() {
  const [id, setId] = useState<Mode>('sum')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const sizeTrap = id === 'sizeof' && decided
  const peelTrap = id === 'nobase' && decided
  const trap = sizeTrap || peelTrap
  const ok = (id === 'sum' && recap) || (id === 'index' && recap)

  const restN = i === 1 ? '3' : i === 2 ? '2' : recap ? '0' : '—'

  const code =
    id === 'sum'
      ? recap
        ? `int t = sum(1, 2, 3);  // 6
// C++14 — no (xs + ...)`
        : `template <class... Ts>
int sum(Ts... xs) {
  int t = 0;
  (void)std::initializer_list<int>{
      0, ((t += xs), 0)...};
  return t;
}`
      : id === 'sizeof'
        ? recap
          ? `constexpr std::size_t n = sizeof...(xs);  // 2
// sizeof(xs);  // ill-formed`
          : `template <class... Ts>
void print(Ts... xs) {
  constexpr std::size_t n =
      sizeof...(xs);  // 2
  // sizeof(xs);      // ill-formed
  (void)n;
}`
        : id === 'index'
          ? recap
            ? `return f(std::get<0>(t),
         std::get<1>(t),
         std::get<2>(t));`
            : `template <class F, class Tuple, std::size_t... I>
decltype(auto) apply_impl(
    F&& f, Tuple&& t,
    std::index_sequence<I...>) {
  return std::forward<F>(f)(
      std::get<I>(std::forward<Tuple>(t))...);
}`
          : recap
            ? `void print() {}  // base — required
print(3);  // peels to print() — needs the base`
            : `void print() {}  // base — required

template <class T, class... Rest>
void print(const T& first, Rest... rest) {
  std::cout << first << ' ';
  print(rest...);  // peel
}`

  const caption =
    i === 0
      ? id === 'sum'
        ? 'Play sum(1, 2, 3). C++14 has no fold expressions. Walk a pack with a dummy initializer list: {0, (expr, 0)...}.'
        : id === 'sizeof'
          ? 'Play sizeof...(Ts). sizeof...(Ts) is the pack length. sizeof(xs) is ill-formed — a pack is not a type or object.'
          : id === 'index'
            ? 'Play index_sequence. std::make_index_sequence<N> is C++14. It expands to index_sequence<0, 1, ..., N-1>.'
            : 'Play print(rest...). Recursive print(first, rest...) needs a base case. Without void print() {}, the last call never terminates.'
      : id === 'sum' && i === 1
        ? 'sum(1, 2, 3) — the pack xs... is three ints, not one object you can sizeof. Stations light in place.'
        : id === 'sum' && i === 2
          ? '(void)t += xs expands once per argument. t becomes 0+1+2+3 = 6. The dummy ints are discarded.'
          : id === 'sum'
            ? 'C++17 fold (xs + ...) is shorter. Until then, dummy {0, (expr, 0)...} is the pack foreach. Side effects in the comma expressions still run.'
            : id === 'sizeof' && i === 1
              ? 'sizeof...(xs) is 2 for print(1, 2). The ellipsis is required. len is a compile-time size_t.'
              : id === 'sizeof' && i === 2
                ? 'sizeof(xs) does not mean “size of the pack”. There is no object named xs. The call is ill-formed.'
                : id === 'sizeof'
                  ? 'Use sizeof... for length. sizeof without the dots is a different operator. You can static_assert the length.'
                  : id === 'index' && i === 1
                    ? 'apply(f, t) peels the tuple with get<I>(t)... for I in 0..N-1. The index pack is the expansion engine.'
                    : id === 'index' && i === 2
                      ? 'f(get<0>(t), get<1>(t), get<2>(t)) — the pack of indices becomes the pack of arguments.'
                      : id === 'index'
                        ? 'Without index_sequence you cannot name get<0>, get<1>, get<2> in one expansion. C++17 std::apply does this for you.'
                        : i === 1
                          ? 'print(1, 2, 3) peels first=1, rest = 2, 3. Recurse on rest... The pack shrinks by one each call.'
                          : i === 2
                            ? 'print(2, 3) peels first=2, rest = 3. One argument left is still a pack of size 1. Next peel is print(3).'
                            : 'print(3) peels first=3, rest is empty. The next call is print() — no matching function unless you add void print() {}.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'sum'
      ? 'Play sum(1, 2, 3)'
      : id === 'sizeof'
        ? 'Play sizeof...(Ts)'
        : id === 'index'
          ? 'Play index_sequence'
          : 'Play print(rest...)'

  const verdict =
    id === 'sum' && recap
      ? 't = 6 · dummy foreach'
      : id === 'sum' && decided
        ? 't += xs... · 6'
        : id === 'sum' && stepped
          ? 'xs... · three ints'
          : id === 'sizeof' && recap
            ? 'sizeof... · not sizeof'
            : sizeTrap
              ? 'sizeof(xs) · ill-formed'
              : id === 'sizeof' && stepped
                ? 'sizeof...(xs) = 2'
                : id === 'index' && recap
                  ? 'get<I>(t)... · expand'
                  : id === 'index' && decided
                    ? 'I... · 0, 1, 2'
                    : id === 'index' && stepped
                      ? 'index_sequence · ok'
                      : peelTrap && recap
                        ? 'print() · no base'
                        : peelTrap
                          ? 'rest empty · no match'
                          : id === 'nobase' && stepped
                            ? `peel · rest = ${restN}`
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
      {id === 'sum' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>xs</code>
            <span className="fx-note">pack</span>
            <span className="fx-note">{stepped ? '3' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>t</code>
            <span className="fx-note">foreach</span>
            <span className="fx-note">{decided ? '6' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'sizeof' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>len</code>
            <span className="fx-note">sizeof...</span>
            <span className="fx-note">{stepped ? '2' : '—'}</span>
          </div>
          <div className={`fx-rank${sizeTrap ? ' fx-rank--trap' : decided ? ' fx-rank--on' : ''}`}>
            <code>xs</code>
            <span className="fx-note">sizeof(xs)</span>
            <span className="fx-note">{sizeTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'index' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>I</code>
            <span className="fx-note">index_seq</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>get</code>
            <span className="fx-note">expand</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'nobase' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${peelTrap ? ' fx-rank--trap' : ''}`}>
            <code>rest</code>
            <span className="fx-note">peel</span>
            <span className="fx-note">{stepped ? restN : '—'}</span>
          </div>
          <div className={`fx-rank${peelTrap ? ' fx-rank--trap' : ''}`}>
            <code>print</code>
            <span className="fx-note">base</span>
            <span className="fx-note">{peelTrap ? 'ill' : '—'}</span>
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
