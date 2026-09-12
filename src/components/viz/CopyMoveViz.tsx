import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'copy' | 'move' | 'cass' | 'mass'

const MODES: { id: Mode; title: string }[] = [
  { id: 'copy', title: 'copy' },
  { id: 'move', title: 'move' },
  { id: 'cass', title: 'copy=' },
  { id: 'mass', title: 'move=' },
]

export function CopyMoveViz() {
  const [mode, setMode] = useState<Mode>('copy')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setMode(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const stolen = (mode === 'move' || mode === 'mass') && decided
  const ok = recap

  const code =
    mode === 'copy'
      ? `T a{"ABCD"};
T b = a;              // copy ctor`
      : mode === 'move'
        ? `T a{"ABCD"};
T b = std::move(a);   // steal buffer`
        : mode === 'cass'
          ? `T a{"ABCD"};
T b{"····"};
b = a;                // copy assign`
          : `T a{"ABCD"};
T b{"····"};
b = std::move(a);     // steal, a is nullptr`

  const caption =
    i === 0
      ? mode === 'copy'
        ? 'Play T b = a. Copy constructs a second object with its own buffer. The source keeps every element. Stations light in place — nothing flies.'
        : mode === 'move'
          ? 'Play std::move. Move steals the buffer. The source stays a valid object, but it no longer owns the data.'
          : mode === 'cass'
            ? 'Play b = a. Copy assignment overwrites an existing object. a is unchanged. Two buffers, same letters.'
            : 'Play b = std::move(a). Move assignment steals. b’s old buffer is released. a is nullptr. Same allocation, new owner.'
      : mode === 'copy' && i === 1
        ? 'a owns ABCD. b does not exist yet. Copy will allocate a second buffer, not reseat a pointer.'
        : mode === 'copy' && i === 2
          ? 'b’s new allocation fills. a still holds ABCD. Two objects, two buffers.'
          : mode === 'copy'
            ? 'Clone complete. Mutating b later cannot change a. C++14 std::vector / std::string do this.'
            : mode === 'move' && i === 1
              ? 'a owns the buffer. b is not constructed. Move will take a’s pointer, not clone cells.'
              : mode === 'move' && i === 2
                ? 'b now owns the same buffer. a still names them until we empty it. No element-wise copy.'
                : mode === 'move'
                  ? 'a’s pointer is nullptr. Same allocation, new owner. a is empty and valid. Nothing was element-wise copied.'
                  : mode === 'cass' && i === 1
                    ? 'Both objects exist. b currently holds empty cells. Assignment will overwrite b, not construct it.'
                    : mode === 'cass' && i === 2
                      ? 'Copying into b. a is untouched. operator= is not a constructor — the target already lived.'
                      : mode === 'cass'
                        ? 'b is ABCD. a is still ABCD. Two independent buffers. Self-assignment is the extra trap: if (this == &o) return *this.'
                        : i === 1
                          ? 'b already exists. Move-assign will release b’s old buffer, then steal a’s pointer.'
                          : i === 2
                            ? 'Steal. b owns ABCD. a still names the buffer until we null it. No element-wise copy.'
                            : 'a is nullptr. b owns ABCD. Moves should be noexcept when you can — std::vector relocates with move only if it cannot throw.'

  const tone = ok ? 'ok' : 'idle'
  const playLabel =
    mode === 'copy'
      ? 'Play T b = a'
      : mode === 'move'
        ? 'Play std::move'
        : mode === 'cass'
          ? 'Play b = a'
          : 'Play b = std::move(a)'

  const verdict =
    mode === 'copy' && recap
      ? 'two buffers · a unchanged'
      : mode === 'copy' && decided
        ? 'cloning into a fresh allocation'
        : mode === 'move' && recap
          ? 'one buffer · owner is b · a is nullptr'
          : mode === 'move' && decided
            ? 'pointer steal · no element-wise copy'
            : mode === 'cass' && recap
              ? 'b overwritten · a unchanged'
              : mode === 'cass' && decided
                ? 'assign, not construct'
                : mode === 'mass' && recap
                  ? 'b stole · a is nullptr'
                  : mode === 'mass' && decided
                    ? 'release b, then steal'
                    : ''

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
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === mode)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {mode === 'copy' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">src</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">cpy</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {mode === 'move' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${stolen ? ' fx-rank--trap' : ''}`}>
            <code>a</code>
            <span className="fx-note">src</span>
            <span className="fx-note">{stolen ? 'gone' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{stolen ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {mode === 'cass' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">src</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">asg</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {mode === 'mass' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${stolen ? ' fx-rank--trap' : ''}`}>
            <code>a</code>
            <span className="fx-note">src</span>
            <span className="fx-note">{stolen ? 'gone' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{stolen ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${ok ? 'fx-verdict--ok' : ''}`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
