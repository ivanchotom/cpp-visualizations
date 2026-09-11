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

const VEC = ['1', '2', '3']
const ITEMS = [
  { label: 'a', skip: true },
  { label: 'b', skip: false },
  { label: 'c', skip: false },
]

export function ControlFlowViz() {
  const [id, setId] = useState<Mode>('copy')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const idx = Math.max(0, i - 1)
  const wrote = id === 'ref' && i >= 3
  const letters = wrote ? ['2', '2', '3'] : VEC
  const xVal = id === 'copy' ? (i >= 1 ? VEC[idx] : '—') : id === 'ref' ? (i >= 1 ? letters[0] : '—') : '—'
  const copyOn = id === 'copy' && i >= 1
  const weldOn = id === 'ref' && i >= 1

  const code =
    id === 'copy'
      ? `std::vector<int> v{1, 2, 3};
for (auto x : v) { use(x); }`
      : id === 'ref'
        ? `for (auto& x : v) {
  ++x;
}`
        : id === 'fall'
          ? `switch (kind) {
  case Kind::A:
  case Kind::B:
    handleAB();
    break;
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
          ? 'Play auto&. x is a name welded to the element. ++x writes through. const auto& if you only read.'
          : id === 'fall'
            ? 'Play fallthrough. The program counter walks down the cases. A missing break is a defect unless you mark it.'
            : 'Play continue. The counter skips the rest of this iteration. The container is not modified.'
      : id === 'copy' && i === 1
        ? 'x holds a copy of 1. Mutating x would not change v[0]. The original cell stays lit, not emptied.'
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
                            ? 'item b is used. The PC sits on use().'
                            : 'item c is used. continue did not erase a — it only skipped the body.'

  const pcTop = id === 'fall' || id === 'skip' ? 12 + Math.min(i, 3) * 48 : 12
  const tone = wrote || (id === 'copy' && i >= 3) ? 'ok' : 'idle'
  const playLabel =
    id === 'copy' ? 'Play auto x' : id === 'ref' ? 'Play auto& x' : id === 'fall' ? 'Play fallthrough' : 'Play continue'

  const verdict =
    id === 'copy' && i >= 3
      ? 'three copies · v unchanged'
      : id === 'ref' && wrote
        ? 'v[0] is 2 · write-through'
        : id === 'fall' && i >= 3
          ? 'A fell into B · then break'
          : id === 'skip' && i >= 3
            ? 'a skipped · b and c used'
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
      {(id === 'copy' || id === 'ref') && (
        <div className="fx-sh">
          <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">v</span>
            <div className="fx-buf-row">
              {letters.map((ch, n) => {
                const isCopy = id === 'copy' && i >= 1 && n === idx
                const isWeld = id === 'ref' && i >= 1 && n === 0
                return (
                  <span
                    key={n}
                    className={`fx-letter${
                      isWeld && wrote
                        ? ' fx-letter--write'
                        : isWeld
                          ? ' fx-letter--it'
                          : isCopy
                            ? ' fx-letter--read'
                            : i >= 1
                              ? ' fx-letter--on'
                              : ' fx-letter--empty'
                    }`}
                  >
                    {ch}
                  </span>
                )
              })}
            </div>
            <span className="fx-note">{wrote ? 'v[0] written' : 'elements stay'}</span>
          </div>
          <div className={`fx-link${weldOn ? ' fx-link--weld' : copyOn ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{id === 'ref' ? 'auto& x' : 'auto x'}</span>
            <div className={`fx-slot${weldOn ? ' fx-slot--weld' : copyOn ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">{id === 'ref' ? 'alias' : 'copy'}</span>
              <span className="fx-value">{xVal}</span>
              <span className="fx-note">{id === 'ref' ? (wrote ? 'same object' : 'welded name') : 'distinct object'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'fall' && (
        <div className="fx-flow">
          <div className="fx-rail" />
          <div className="fx-pc" style={{ top: pcTop }} />
          <div className={`fx-node${i >= 1 ? ' fx-node--on' : ''}${i >= 2 ? ' fx-node--done' : ''}`}>case A</div>
          <div className={`fx-node${i >= 2 ? ' fx-node--on' : ''}`}>case B · handleAB()</div>
          <div className={`fx-node${i >= 3 ? ' fx-node--on' : ''}`}>break</div>
        </div>
      )}
      {id === 'skip' && (
        <div className="fx-flow">
          <div className="fx-rail" />
          <div className="fx-pc" style={{ top: pcTop }} />
          {ITEMS.map((it, n) => (
            <div
              key={it.label}
              className={`fx-node${i === n + 1 ? ' fx-node--on' : ''}${it.skip && i >= 1 && n === 0 ? ' fx-node--skip' : ''}${
                !it.skip && i > n + 1 ? ' fx-node--done' : ''
              }`}
            >
              {it.label}
              {it.skip ? ' · continue' : ' · use()'}
            </div>
          ))}
        </div>
      )}
      <div className={`fx-verdict${verdict ? ' fx-verdict--show fx-verdict--ok' : ''}`}>{verdict}</div>
    </SceneShell>
  )
}
