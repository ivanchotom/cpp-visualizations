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

const VEC = ['10', '20', '30']
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
  const vec0 = wrote ? '11' : '10'
  const xVal =
    id === 'copy'
      ? i >= 1
        ? VEC[idx]
        : '—'
      : id === 'ref'
        ? i >= 3
          ? '11'
          : i >= 1
            ? '10'
            : '—'
        : '—'

  const code =
    id === 'copy'
      ? `std::vector<int> v{10, 20, 30};\nfor (auto x : v) { use(x); }`
      : id === 'ref'
        ? `for (auto& x : v) {\n  ++x;\n}`
        : id === 'fall'
          ? `switch (kind) {\n  case Kind::A:\n  case Kind::B:\n    handleAB();\n    break;\n}`
          : `for (const auto& item : items) {\n  if (item.skip) continue;\n  use(item);\n}`

  const caption =
    i === 0
      ? id === 'copy'
        ? 'Play range-for with auto x. Each element is copied into the loop variable. The vector cells stay put.'
        : id === 'ref'
          ? 'Play auto&. x is a name welded to the element. ++x writes through. const auto& if you only read.'
          : id === 'fall'
            ? 'Play fallthrough. The program counter walks down the cases. A missing break is a defect unless you mark it.'
            : 'Play continue. The counter skips the rest of this iteration. The container is not modified.'
      : id === 'copy' && i === 1
        ? 'x holds a copy of 10. Mutating x would not change v[0]. The original cell is dim, not emptied.'
        : id === 'copy' && i === 2
          ? 'A fresh x holds 20. Range-for is sugar over begin/end. Three copies for three elements.'
          : id === 'copy'
            ? 'v is still {10,20,30}. auto x is cheap for int; a tax for string.'
            : id === 'ref' && i === 1
              ? 'x is welded to v[0]. Same bytes, two names. No copy.'
              : id === 'ref' && i === 2
                ? 'Still welded. The next steps write through that name.'
                : id === 'ref'
                  ? '++x stored 11 in the cell. v is {11, 20, 30}.'
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
  const tone = id === 'ref' && wrote ? 'ok' : id === 'copy' && i >= 3 ? 'ok' : 'idle'

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
      playLabel="Play flow"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {(id === 'copy' || id === 'ref') && (
        <div className="fx-compare" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <div className="fx-slot">
            <span className="fx-kicker">v</span>
            <span className="fx-cells">
              {[vec0, '20', '30'].map((v, n) => (
                <span
                  key={n}
                  className={`fx-tok${id === 'ref' && i >= 1 && n === 0 ? ' fx-tok--hot' : ''}${id === 'copy' && i >= 1 && n === idx ? ' fx-slot--dim' : ''}`}
                  style={{ fontSize: 16 }}
                >
                  {v}
                </span>
              ))}
            </span>
            <span className="fx-note">elements stay here</span>
          </div>
          <span className={`fx-op${id === 'ref' && i >= 1 ? ' fx-op--on' : ''}`}>{id === 'ref' && i >= 1 ? '≡' : '→'}</span>
          <div className={`fx-slot${id === 'ref' && i >= 1 ? ' fx-slot--weld' : i >= 1 ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">{id === 'ref' ? 'auto& x' : 'auto x'}</span>
            <span className="fx-value">{xVal}</span>
            <span className="fx-note">{id === 'ref' ? 'welded name' : 'copy'}</span>
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
              className={`fx-node${i === n + 1 ? ' fx-node--on' : ''}${it.skip && i >= 1 && n === 0 ? ' fx-node--skip' : ''}${!it.skip && i > n + 1 ? ' fx-node--done' : ''}`}
            >
              {it.label}
              {it.skip ? ' · continue' : ' · use()'}
            </div>
          ))}
        </div>
      )}
      <div className={`fx-verdict${i >= 3 ? ' fx-verdict--show fx-verdict--ok' : ''}`}>
        {id === 'copy' && i >= 3
          ? 'three copies · v unchanged'
          : id === 'ref' && i >= 3
            ? 'v[0] is 11 · write-through'
            : id === 'fall' && i >= 3
              ? 'A fell into B · then break'
              : id === 'skip' && i >= 3
                ? 'a skipped · b and c used'
                : ''}
      </div>
    </SceneShell>
  )
}
