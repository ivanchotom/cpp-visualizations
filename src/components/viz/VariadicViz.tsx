import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'sum' | 'sizeof' | 'index' | 'nobase'

const MODES: { id: Mode; title: string }[] = [
  { id: 'sum', title: 'sum' },
  { id: 'sizeof', title: 'sizeof...' },
  { id: 'index', title: 'index' },
  { id: 'nobase', title: 'no base' },
]

const PACK = ['1', '2', '3'] as const

export function VariadicViz() {
  const [id, setId] = useState<Mode>('sum')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const packed = i >= 1
  const expanded = i >= 2
  const recap = i >= 3
  const sizeofOk = id === 'sizeof' && i === 2
  const sizeofTrap = id === 'sizeof' && i >= 3
  const noStop = id === 'nobase' && expanded
  const won = (id === 'sum' && expanded) || (id === 'index' && expanded) || sizeofOk

  const filled = packed ? (id === 'sizeof' ? 2 : 3) : 0
  const peeled = id === 'nobase' ? (i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0) : filled

  const code =
    id === 'sum'
      ? i < 2
        ? `template <typename... Ts>
int sum(Ts... xs) {
  int t = 0;
  int _[] = {0, (t += static_cast<int>(xs), 0)...};
  (void)_;
  return t;
}`
        : `int n = sum(1, 2, 3);   // t = 6
// comma-in-braces is the C++14 pack foreach
// C++17: (xs + … + 0)`
      : id === 'sizeof'
        ? i < 3
          ? `template <typename... Ts>
constexpr std::size_t n() {
  return sizeof...(Ts);   // length of the pack
}

n<int, char>();           // 2`
          : `template <typename... Ts>
void f(Ts... xs) {
  // sizeof(xs);          // ill-formed: xs is a pack
  sizeof...(xs);          // ok:  the length
}`
        : id === 'index'
          ? i < 2
            ? `template <typename Tuple, std::size_t... I>
void each_impl(Tuple& t, std::index_sequence<I...>) {
  int _[] = {0, ((void)std::get<I>(t), 0)...};
  (void)_;
}`
            : `auto t = std::make_tuple(1, 2, 3);
each_impl(t, std::make_index_sequence<3>{});
// expands get<0>, get<1>, get<2>
// C++14: make_index_sequence`
          : i < 2
            ? `template <typename T, typename... Rest>
void print(T head, Rest... rest) {
  // use head
  print(rest...);          // recurse
}`
            : `print(1, 2, 3);
print(2, 3);
print(3);
print();                  // no matching function
// need: void print() {}  // empty-pack base`

  const caption =
    i === 0
      ? id === 'sum'
        ? 'Play sum. A pack expands with Pattern... in a context that allows it. The C++14 foreach is a dummy initializer list of comma expressions. No fold expressions.'
        : id === 'sizeof'
          ? 'Play sizeof.... sizeof...(Ts) is a compile-time size_t — the length of the pack, not the size of an object. sizeof(xs) on a pack is ill-formed.'
          : id === 'index'
            ? 'Play index. std::make_index_sequence<N> plus a helper that takes index_sequence<I...> lets you expand 0..N-1. That is how you walk a tuple in C++14.'
            : 'Play no base. A recursive variadic without a non-template (or empty-pack) overload never terminates instantiation.'
      : id === 'sum' && i === 1
        ? 'The pack is a list of types and a matching list of values. Empty is valid: sum() is 0. The dummy array is the expand context.'
        : id === 'sum' && i === 2
          ? '(t += xs, 0)... expands into the braces. Each element adds, then yields 0 so the array type is int. (void)_ silences unused.'
          : id === 'sum'
            ? 'g(h(xs)...) applies h to each, then calls g. Expanding in a context that forbids expansion dumps a wall of substitution notes.'
            : id === 'sizeof' && i === 1
              ? 'Two types in the pack. The length is a property of the pack, not of any one object.'
              : id === 'sizeof' && i === 2
                ? 'sizeof...(Ts) is 2. Compile-time. There is no object whose sizeof is “the pack.”'
                : id === 'sizeof'
                  ? 'sizeof(xs) is ill-formed — xs is a pack, not an expression. Write sizeof...(xs).'
                  : id === 'index' && i === 1
                    ? 'make_index_sequence<3> is index_sequence<0, 1, 2>. The helper receives that pack as I....'
                    : id === 'index' && i === 2
                      ? 'I... expands as get<0>(t), get<1>(t), get<2>(t). Same dummy-array foreach as sum. C++17 folds replace most of this.'
                      : id === 'index'
                        ? 'You cannot write get<0, 1, 2> as a pack in the tuple itself. The index pack is the adapter.'
                        : i === 1
                          ? 'head peels off. rest... is the remaining pack. Recursion peels one argument per instantiation.'
                          : i === 2
                            ? 'print() with an empty pack has no overload. Instantiation does not stop. Add void print() {} as the base case.'
                            : 'An empty pack is a valid call if a matching overload exists. Watch the base: the recursive case must not also match zero args.'

  const tone = sizeofTrap || noStop ? 'trap' : won ? 'ok' : 'idle'
  const playLabel =
    id === 'sum'
      ? 'Play sum(1, 2, 3)'
      : id === 'sizeof'
        ? 'Play sizeof...(Ts)'
        : id === 'index'
          ? 'Play index_sequence'
          : 'Play print(rest...)'

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
          <div className={`fx-rank${packed ? ' fx-rank--on' : ''}${expanded ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">pack</span>
            <code>xs...</code>
            <span className="fx-note">{packed ? '1 2 3' : '—'}</span>
          </div>
          <div className={`fx-rank${expanded ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">foreach</span>
            <code>{'(t += xs, 0)...'}</code>
            <span className="fx-note">{expanded ? '6' : '—'}</span>
          </div>
          <div className="fx-buf-row">
            {PACK.map((g, n) => (
              <span key={g} className={`fx-letter${n < peeled ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                {n < peeled ? g : '·'}
              </span>
            ))}
          </div>
        </div>
      )}
      {id === 'sizeof' && (
        <div className="fx-ladder">
          <div className={`fx-rank${packed ? ' fx-rank--on' : ''}${sizeofTrap ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">pack</span>
            <code>sizeof...(Ts)</code>
            <span className="fx-note">{sizeofOk || sizeofTrap ? '2' : packed ? 'len' : '—'}</span>
          </div>
          <div className={`fx-rank${sizeofTrap ? ' fx-rank--on fx-rank--trap' : sizeofOk ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">object</span>
            <code>sizeof(xs)</code>
            <span className="fx-note">{sizeofTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'index' && (
        <div className="fx-ladder">
          {(['0', '1', '2'] as const).map((n, k) => (
            <div key={n} className={`fx-rank${expanded && k <= 2 ? ' fx-rank--on' : packed ? ' fx-rank--done' : ''}`}>
              <span className="fx-note">{`I=${n}`}</span>
              <code>{`get<${n}>`}</code>
              <span className="fx-note">{expanded ? n : packed ? n : '—'}</span>
            </div>
          ))}
        </div>
      )}
      {id === 'nobase' && (
        <div className="fx-sh">
          <div className={`fx-pane${packed ? ' fx-pane--focus' : ''}${noStop && recap ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">rest</span>
            <div className="fx-buf-row">
              {PACK.map((g, n) => (
                <span key={g} className={`fx-letter${n < peeled ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                  {n < peeled ? g : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">{noStop ? 'empty pack' : 'peel head, recurse'}</span>
          </div>
          <div className={`fx-link${noStop ? ' fx-link--dead' : packed ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${expanded ? ' fx-pane--focus' : ''}${noStop ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">print()</span>
            <div className={`fx-slot${noStop ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">base</span>
              <span className="fx-value">{noStop ? 'none' : '—'}</span>
              <span className="fx-note">{noStop ? 'no matching function' : 'need void print() {}'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          sizeofTrap || noStop ? 'fx-verdict--trap' : won ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'sum' && expanded
          ? 'sum(1, 2, 3) · t = 6'
          : sizeofOk
            ? 'sizeof...(Ts) · 2'
            : sizeofTrap
              ? 'sizeof(xs) · ill-formed'
              : id === 'index' && expanded
                ? 'get<0>, get<1>, get<2>'
                : noStop
                  ? 'print() · no matching function'
                  : ''}
      </div>
    </SceneShell>
  )
}
