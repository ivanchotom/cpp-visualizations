import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'fn' | 'unused' | 'cls' | 'tn'

const MODES: { id: Mode; title: string }[] = [
  { id: 'fn', title: 'twice(21)' },
  { id: 'unused', title: 'unused T' },
  { id: 'cls', title: 'Box<int>' },
  { id: 'tn', title: 'typename' },
]

export function TemplatesViz() {
  const [id, setId] = useState<Mode>('fn')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const stampInt = (id === 'fn' && stepped) || (id === 'unused' && stepped)
  const stampDouble = id === 'fn' && decided
  const noString = id === 'unused' && decided
  const recipeOn = id === 'cls' && stepped
  const boxOk = id === 'cls' && decided
  const tnNeed = id === 'tn' && stepped
  const tnTrap = id === 'tn' && decided
  const tnOk = id === 'tn' && recap
  const trap = tnTrap
  const ok = (id === 'fn' && recap) || (id === 'unused' && recap) || (boxOk && recap) || tnOk

  const code =
    id === 'fn'
      ? recap
        ? `// twice<int> and twice<double>
// both exist in the binary`
        : decided
          ? `twice(2.5);  // T = double`
          : `template <typename T>
T twice(T x) {
  return x + x;
}`
      : id === 'unused'
        ? recap
          ? `// no twice<string> in the binary
// unused T is never generated`
          : `twice(21);  // T = int
// never twice("hi")`
        : id === 'cls'
          ? recap
            ? `Box<int> b{1};  // C++14: write T
// Box b{1};     // C++17 CTAD`
            : `template <class T>
struct Box { T v; };

Box<int> b{1};`
          : recap
            ? `template <class T>
void f(T& c) {
  typename T::iterator it = c.begin();
}`
            : `template <class T>
void f(T& c) {
  T::iterator it = c.begin();  // error
}`

  const caption =
    i === 0
      ? id === 'fn'
        ? 'Play twice(21). A function template is not a function. It is a recipe the compiler copies for each set of arguments it actually sees.'
        : id === 'unused'
          ? 'Play unused T. Instantiation is demand-driven. A T you never call is not a function in the binary.'
          : id === 'cls'
            ? 'Play Box<int>. A class template is a recipe for a type. C++14 has no CTAD — write the argument.'
            : 'Play T::iterator. Dependent nested types need typename. Without it the compiler may parse iterator as a static value.'
      : id === 'fn' && i === 1
        ? 'Deduction: T = int. The compiler stamps out int twice(int). That copy is what the linker sees.'
        : id === 'fn' && i === 2
          ? 'A second instantiation: T = double. twice<int> stays. They are different functions. C++14: no CTAD; function templates still deduce from arguments.'
          : id === 'fn'
            ? 'Two copies now live in the program. That is why templates belong in headers — each TU that calls twice must see the recipe.'
            : id === 'unused' && i === 1
              ? 'twice(21) stamps twice<int>. The recipe still sits in the header. string has not been asked for.'
              : id === 'unused' && i === 2
                ? 'No twice("hi"). The string slot stays empty. Unused T is not generated — that is not a linker error, it is simply absent.'
                : id === 'unused'
                  ? 'Hide heavy work behind a non-template .cpp when the set of T is small. Otherwise every TU that sees the recipe may stamp it.'
                  : id === 'cls' && i === 1
                    ? 'Box is not a type. Box<int> is. The compiler stamps a class with T = int. Members and member functions follow.'
                    : id === 'cls' && i === 2
                      ? 'b holds 1. The type is Box<int>, not Box. Writing Box b{1} is C++17 class template argument deduction.'
                      : id === 'cls'
                        ? 'Keep class templates in headers too. Explicit instantiation can hide the heavy part in a .cpp when T is known.'
                        : i === 1
                          ? 'T::iterator depends on T. At the definition the compiler does not know whether iterator is a type or a value.'
                          : i === 2
                            ? 'Ill-formed (or parsed as a value). Two-phase lookup: non-dependent names at definition, dependent names at instantiation.'
                            : 'typename T::iterator tells the compiler it is a type. Same idea as template for a dependent template: c.template get<0>().'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'fn' ? 'Play twice(21)' : id === 'unused' ? 'Play no twice<string>' : id === 'cls' ? 'Play Box<int>' : 'Play T::iterator'

  const verdict =
    id === 'fn' && recap
      ? 'two functions · unused T never generated'
      : id === 'fn' && stampDouble
        ? 'second stamp · twice<double>'
        : id === 'fn' && stampInt
          ? 'first stamp · twice<int>'
          : id === 'unused' && recap
            ? 'no twice<string> · not generated'
            : id === 'unused' && noString
              ? 'string slot empty'
              : id === 'unused' && stampInt
                ? 'twice<int> only'
                : boxOk && recap
                  ? 'C++14 · write Box<int>'
                  : boxOk
                    ? 'Box<int> is a type'
                    : recipeOn
                      ? 'Box is a recipe'
                      : tnOk
                        ? 'typename · it is a type'
                        : tnTrap
                          ? 'T::iterator · ill-formed'
                          : tnNeed
                            ? 'dependent · type or value?'
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
      {id === 'fn' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stampInt ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>int</code>
            <span className="fx-note">fn</span>
            <span className="fx-note">{stampInt ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${stampDouble ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>dbl</code>
            <span className="fx-note">fn</span>
            <span className="fx-note">{stampDouble ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'unused' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stampInt ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>int</code>
            <span className="fx-note">fn</span>
            <span className="fx-note">{stampInt ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${noString ? ' fx-rank--on' : ''}${noString ? ' fx-rank--trap' : ''}`}>
            <code>str</code>
            <span className="fx-note">gen</span>
            <span className="fx-note">{noString ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cls' && (
        <div className="fx-ladder">
          <div className={`fx-rank${recipeOn ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">rec</span>
            <span className="fx-note">{recipeOn ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${boxOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>int</code>
            <span className="fx-note">typ</span>
            <span className="fx-note">{boxOk ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'tn' && (
        <div className="fx-ladder">
          <div className={`fx-rank${tnNeed ? ' fx-rank--on' : ''}${tnTrap ? ' fx-rank--trap' : ''}`}>
            <code>it</code>
            <span className="fx-note">nest</span>
            <span className="fx-note">{tnTrap ? 'ill' : tnNeed ? '?' : '—'}</span>
          </div>
          <div className={`fx-rank${tnOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>kw</code>
            <span className="fx-note">tn</span>
            <span className="fx-note">{tnOk ? 'ok' : '—'}</span>
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
