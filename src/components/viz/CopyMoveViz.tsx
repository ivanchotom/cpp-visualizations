import { useState } from 'react'

const SRC = ['A', 'B', 'C', 'D']

export function CopyMoveViz() {
  const [mode, setMode] = useState<'copy' | 'move'>('copy')
  const [done, setDone] = useState(false)

  const src = done && mode === 'move' ? ['·', '·', '·', '·'] : SRC
  const dst = done ? SRC : ['', '', '', '']

  return (
    <div className="viz viz--col">
      <div className="stepper">
        <button
          className={`chip${mode === 'copy' ? ' chip--active' : ''}`}
          onClick={() => {
            setMode('copy')
            setDone(false)
          }}
        >
          copy
        </button>
        <button
          className={`chip${mode === 'move' ? ' chip--active' : ''}`}
          onClick={() => {
            setMode('move')
            setDone(false)
          }}
        >
          move
        </button>
        <button className="chip" onClick={() => setDone(true)}>
          {mode === 'copy' ? 'T b = a;' : 'T b = std::move(a);'}
        </button>
        <button className="chip chip--ghost" onClick={() => setDone(false)}>
          reset
        </button>
      </div>
      <div className="buf-row">
        <Buffer label="a (source)" cells={src} faded={done && mode === 'move'} />
        <span className="pipe-arrow">{done ? (mode === 'copy' ? 'duplicate' : 'steal') : '…'}</span>
        <Buffer label="b (destination)" cells={dst} />
      </div>
      <p className="layout-hint">
        {done
          ? mode === 'copy'
            ? 'Copy allocated a new buffer and duplicated every element. a is unchanged.'
            : 'Move stole the pointer. a is left valid but empty (here: nulled slots). No element-wise copy.'
          : 'Pick copy or move, then run the initialization.'}
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
          <span key={i} className={`buf-cell${c ? '' : ' buf-cell--empty'}`}>
            {c || '∅'}
          </span>
        ))}
      </div>
    </div>
  )
}
