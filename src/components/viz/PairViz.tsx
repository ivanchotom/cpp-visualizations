import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'pair' | 'get' | 'tie' | 'dangle'

const MODES: { id: Mode; title: string }[] = [
  { id: 'pair', title: 'pair' },
  { id: 'get', title: 'get' },
  { id: 'tie', title: 'tie' },
  { id: 'dangle', title: 'dangle' },
]

export function PairViz() {
  const [id, setId] = useState<Mode>('pair')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const dangled = id === 'dangle' && decided
  const pairOk = id === 'pair' && decided
  const getOk = id === 'get' && decided
  const tieOk = id === 'tie' && decided

  const code =
    id === 'pair'
      ? decided
        ? `std::pair<int, std::string> p{1, "n"};
int id = p.first;
std::string name = p.second;
// C++17: auto [id, name] = p;`
        : `auto p = std::make_pair(1, "n");
// pair<int, const char*>
// decay: array → pointer`
      : id === 'get'
        ? `auto t = std::make_tuple(1, 2.0, 'x');
double d = std::get<1>(t);
// std::get<double>(t);  // ok if unique
// get<int> ill-formed if two ints`
        : id === 'tie'
          ? recap
            ? `std::tie(std::ignore, name) = p;
// name is "n"; id untouched
bool operator<(const Rec& a, const Rec& b) {
  return std::tie(a.x, a.y) < std::tie(b.x, b.y);
}`
            : `std::pair<int, std::string> p{1, "n"};
int id;
std::string name;
std::tie(std::ignore, name) = p;`
          : dangled
            ? `auto t = std::forward_as_tuple(42);
// t dangles after this statement
// same trap: tuple<int&>{tmp}`
            : `auto t = std::forward_as_tuple(42);
// tuple<int&&> bound to a temporary`

  const caption =
    i === 0
      ? id === 'pair'
        ? 'Play pair. make_pair / make_tuple deduce with decay. make_pair(1, "n") is pair<int, const char*>, not a pair that owns a string.'
        : id === 'get'
          ? 'Play get. std::get<1>(t) is a compile-time index. Out of range is a compile error. get<T> works only if T is unique in the tuple.'
          : id === 'tie'
            ? 'Play tie. C++14 has no structured bindings. std::tie(a, b) = p unpacks into existing lvalues. std::ignore skips a slot.'
            : 'Play dangle. forward_as_tuple is a tuple of references to the arguments. Store it past the full-expression and the refs dangle.'
      : id === 'pair' && i === 1
        ? 'Deduction decays: the string literal is const char*, not an array type inside the pair. Slots light in place.'
        : id === 'pair' && i === 2
          ? 'The pair is first/second. Vocabulary type for “return two things.” Prefer a named struct when the fields have meaning.'
          : id === 'pair'
            ? 'C++17 structured bindings unpack without tie. Until then, first/second, get<I>, or tie into named locals.'
            : id === 'get' && i === 1
              ? 'I is part of the template. There is no runtime get(n) in the type system — that is a different function you write with index_sequence.'
              : id === 'get' && i === 2
                ? 'Index 1 is 2.0. get<double>(t) also works here because double appears once. Two ints make get<int> ill-formed.'
                : id === 'get'
                  ? 'tuple is a heterogeneous pack with a size known at compile time. Walk it with index_sequence, not a for loop on I. C++14 has make_index_sequence.'
                  : id === 'tie' && i === 1
                    ? 'std::ignore skips the first slot. tie builds a tuple of lvalue references to the named objects you already have.'
                    : id === 'tie' && i === 2
                      ? 'name is "n". id is untouched. The same tie trick implements operator< on several fields without writing each comparison.'
                      : id === 'tie'
                        ? 'tie(a.x, a.y) < tie(b.x, b.y) is lexicographic. It is not a hash, and it copies nothing — it compares through the references.'
                        : i === 1
                          ? 'forward_as_tuple(42) is tuple<int&&>. The weld is a reference bound to a temporary that dies at the semicolon.'
                          : i === 2
                            ? 'The stored tuple still exists. The temporary is gone. The weld dies. tuple<int&> bound to a temporary is the same trap.'
                            : 'Returning a local pair/tuple by value is fine — NRVO or a move. Returning a tuple of references to locals is not.'

  const tone = dangled ? 'trap' : pairOk || getOk || tieOk ? 'ok' : 'idle'
  const playLabel =
    id === 'pair' ? 'Play make_pair' : id === 'get' ? 'Play get<1>' : id === 'tie' ? 'Play tie' : 'Play forward_as_tuple'

  const inName = id === 'pair' ? 'args' : id === 'get' ? 'tuple' : id === 'tie' ? 'pair p' : 'temporary'
  const inVal = id === 'pair' ? '1, "n"' : id === 'get' ? '1, 2.0, x' : id === 'tie' ? '{1, "n"}' : '42'
  const midName =
    id === 'pair' ? 'make_pair' : id === 'get' ? 'get<I>' : id === 'tie' ? 'std::tie' : 'forward_as_tuple'
  const midVal =
    id === 'pair' && stepped
      ? 'decay'
      : id === 'get' && stepped
        ? 'index 1'
        : id === 'tie' && stepped
          ? 'lvalue refs'
          : id === 'dangle' && stepped
            ? 'tuple<int&&>'
            : '—'
  const outName =
    id === 'pair' ? 'pair<int, const char*>' : id === 'get' ? 'double' : id === 'tie' ? 'name' : 'stored t'
  const outVal =
    pairOk
      ? '{1, "n"}'
      : getOk
        ? '2.0'
        : tieOk
          ? '"n"'
          : dangled
            ? 'dangles'
            : '—'

  const leftLink = stepped ? (id === 'dangle' && i === 1 ? 'fx-link--weld' : dangled ? 'fx-link--dead' : id === 'tie' ? 'fx-link--weld' : 'fx-link--on') : ''
  const rightLink = dangled ? 'fx-link--dead' : pairOk || getOk || tieOk ? 'fx-link--weld' : ''

  const tupleSlots = ['1', '2.0', 'x']

  const verdict =
    id === 'pair' && i === 1
      ? 'decay · const char*'
      : pairOk
        ? 'first / second'
        : id === 'get' && i === 1
          ? 'get<1> · compile-time I'
          : getOk
            ? 'get<1> · 2.0'
            : id === 'tie' && i === 1
              ? 'ignore · skip first'
              : tieOk
                ? 'name = "n" · id untouched'
                : id === 'dangle' && i === 1
                  ? 'tuple<int&&> · temporary'
                  : dangled
                    ? 'full-expression ended · dangle'
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
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${dangled ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">in</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            {id === 'get' && (
              <div className="fx-buf-row">
                {tupleSlots.map((ch, n) => (
                  <span
                    key={n}
                    className={`fx-letter${stepped && n === 1 ? ' fx-letter--it' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            )}
            {id === 'pair' && (
              <div className="fx-buf-row">
                <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>1</span>
                <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>n</span>
              </div>
            )}
            <span className="fx-note">values</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">op</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}${id === 'dangle' && i === 1 ? ' fx-slot--weld' : ''}`}>
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'pair'
                ? 'not pair<int, char[2]>'
                : id === 'get'
                  ? 'compile-time I'
                  : id === 'tie'
                    ? 'existing names'
                    : 'refs to args'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${dangled ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div className={`fx-slot${dangled ? ' fx-slot--trap' : pairOk || getOk || tieOk ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            {id === 'pair' && decided && (
              <div className="fx-buf-row">
                <span className="fx-letter fx-letter--on">1</span>
                <span className="fx-letter fx-letter--on">n</span>
              </div>
            )}
            <span className="fx-note">
              {pairOk
                ? 'decayed types'
                : getOk
                  ? 'by index'
                  : tieOk
                    ? 'ignore skipped id'
                    : dangled
                      ? 'full-expression ended'
                      : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          dangled ? 'fx-verdict--trap' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
