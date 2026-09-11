import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'decay' | 'query' | 'parens' | 'cond'

const MODES: { id: Mode; title: string }[] = [
  { id: 'decay', title: 'decay_t' },
  { id: 'query', title: 'is_integral' },
  { id: 'parens', title: 'decltype' },
  { id: 'cond', title: 'conditional_t' },
]

export function TypeTraitsViz() {
  const [id, setId] = useState<Mode>('decay')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const out = i >= 2
  const recap = i >= 3
  const trap = id === 'parens' && out
  const won = (id === 'decay' && out) || (id === 'cond' && out) || (id === 'query' && i === 1)

  const code =
    id === 'decay'
      ? i < 2
        ? `static_assert(
  std::is_same<std::decay_t<int&>, int>::value,
  "");`
        : `using U = std::decay_t<int&>;  // int
// remove_reference, then array/fn decay`
      : id === 'query'
        ? i < 2
          ? `static_assert(std::is_integral<int>::value, "");`
          : `static_assert(!std::is_integral<int*>::value, "");
// C++14: ::value, not std::is_integral_v`
        : id === 'parens'
          ? i < 2
            ? `int x = 1;
using A = decltype(x);     // int`
            : `using B = decltype((x));  // int&
// extra parens make an lvalue expression`
          : i < 2
            ? `using W = std::conditional_t<
  sizeof(void*) == 8, long, int>;`
            : `using W = long;  // LP64
// std::conditional_t is C++14; ::type is C++11`

  const caption =
    i === 0
      ? id === 'decay'
        ? 'Play decay_t<int&>. Traits are metafunctions: types in, types or bools out. decay is what function arguments do — strip refs, decay arrays.'
        : id === 'query'
          ? 'Play is_integral. Query traits answer yes/no at compile time. C++14 still spells ::value — _v aliases are C++17.'
          : id === 'parens'
            ? 'Play decltype((x)). decltype(x) is the declared type. Extra parens make an lvalue expression, so you get a reference.'
            : 'Play conditional_t. It picks a type from a bool. C++14 adds the _t aliases so you can drop ::type.'
      : id === 'decay' && i === 1
        ? 'int& goes into remove_reference_t. The reference is gone. decay does this first, then array-to-pointer and function-to-pointer.'
        : id === 'decay' && i === 2
          ? 'decay_t<int&> is int. static_assert(is_same<…, int>) holds. This is how you talk about “the value type” of a forwarding reference.'
          : id === 'decay'
            ? 'decltype(expr) keeps references; decay_t usually does not. Pick the one that matches the question you are asking.'
            : id === 'query' && i === 1
              ? 'is_integral<int>::value is true. true_type / false_type are the tag types; ::value is the bool you static_assert.'
              : id === 'query' && i === 2
                ? 'int* is not an integral type. The same trait, a different answer — no runtime branch.'
                : id === 'query'
                  ? 'Incomplete types are often ill-formed here. Test the operation you will actually perform, not a nearby trait name.'
                  : id === 'parens' && i === 1
                    ? 'decltype(x) names the type of the declaration: int. No extra reference.'
                    : id === 'parens' && i === 2
                      ? '(x) is an lvalue expression. decltype((x)) is int&. That extra pair of parens is a famous quiz question.'
                      : id === 'parens'
                        ? 'Need a reference? decltype((x)) or declval<T&>(). Need a value? decay_t or remove_reference_t.'
                        : i === 1
                          ? 'sizeof(void*) == 8 on LP64. The predicate is a compile-time bool, not an if.'
                          : i === 2
                            ? 'conditional_t<true, long, int> is long. The unused branch must still be a valid type name.'
                            : 'C++14: decay_t, enable_if_t, remove_reference_t, conditional_t. C++17 adds if constexpr for the body; this page is the type-level if.'

  const tone = trap ? 'warn' : won || (id === 'query' && out) ? 'ok' : 'idle'
  const playLabel =
    id === 'decay'
      ? 'Play decay_t<int&>'
      : id === 'query'
        ? 'Play is_integral'
        : id === 'parens'
          ? 'Play decltype((x))'
          : 'Play conditional_t'

  const inName = id === 'decay' ? 'int&' : id === 'query' ? (out ? 'int*' : 'int') : id === 'parens' ? 'int x' : 'pred'
  const inVal = id === 'decay' ? 'x' : id === 'query' ? (out ? 'ptr' : '42') : id === 'parens' ? '1' : 'sizeof(void*)'
  const midName =
    id === 'decay'
      ? 'remove_reference_t'
      : id === 'query'
        ? 'is_integral<T>'
        : id === 'parens'
          ? 'decltype(x)'
          : 'conditional_t'
  const midVal =
    id === 'decay' && stepped
      ? 'int'
      : id === 'parens' && stepped
        ? 'int'
        : id === 'query' && i === 1
          ? 'true'
          : id === 'query' && out
            ? 'false'
            : id === 'cond' && stepped
              ? 'sizeof==8'
              : '—'
  const outName =
    id === 'decay'
      ? 'decay_t<int&>'
      : id === 'query'
        ? out
          ? 'false_type'
          : 'true_type'
        : id === 'parens'
          ? 'decltype((x))'
          : 'then / else'
  const outVal =
    id === 'decay' && out
      ? 'int'
      : id === 'query' && out
        ? 'false'
        : id === 'parens' && out
          ? 'int&'
          : id === 'cond' && out
            ? 'long'
            : '—'

  const leftLink = stepped ? 'fx-link--on' : ''
  const rightLink = trap ? 'fx-link--dead' : out ? (id === 'query' && recap ? 'fx-link--on' : 'fx-link--weld') : ''

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
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">in</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">type argument</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">trait</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'decay'
                ? 'strip &'
                : id === 'query'
                  ? '::value  (not _v)'
                  : id === 'parens'
                    ? 'the type of the name'
                    : 'C++14 alias of ::type'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${out ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">out</span>
          <div className={`fx-slot${trap ? ' fx-slot--trap' : out ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {id === 'decay' && out
                ? 'is_same with int'
                : id === 'query' && out
                  ? 'pointers are not integral'
                  : id === 'parens' && out
                    ? 'extra parens → lvalue'
                    : id === 'cond' && out
                      ? 'LP64: pointer is 8'
                      : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${out || (id === 'query' && i >= 1) ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : out || (id === 'query' && i === 1) ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'decay' && out
          ? 'decay_t<int&> · int'
          : id === 'query' && out
            ? 'is_integral<int*> · false'
            : id === 'query' && i === 1
              ? 'is_integral<int> · true'
              : id === 'parens' && out
                ? 'decltype((x)) · int&'
                : id === 'cond' && out
                  ? 'conditional_t · long'
                  : ''}
      </div>
    </SceneShell>
  )
}
