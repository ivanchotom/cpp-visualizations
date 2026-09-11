import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'int' | 'str' | 'full' | 'part'

const MODES: { id: Mode; title: string }[] = [
  { id: 'int', title: 'describe(42)' },
  { id: 'str', title: 'describe(s)' },
  { id: 'full', title: 'Box<bool>' },
  { id: 'part', title: 'Box<int*>' },
]

export function SfinaeViz() {
  const [id, setId] = useState<Mode>('int')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const trying = i === 1
  const sfinae = id === 'int' || id === 'str'
  const intWin = id === 'int' && decided
  const hard = id === 'str' && decided
  const fullWin = id === 'full' && decided
  const partWin = id === 'part' && decided

  const code =
    id === 'int'
      ? decided
        ? `describe(42);  // picks the integral overload`
        : `template <typename T>
std::enable_if_t<std::is_integral<T>::value, const char*>
describe(T) { return "int"; }

template <typename T>
std::enable_if_t<std::is_floating_point<T>::value, const char*>
describe(T) { return "fp"; }`
      : id === 'str'
        ? decided
          ? `std::string s{"hi"};
describe(s);  // error: no matching function`
          : `std::string s{"hi"};
describe(s);  // T = string`
        : id === 'full'
          ? recap
            ? `Box<bool>::type  // char
// the primary is not used`
            : `template <class T>
struct Box { using type = T; };

template <>
struct Box<bool> { using type = char; };`
          : recap
            ? `Box<int*>::type  // int
// function templates cannot be
// partially specialized — overload`
            : `template <class T>
struct Box { using type = T; };

template <class T>
struct Box<T*> { using type = T; };`

  const caption =
    i === 0
      ? id === 'int'
        ? 'Play describe(42). Substitution happens in the signature. A failure there drops the candidate quietly — that is SFINAE. C++14: enable_if_t and is_integral<T>::value (not _v).'
        : id === 'str'
          ? 'Play describe(s). SFINAE only helps when at least one candidate remains. Both enable_if conditions false is a hard error at the call site.'
          : id === 'full'
            ? 'Play Box<bool>. Full specialization replaces the recipe for exact arguments. template<> class Box<bool> { … };'
            : 'Play Box<int*>. Partial specialization is a more specific recipe — class templates only. Function templates cannot be partially specialized.'
      : id === 'int' && trying
        ? 'The compiler substitutes T = int into both signatures. Failure in the body would be a hard error; failure in enable_if is not.'
        : id === 'int' && i === 2
          ? 'is_integral<int> is true → ::type exists. is_floating_point<int> fails in the signature and that overload vanishes.'
          : id === 'int'
            ? 'The integral overload is the winner. Function templates cannot be partially specialized — overload or enable_if. Errors in the body are not SFINAE.'
            : id === 'str' && trying
              ? 'T = string. Both enable_if conditions are false. Both substitutions fail in the signature.'
              : id === 'str' && i === 2
                ? 'No candidate remains. SFINAE is not a constraint (C++20). You still need a viable overload, or a static_assert in a remaining one.'
                : id === 'str'
                  ? 'Hard error at the call site. enable_if is how you pick an overload from a trait in C++14 without if constexpr.'
                  : id === 'full' && trying
                    ? 'T = bool. The primary Box<T> would give type = bool. A full specialization is an exact match for those arguments.'
                    : id === 'full' && i === 2
                      ? 'template<> Box<bool> replaces the primary. type is char, not bool. The primary body is never instantiated for bool.'
                      : id === 'full'
                        ? 'Full specialization is not an overload. It is a different recipe for one argument list. Over-specializing std:: types is undefined except where the standard allows it.'
                        : trying
                          ? 'T = int*. The primary would be Box<int*>. Partial Box<T*> is more specialized — it wins for any pointer.'
                          : i === 2
                            ? 'Partial specialization is only for class templates. type is int (the pointee). The primary is not used.'
                            : 'Need the same idea on a function? Overload, or enable_if, or tag dispatch. There is no template<class T> void f<T*>();'

  const tone = hard ? 'trap' : intWin || fullWin || partWin ? 'ok' : 'idle'
  const playLabel =
    id === 'int'
      ? 'Play describe(42)'
      : id === 'str'
        ? 'Play describe(s)'
        : id === 'full'
          ? 'Play Box<bool>'
          : 'Play Box<int*>'

  const callText = id === 'int' ? 'describe(42)' : id === 'str' ? 'describe(s)' : id === 'full' ? 'Box<bool>' : 'Box<int*>'
  const tName = id === 'int' ? 'int' : id === 'str' ? 'string' : id === 'full' ? 'bool' : 'int*'

  const leftCode = sfinae ? 'enable_if_t<is_integral<T>::value>' : 'Box<T>  primary'
  const rightCode = sfinae
    ? 'enable_if_t<is_floating_point<T>::value>'
    : id === 'full'
      ? 'Box<bool>  full spec'
      : 'Box<T*>  partial'

  const leftTag = sfinae
    ? intWin
      ? 'survives'
      : trying
        ? 'substituting'
        : hard
          ? 'SFINAE out'
          : 'candidate'
    : fullWin || partWin
      ? 'not used'
      : trying
        ? 'primary'
        : 'recipe'

  const rightTag = sfinae
    ? hard
      ? 'SFINAE out'
      : trying
        ? 'substituting'
        : intWin
          ? 'SFINAE out'
          : 'candidate'
    : fullWin || partWin
      ? 'selected'
      : trying
        ? 'more specific'
        : 'recipe'

  const leftState = intWin ? 'best' : hard ? 'dropped' : trying ? 'candidate' : 'candidate'
  const rightState = hard ? 'dropped' : intWin ? 'dropped' : fullWin || partWin ? 'best' : trying ? 'candidate' : 'candidate'

  const verdict =
    intWin
      ? recap
        ? 'integral survives · floating SFINAE out'
        : 'is_integral · ::type exists'
      : hard
        ? 'no candidate · hard error'
        : fullWin && recap
          ? 'full spec · type is char'
          : fullWin
            ? 'Box<bool> replaces Box<T>'
            : partWin && recap
              ? 'partial · functions cannot'
              : partWin
                ? 'Box<T*> more specialized'
                : trying
                  ? `substituting T = ${tName}`
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
      <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}${hard ? ' fx-slot--trap' : ''}`}>
        <span className="fx-kicker">call</span>
        <span className="fx-value">
          <code>{callText}</code>
        </span>
        <span className="fx-note">T = {stepped ? tName : '?'}</span>
      </div>
      <div
        className={`fx-rank${trying || intWin ? ' fx-rank--on' : ''}${
          hard || fullWin || partWin ? ' fx-rank--done' : ''
        }${hard ? ' fx-rank--trap' : ''}`}
      >
        <code>{leftCode}</code>
        <span className="fx-note">{leftTag}</span>
        <span className="fx-note">{leftState}</span>
      </div>
      <div
        className={`fx-rank${trying || fullWin || partWin ? ' fx-rank--on' : ''}${
          hard ? ' fx-rank--trap' : intWin ? ' fx-rank--done' : ''
        }`}
      >
        <code>{rightCode}</code>
        <span className="fx-note">{rightTag}</span>
        <span className="fx-note">{rightState}</span>
      </div>
      {(fullWin || partWin) && (
        <div className={`fx-slot${recap ? ' fx-slot--ok' : ' fx-slot--focus'}`}>
          <span className="fx-kicker">type</span>
          <span className="fx-value">{id === 'full' ? 'char' : 'int'}</span>
          <span className="fx-note">{id === 'full' ? 'not bool' : 'pointee, not int*'}</span>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          hard ? 'fx-verdict--trap' : intWin || fullWin || partWin ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
