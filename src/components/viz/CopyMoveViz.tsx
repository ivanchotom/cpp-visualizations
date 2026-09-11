import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type Mode = 'copy' | 'move'

const MODES: { id: Mode; title: string }[] = [
  { id: 'copy', title: 'copy' },
  { id: 'move', title: 'move' },
]

export function CopyMoveViz() {
  const [mode, setMode] = useState<Mode>('copy')
  const { i, playing, play, reset } = useBeats(5)

  function select(next: string) {
    reset()
    setMode(next as Mode)
  }

  const destBorn = i >= 1
  const filled = mode === 'copy' ? (i >= 3 ? 4 : i >= 2 ? 2 : 0) : i >= 2 ? 4 : 0
  const sourceEmpty = mode === 'move' && i >= 3
  const ownerB = mode === 'copy' ? destBorn : i >= 2
  const ownerA = mode === 'copy' || i < 3

  const code =
    mode === 'copy'
      ? `T a{"ABCD"};\nT b = a;              // copy ctor`
      : `T a{"ABCD"};\nT b = std::move(a);   // steal buffer`

  const caption =
    i === 0
      ? mode === 'copy'
        ? 'Copy constructs a second object with its own buffer. The source keeps every element. Play T b = a.'
        : 'Move steals the buffer. The source stays a valid object, but it no longer owns the data. Play T b = std::move(a).'
      : mode === 'copy' && i === 1
        ? 'b is constructed. A new allocation appears — empty cells. a is untouched.'
        : mode === 'copy' && i === 2
          ? 'Elements fill in place on b’s buffer. Nothing flies. a still holds A B C D.'
          : mode === 'copy' && i === 3
            ? 'Clone complete. Two independent buffers. Mutating b later cannot change a.'
            : mode === 'copy'
              ? 'That is copy: new buffer + element-wise clone. C++14 std::vector / std::string do this.'
              : i === 1
                ? 'b is constructed. No second allocation yet — move will take a’s pointer, not clone cells.'
                : i === 2
                  ? 'b now owns the same buffer. The letters light on b in place. a still names them until we empty it.'
                  : i === 3
                    ? 'a’s pointer is nullptr. The cells on a go dim. Same allocation, new owner — not a hop.'
                    : 'Same allocation, new owner. a is empty and valid. Nothing was element-wise copied.'

  const tone = i >= 4 ? (mode === 'copy' ? 'ok' : 'ok') : 'idle'

  return (
    <SceneShell
      modes={MODES}
      mode={mode}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setMode(mode)
      }}
      playLabel={mode === 'copy' ? 'Play  T b = a' : 'Play  T b = std::move(a)'}
      step={i}
      stepCount={5}
      sig={mode === 'copy' ? 'T b = a' : 'T b = std::move(a)'}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-obj-row">
        <OwnerSlot
          name="a"
          role="source"
          ptr={sourceEmpty ? 'nullptr' : 'buf'}
          owns={ownerA && !sourceEmpty}
          dim={sourceEmpty}
        />
        <OwnerSlot
          name="b"
          role="destination"
          ptr={ownerB ? 'buf' : '∅'}
          owns={ownerB}
          dim={!destBorn}
        />
      </div>
      <div className="fx-obj-row">
        <BufferStrip
          label={mode === 'copy' ? 'a.buf  (kept)' : sourceEmpty ? 'a.buf  (moved-from)' : 'a.buf'}
          filled={sourceEmpty ? 0 : 4}
          tone={sourceEmpty ? 'empty' : 'source'}
        />
        <BufferStrip
          label={mode === 'copy' ? 'b.buf  (new allocation)' : 'b.buf  (stolen)'}
          filled={destBorn ? filled : 0}
          tone={mode === 'copy' ? 'copy' : 'move'}
          ghost={!destBorn}
        />
      </div>
      <div
        className={`fx-verdict${i >= 3 ? ' fx-verdict--show' : ''} ${
          i >= 4 ? 'fx-verdict--ok' : mode === 'move' && i >= 2 ? 'fx-verdict--warn' : ''
        }`}
      >
        {mode === 'copy' && i >= 3
          ? 'two buffers · a unchanged'
          : mode === 'move' && i >= 3
            ? 'one buffer · owner is b · a is nullptr'
            : mode === 'copy' && i === 2
              ? 'cloning into a fresh allocation'
              : mode === 'move' && i === 2
                ? 'pointer steal · no element-wise copy'
                : ''}
      </div>
    </SceneShell>
  )
}

function OwnerSlot({
  name,
  role,
  ptr,
  owns,
  dim,
}: {
  name: string
  role: string
  ptr: string
  owns: boolean
  dim: boolean
}) {
  return (
    <div className={`fx-slot${owns ? ' fx-slot--focus' : ''}${dim ? ' fx-slot--dim' : ''}`}>
      <span className="fx-kicker">{role}</span>
      <span className="fx-value">
        <code>T {name}</code>
      </span>
      <span className="fx-note">
        ptr → {ptr}
      </span>
      {owns && <span className="fx-badge fx-badge--owner">owner</span>}
    </div>
  )
}

function BufferStrip({
  label,
  filled,
  tone,
  ghost,
}: {
  label: string
  filled: number
  tone: 'source' | 'copy' | 'move' | 'empty'
  ghost?: boolean
}) {
  return (
    <div className={`fx-pane${ghost ? ' fx-slot--dim' : ''}`}>
      <span className="fx-kicker">{label}</span>
      <div className="fx-buf-row">
        {LETTERS.map((ch, n) => {
          const on = n < filled
          const cls =
            tone === 'empty' || !on
              ? 'fx-letter fx-letter--empty'
              : tone === 'copy'
                ? 'fx-letter fx-letter--on'
                : tone === 'move'
                  ? 'fx-letter fx-letter--move'
                  : 'fx-letter fx-letter--on'
          return (
            <span key={ch} className={cls}>
              {on ? ch : '∅'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
