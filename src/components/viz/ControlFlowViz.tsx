import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'copy' | 'ref' | 'fall' | 'skip'

const MODES: { id: Mode; title: string }[] = [
  { id: 'copy', title: 'auto x' },
  { id: 'ref', title: 'auto& x' },
  { id: 'fall', title: 'fallthrough' },
  { id: 'skip', title: 'continue' },
]

export function ControlFlowViz() {
  const [id, setId] = useState<Mode>('copy')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const wrote = id === 'ref' && recap
  const ok = (id === 'copy' && recap) || wrote || (id === 'fall' && recap) || (id === 'skip' && recap)
  const xCopy = i === 1 ? '1' : i === 2 ? '2' : recap ? '3' : '—'

  const code =
    id === 'copy'
      ? recap
        ? `for (auto x : v) { use(x); }
// v is still {1, 2, 3}`
        : `std::vector<int> v{1, 2, 3};
for (auto x : v) { use(x); }`
      : id === 'ref'
        ? recap
          ? `for (auto& x : v) {
  ++x;
}
// v is {2, 2, 3}`
          : `for (auto& x : v) {
  ++x;
}`
        : id === 'fall'
          ? recap
            ? `// C++14: no [[fallthrough]]
// comment the intent, then break`
            : `switch (kind) {
  case Kind::A:
  case Kind::B:
    handleAB();
    break;
}`
          : recap
            ? `for (const auto& item : items) {
  if (item.skip) continue;
  use(item);
}`
            : `for (const auto& item : items) {
  if (item.skip) continue;
  use(item);
}`

  const caption =
    i === 0
      ? id === 'copy'
        ? 'Play auto x. Range-for with auto x copies each element. The vector cells stay put. C++14: no if-init, no [[fallthrough]].'
        : id === 'ref'
          ? 'Play auto& x. x is a name welded to the element. ++x writes through. const auto& if you only read.'
          : id === 'fall'
            ? 'Play fallthrough. case A has no break, so control falls into B. C++14 has no [[fallthrough]]; comment the intent.'
            : 'Play continue. The counter skips the rest of this iteration. The container is not modified.'
      : id === 'copy' && i === 1
        ? 'x holds a copy of 1. Mutating x would not change v[0]. Stations light in place.'
        : id === 'copy' && i === 2
          ? 'A fresh x holds 2. Range-for is sugar over begin/end. Three copies for three elements.'
          : id === 'copy'
            ? 'v is still {1, 2, 3}. auto x is cheap for int; a tax for string.'
            : id === 'ref' && i === 1
              ? 'x is welded to v[0]. Same bytes, two names. No copy.'
              : id === 'ref' && i === 2
                ? 'Still welded. The next beat writes through that name.'
                : id === 'ref'
                  ? '++x stored 2 in the cell. v is {2, 2, 3}.'
                  : id === 'fall' && i === 1
                    ? 'kind is A. The PC is on case A. There is no break here.'
                    : id === 'fall' && i === 2
                      ? 'Control falls into case B. handleAB runs for A and B. That can be intentional.'
                      : id === 'fall'
                        ? 'break leaves the switch. C++14 has no [[fallthrough]]; comment the intent.'
                        : i === 1
                          ? 'item a has skip. continue jumps to the next iteration. use() is not called.'
                          : i === 2
                            ? 'item b is used. a was skipped, not erased.'
                            : 'item c is used. continue did not erase a — it only skipped the body.'

  const tone = ok ? 'ok' : 'idle'
  const playLabel =
    id === 'copy' ? 'Play auto x' : id === 'ref' ? 'Play auto& x' : id === 'fall' ? 'Play fallthrough' : 'Play continue'

  const verdict =
    id === 'copy' && recap
      ? 'three copies · v unchanged'
      : id === 'copy' && decided
        ? 'x · copy of 2'
        : id === 'copy' && stepped
          ? 'x · copy of 1'
          : wrote
            ? 'v[0] is 2 · write-through'
            : id === 'ref' && decided
              ? 'x · still welded'
              : id === 'ref' && stepped
                ? 'x · alias'
                : id === 'fall' && recap
                  ? 'A fell into B · then break'
                  : id === 'fall' && decided
                    ? 'fall into B'
                    : id === 'fall' && stepped
                      ? 'case A · no break'
                      : id === 'skip' && recap
                        ? 'a skipped · b and c used'
                        : id === 'skip' && decided
                          ? 'b · use()'
                          : id === 'skip' && stepped
                            ? 'a · continue'
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
      {id === 'copy' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">cp</span>
            <span className="fx-note">{stepped ? xCopy : '—'}</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>v</code>
            <span className="fx-note">ar</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ref' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${wrote ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">rf</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${wrote ? ' fx-rank--on fx-rank--done' : decided ? ' fx-rank--on' : ''}`}>
            <code>v0</code>
            <span className="fx-note">wr</span>
            <span className="fx-note">{wrote ? '2' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'fall' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>A</code>
            <span className="fx-note">cs</span>
            <span className="fx-note">{decided ? 'fl' : stepped ? 'on' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>B</code>
            <span className="fx-note">hd</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'skip' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">sk</span>
            <span className="fx-note">{stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>bc</code>
            <span className="fx-note">us</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div className={`fx-verdict${verdict ? ' fx-verdict--show fx-verdict--ok' : ''}`}>{verdict}</div>
    </SceneShell>
  )
}
