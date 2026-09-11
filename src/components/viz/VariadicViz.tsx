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

  const leftLink = packed ? (noStop || sizeofTrap ? 'fx-link--dead' : 'fx-link--on') : ''
  const rightLink = sizeofTrap || noStop ? 'fx-link--dead' : won ? 'fx-link--weld' : expanded ? 'fx-link--on' : ''

  const glyphs = id === 'sizeof' ? ['int', 'char'] : id === 'index' ? ['0', '1', '2'] : PACK
  const packLabel = id === 'sizeof' ? 'Ts...' : id === 'index' ? 'I...' : id === 'nobase' ? 'rest...' : 'xs...'

  const outVal =
    id === 'sum' && expanded
      ? '6'
      : sizeofOk
        ? '2'
        : sizeofTrap
          ? 'ill-formed'
          : id === 'index' && expanded
            ? 'get<0,1,2>'
            : noStop
              ? 'no stop'
              : '—'

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
        <div className={`fx-pane${packed ? ' fx-pane--focus' : ''}${noStop && recap ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">pack</span>
          <div className={`fx-slot${packed ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{packLabel}</span>
            <div className="fx-buf-row">
              {glyphs.map((g, n) => (
                <span
                  key={g}
                  className={`fx-letter${n < peeled ? (id === 'nobase' ? ' fx-letter--on' : ' fx-letter--on') : ' fx-letter--empty'}`}
                >
                  {n < peeled ? g : '∅'}
                </span>
              ))}
            </div>
            <span className="fx-note">{id === 'nobase' ? `print remaining ${peeled}` : 'not an object'}</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${packed ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">expand</span>
          <div className={`fx-slot${packed ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">
              {id === 'sum' ? '(t += xs, 0)...' : id === 'sizeof' ? 'sizeof...' : id === 'index' ? 'index_sequence' : 'print(rest...)'}
            </span>
            <span className="fx-value">
              {id === 'sum' && packed ? '{ … }' : id === 'sizeof' && packed ? 'length' : id === 'index' && packed ? 'I...' : packed ? 'recurse' : '—'}
            </span>
            <span className="fx-note">
              {id === 'sum' ? 'C++14 foreach' : id === 'sizeof' ? 'not sizeof(xs)' : id === 'index' ? 'C++14' : 'needs a base'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${expanded ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">result</span>
          <div
            className={`fx-slot${
              sizeofTrap || noStop ? ' fx-slot--trap' : won ? ' fx-slot--ok' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">
              {id === 'sum' ? 't' : id === 'sizeof' ? 'count' : id === 'index' ? 'each' : 'instantiation'}
            </span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {id === 'sum' && won
                ? 'comma in braces'
                : sizeofTrap
                  ? 'pack, not object'
                  : sizeofOk
                    ? 'compile-time'
                    : id === 'index' && won
                      ? '0 .. N-1'
                      : noStop
                        ? 'never terminates'
                        : 'waiting'}
            </span>
          </div>
        </div>
      </div>
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
