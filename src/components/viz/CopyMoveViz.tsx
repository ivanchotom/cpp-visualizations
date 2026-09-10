import { useState } from 'react'

const SRC = ['A', 'B', 'C', 'D']

export function CopyMoveViz() {
  const [mode, setMode] = useState<'copy' | 'move' | 'vec-ok' | 'vec-throw'>('move')
  const [done, setDone] = useState(false)

  const src = done && mode === 'move' ? ['·', '·', '·', '·'] : SRC
  const dst = done && (mode === 'copy' || mode === 'move') ? SRC : ['', '', '', '']

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {(
          [
            ['copy', 'copy'],
            ['move', 'move'],
            ['vec-ok', 'vector · noexcept move'],
            ['vec-throw', 'vector · throwing move'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`chip${mode === id ? ' chip--active' : ''}`}
            onClick={() => {
              setMode(id)
              setDone(false)
            }}
          >
            {label}
          </button>
        ))}
        <button className="chip" onClick={() => setDone(true)}>
          {mode === 'copy'
            ? 'T b = a;'
            : mode === 'move'
              ? 'T b = std::move(a);'
              : 'vector reallocates'}
        </button>
        <button className="chip chip--ghost" onClick={() => setDone(false)}>
          reset
        </button>
      </div>
      {mode === 'copy' || mode === 'move' ? (
        <div className="buf-row">
          <Buffer label="a (source)" cells={src} faded={done && mode === 'move'} />
          <span className="pipe-arrow">
            {done ? (mode === 'copy' ? 'duplicate' : 'steal') : '…'}
          </span>
          <Buffer label="b (destination)" cells={dst} />
        </div>
      ) : (
        <div className="buf-row">
          <Buffer
            label="old buffer"
            cells={done ? ['·', '·', '·'] : ['A', 'B', 'C']}
            faded={done}
          />
          <span className="pipe-arrow">{done ? (mode === 'vec-ok' ? 'move each' : 'copy each') : 'grow'}</span>
          <Buffer
            label="new buffer"
            cells={done ? ['A', 'B', 'C', '∅'] : ['', '', '', '']}
          />
        </div>
      )}
      <p className="layout-hint">
        {!done && 'Pick a mode, then run it.'}
        {done && mode === 'copy' && 'Copy allocated a new buffer. a is unchanged.'}
        {done && mode === 'move' && 'Move stole the pointer. a is valid but empty. Mark this noexcept when you can.'}
        {done &&
          mode === 'vec-ok' &&
          'move_if_noexcept chose move. Growth is cheap. A throw here would call terminate — that is the promise.'}
        {done &&
          mode === 'vec-throw' &&
          'move_if_noexcept chose copy so the old buffer remains if a constructor throws. Honesty about throw beats a fake noexcept.'}
      </p>
    </div>
  )
}

function Buffer({
  label,
  cells,
  faded,
}: {
  label: string
  cells: string[]
  faded?: boolean
}) {
  return (
    <div className={`buf${faded ? ' buf--faded' : ''}`}>
      <span className="buf-label">{label}</span>
      <div className="buf-cells">
        {cells.map((c, i) => (
          <span key={i} className={`buf-cell${c && c !== '·' && c !== '∅' ? '' : ' buf-cell--empty'}`}>
            {c || '∅'}
          </span>
        ))}
      </div>
    </div>
  )
}
