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
  const decided = i >= 2
  const recap = i >= 3
  const ptrNo = id === 'query' && decided
  const exprRef = id === 'parens' && decided
  const trap = ptrNo
  const warn = exprRef
  const ok = (id === 'decay' && recap) || (id === 'cond' && recap) || (id === 'query' && recap)

  const code =
    id === 'decay'
      ? recap
        ? `using U = std::decay_t<int&>;  // int
// remove_reference, then array/fn decay`
        : `static_assert(
  std::is_same<std::decay_t<int&>, int>::value,
  "");`
      : id === 'query'
        ? recap
          ? `static_assert(!std::is_integral<int*>::value, "");
// C++14: ::value, not std::is_integral_v`
          : `static_assert(std::is_integral<int>::value, "");
static_assert(!std::is_integral<int*>::value, "");`
        : id === 'parens'
          ? recap
            ? `int x = 1;
using A = decltype(x);     // int
using B = decltype((x));  // int&`
            : `int x = 1;
using A = decltype(x);     // int
using B = decltype((x));  // int&`
          : recap
            ? `using W = std::conditional_t<
    sizeof(void*) == 8, long, int>;
// W is long on LP64`
            : `using W = std::conditional_t<
    sizeof(void*) == 8, long, int>;`

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
        ? 'int& goes into remove_reference_t. The reference is gone. decay does this first, then array-to-pointer and function-to-pointer. Stations light in place.'
        : id === 'decay' && i === 2
          ? 'decay_t<int&> is int. static_assert(is_same<…, int>) holds. This is how you talk about “the value type” of a forwarding reference.'
          : id === 'decay'
            ? 'decltype(expr) keeps references; decay_t usually does not. Pick the one that matches the question you are asking.'
            : id === 'query' && i === 1
              ? 'is_integral<int>::value is true. true_type / false_type are the tag types; ::value is the bool you static_assert.'
              : id === 'query' && i === 2
                ? 'int* is not an integral type. The same trait, a different answer — no runtime branch.'
                : id === 'query'
                  ? 'Incomplete types are often ill-formed here. Test the operation you will actually perform, not a nearby trait name. C++14: ::value, not _v.'
                  : id === 'parens' && i === 1
                    ? 'decltype(x) names the type of the declaration: int. No extra reference.'
                    : id === 'parens' && i === 2
                      ? '(x) is an lvalue expression. decltype((x)) is int&. That extra pair of parens is a famous quiz question.'
                      : id === 'parens'
                        ? 'Need a reference? decltype((x)) or declval<T&>(). Need a value? decay_t or remove_reference_t.'
                        : i === 1
                          ? 'sizeof(void*) == 8 on LP64. The predicate is a compile-time bool, not an if.'
                          : i === 2
                            ? 'conditional_t<true, long, int> is long. The unused branch must still be a valid type name. int is dropped, not ill-formed.'
                            : 'C++14: decay_t, enable_if_t, remove_reference_t, conditional_t. C++17 adds if constexpr for the body; this page is the type-level if.'

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'decay'
      ? 'Play decay_t<int&>'
      : id === 'query'
        ? 'Play is_integral'
        : id === 'parens'
          ? 'Play decltype((x))'
          : 'Play conditional_t'

  const verdict =
    id === 'decay' && recap
      ? 'decay_t<int&> · int'
      : id === 'decay' && decided
        ? 'strip & · int'
        : id === 'decay' && stepped
          ? 'in · int&'
          : id === 'query' && recap
            ? 'int* · not integral'
            : ptrNo
              ? 'is_integral<int*> · no'
              : id === 'query' && stepped
                ? 'is_integral<int> · yes'
                : id === 'parens' && recap
                  ? 'extra () · int&'
                  : exprRef
                    ? 'decltype((x)) · int&'
                    : id === 'parens' && stepped
                      ? 'decltype(x) · int'
                      : id === 'cond' && recap
                        ? 'W · long on LP64'
                        : id === 'cond' && decided
                          ? 'then · long'
                          : id === 'cond' && stepped
                            ? 'pred · yes'
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
            <code>in</code>
            <span className="fx-note">int&</span>
            <span className="fx-note">{stepped ? 'ref' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>U</code>
            <span className="fx-note">decay_t</span>
            <span className="fx-note">{decided ? 'int' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'query' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>int</code>
            <span className="fx-note">is_integral</span>
            <span className="fx-note">{stepped ? 'yes' : '—'}</span>
          </div>
          <div className={`fx-rank${ptrNo ? ' fx-rank--trap' : ''}`}>
            <code>ptr</code>
            <span className="fx-note">is_integral</span>
            <span className="fx-note">{ptrNo ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'parens' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">decltype</span>
            <span className="fx-note">{stepped ? 'int' : '—'}</span>
          </div>
          <div className={`fx-rank${exprRef ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>(x)</code>
            <span className="fx-note">extra ()</span>
            <span className="fx-note">{exprRef ? 'int&' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cond' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>pred</code>
            <span className="fx-note">LP64</span>
            <span className="fx-note">{stepped ? 'yes' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>W</code>
            <span className="fx-note">then</span>
            <span className="fx-note">{decided ? 'long' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : warn ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
