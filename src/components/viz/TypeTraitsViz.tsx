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
  const stripped = id === 'decay' && stepped
  const decayed = id === 'decay' && decided
  const intYes = id === 'query' && stepped
  const ptrNo = id === 'query' && decided
  const nameTy = id === 'parens' && stepped
  const exprTy = id === 'parens' && decided
  const predOn = id === 'cond' && stepped
  const picked = id === 'cond' && decided
  const trap = exprTy

  const code =
    id === 'decay'
      ? decided
        ? `using U = std::decay_t<int&>;  // int
// remove_reference, then array/fn decay`
        : `static_assert(
  std::is_same<std::decay_t<int&>, int>::value,
  "");`
      : id === 'query'
        ? decided
          ? `static_assert(!std::is_integral<int*>::value, "");
// C++14: ::value, not std::is_integral_v`
          : `static_assert(std::is_integral<int>::value, "");`
        : id === 'parens'
          ? decided
            ? `int x = 1;
using A = decltype(x);     // int
using B = decltype((x));  // int&`
            : `int x = 1;
using A = decltype(x);     // int`
          : decided
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

  const tone = trap ? 'warn' : decayed || ptrNo || picked || (id === 'query' && intYes && !ptrNo) ? 'ok' : 'idle'
  const playLabel =
    id === 'decay'
      ? 'Play decay_t<int&>'
      : id === 'query'
        ? 'Play is_integral'
        : id === 'parens'
          ? 'Play decltype((x))'
          : 'Play conditional_t'

  const verdict =
    decayed
      ? 'decay_t<int&> · int'
      : stripped
        ? 'remove_reference_t · int'
        : ptrNo
          ? 'is_integral<int*> · false'
          : intYes
            ? 'is_integral<int> · true'
            : exprTy
              ? 'decltype((x)) · int&'
              : nameTy
                ? 'decltype(x) · int'
                : picked
                  ? 'conditional_t · long'
                  : predOn
                    ? 'pred · true on LP64'
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
        <div className="fx-sh">
          <div className={`fx-pane${stripped && !decayed ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">int&</span>
            <div className={`fx-slot${stripped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">in</span>
              <span className="fx-value">{stripped ? 'int&' : '—'}</span>
              <span className="fx-note">reference wrapper</span>
            </div>
          </div>
          <div className={`fx-link${decayed ? ' fx-link--weld' : stripped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decayed ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">decay_t</span>
            <div className={`fx-slot${decayed ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">out</span>
              <span className="fx-value">{decayed ? 'int' : stripped ? 'int' : '—'}</span>
              <span className="fx-note">{decayed ? 'value type' : 'strip &, then decay'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'query' && (
        <div className="fx-ladder">
          <div className={`fx-rank${intYes ? ' fx-rank--on' : ''}${ptrNo ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">int</span>
            <code>is_integral</code>
            <span className="fx-note">{intYes ? 'true' : '—'}</span>
          </div>
          <div className={`fx-rank${ptrNo ? ' fx-rank--on fx-rank--trap' : ''}`}>
            <span className="fx-note">int*</span>
            <code>is_integral</code>
            <span className="fx-note">{ptrNo ? 'false' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'parens' && (
        <div className="fx-sh">
          <div className={`fx-pane${nameTy ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">decltype(x)</span>
            <div className={`fx-slot${nameTy ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">name</span>
              <span className="fx-value">{nameTy ? 'int' : '—'}</span>
              <span className="fx-note">declared type</span>
            </div>
          </div>
          <div className={`fx-link${exprTy ? ' fx-link--dead' : nameTy ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${exprTy ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">decltype((x))</span>
            <div className={`fx-slot${exprTy ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">expr</span>
              <span className="fx-value">{exprTy ? 'int&' : '—'}</span>
              <span className="fx-note">{exprTy ? 'extra parens → lvalue' : 'waiting'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'cond' && (
        <div className="fx-ladder">
          <div className={`fx-rank${predOn ? ' fx-rank--on' : ''}${picked ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">pred</span>
            <code>sizeof==8</code>
            <span className="fx-note">{predOn ? 'true' : '—'}</span>
          </div>
          <div className={`fx-rank${picked ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">then</span>
            <code>long</code>
            <span className="fx-note">{picked ? 'W' : '—'}</span>
          </div>
          <div className={`fx-rank${picked ? ' fx-rank--done' : predOn ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">else</span>
            <code>int</code>
            <span className="fx-note">{picked ? 'drop' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
