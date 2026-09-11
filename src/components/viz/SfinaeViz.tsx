import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'int' | 'fp' | 'str'

const MODES: { id: Mode; title: string }[] = [
  { id: 'int', title: 'describe(42)' },
  { id: 'fp', title: 'describe(1.5)' },
  { id: 'str', title: 'describe(s)' },
]

export function SfinaeViz() {
  const [id, setId] = useState<Mode>('int')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const trying = i === 1
  const decided = i >= 2
  const intWin = id === 'int' && decided
  const fpWin = id === 'fp' && decided
  const intOut = decided && id !== 'int'
  const fpOut = decided && id !== 'fp'
  const hard = id === 'str' && decided

  const arg = id === 'int' ? '42' : id === 'fp' ? '1.5' : 's'
  const tName = id === 'int' ? 'int' : id === 'fp' ? 'double' : 'string'

  const code =
    i === 0
      ? `template <typename T>
std::enable_if_t<std::is_integral<T>::value, const char*>
describe(T) { return "int"; }

template <typename T>
std::enable_if_t<std::is_floating_point<T>::value, const char*>
describe(T) { return "fp"; }`
      : id === 'int'
        ? decided
          ? `describe(42);  // picks the integral overload`
          : `describe(42);  // T = int`
        : id === 'fp'
          ? decided
            ? `describe(1.5);  // picks the floating overload`
            : `describe(1.5);  // T = double`
          : decided
            ? `std::string s{"hi"};
describe(s);  // error: no matching function`
            : `std::string s{"hi"};
describe(s);  // T = string`

  const caption =
    i === 0
      ? 'Play describe. Substitution happens in the signature. A failure there drops the candidate quietly — that is SFINAE. C++14: enable_if_t and is_integral<T>::value (not _v).'
      : trying
        ? `The compiler substitutes T = ${tName} into both signatures. Failure in the body would be a hard error; failure in enable_if is not.`
        : intWin
          ? i === 2
            ? 'is_integral<int> is true → ::type exists. is_floating_point<int> fails in the signature and that overload vanishes.'
            : 'The integral overload is the winner. Function templates cannot be partially specialized — overload or enable_if. Errors in the body are not SFINAE.'
          : fpWin
            ? i === 2
              ? 'The floating overload survives. The integral one is gone — its body is never instantiated.'
              : 'Only one recipe remains. That is how you pick an overload from a trait in C++14 without if constexpr.'
            : i === 2
              ? 'Both enable_if conditions are false. Both substitutions fail. SFINAE only helps when at least one candidate remains.'
              : 'Hard error at the call site. enable_if is not a constraint (C++20). You still need a viable overload, or a static_assert in a remaining one.'

  const tone = hard ? 'trap' : intWin || fpWin ? 'ok' : 'idle'
  const playLabel =
    id === 'int' ? 'Play describe(42)' : id === 'fp' ? 'Play describe(1.5)' : 'Play describe(s)'

  const intTag = intWin ? 'survives' : trying ? 'substituting' : intOut ? 'SFINAE out' : 'candidate'
  const fpTag = fpWin ? 'survives' : trying ? 'substituting' : fpOut ? 'SFINAE out' : 'candidate'

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
      <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}${hard ? ' fx-slot--trap' : ''}`}>
        <span className="fx-kicker">call</span>
        <span className="fx-value">
          <code>
            describe({arg})
          </code>
        </span>
        <span className="fx-note">T = {i >= 1 ? tName : '?'}</span>
      </div>
      <div
        className={`fx-rank${trying ? ' fx-rank--on' : ''}${intWin ? ' fx-rank--on' : ''}${
          intOut ? ' fx-rank--done' : ''
        }`}
      >
        <code>enable_if_t&lt;is_integral&lt;T&gt;::value&gt;</code>
        <span className="fx-note">{intTag}</span>
        <span className="fx-note">{intWin ? 'best' : intOut ? 'dropped' : 'candidate'}</span>
      </div>
      <div
        className={`fx-rank${trying ? ' fx-rank--on' : ''}${fpWin ? ' fx-rank--on' : ''}${
          fpOut && !hard ? ' fx-rank--done' : ''
        }${hard ? ' fx-rank--trap' : ''}`}
      >
        <code>enable_if_t&lt;is_floating_point&lt;T&gt;::value&gt;</code>
        <span className="fx-note">{fpTag}</span>
        <span className="fx-note">{fpWin ? 'best' : fpOut || hard ? 'dropped' : 'candidate'}</span>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          hard ? 'fx-verdict--trap' : intWin || fpWin ? 'fx-verdict--ok' : ''
        }`}
      >
        {intWin
          ? 'integral survives · floating SFINAE out'
          : fpWin
            ? 'floating survives · integral SFINAE out'
            : hard
              ? 'no candidate · hard error'
              : trying
                ? `substituting T = ${tName}`
                : ''}
      </div>
    </SceneShell>
  )
}
