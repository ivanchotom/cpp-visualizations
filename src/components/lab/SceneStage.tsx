import type { Cell, Stage } from '../../lab/schema.ts'

export function SceneStage({ stage }: { stage: Stage }) {
  switch (stage.type) {
    case 'cells':
      return (
        <div className="stage stage-cells">
          {stage.rows.map((row) => (
            <div key={row.label} className="stage-row">
              <span className="stage-row-label">{row.label}</span>
              <div className="stage-row-items">
                {row.items.map((c, i) => (
                  <MemCell key={`${row.label}-${i}-${c.label}`} cell={c} />
                ))}
                {row.items.length === 0 && <span className="stage-empty">empty</span>}
              </div>
            </div>
          ))}
        </div>
      )
    case 'graph':
      return (
        <div className="stage stage-graph">
          <div className="stage-graph-nodes">
            {stage.nodes.map((n) => (
              <div
                key={n.id}
                className={`gnode gnode--${n.kind ?? 'heap'}${n.ghost ? ' gnode--ghost' : ''}`}
              >
                <strong>{n.title}</strong>
                {n.sub && <span>{n.sub}</span>}
              </div>
            ))}
          </div>
          {stage.edges.length > 0 && (
            <ul className="stage-edges">
              {stage.edges.map((e, i) => (
                <li key={`${e.from}-${e.to}-${i}`} className={e.dashed ? 'edge--dash' : undefined}>
                  <code>{e.from}</code>
                  <span>{e.dashed ? '╌╌→' : '──→'}</span>
                  <code>{e.to}</code>
                  {e.label && <em>{e.label}</em>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    case 'stack':
      return (
        <div className="stage stage-stack">
          {[...stage.frames].reverse().map((f) => (
            <div
              key={f.name}
              className={`sframe${f.dead ? ' sframe--dead' : ''}${f.tag ? ' sframe--tag' : ''}`}
            >
              <div className="sframe-head">
                <code>{f.name}</code>
                {f.tag && <span className="sframe-tag">{f.tag}</span>}
              </div>
              {f.locals && f.locals.length > 0 && (
                <div className="sframe-locals">{f.locals.join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      )
    case 'bytes':
      return (
        <div className="stage stage-bytes">
          <div className="byte-strip">
            {stage.slots.map((s, i) => (
              <div
                key={`${s.label}-${i}`}
                className={`byte-slot byte-slot--${s.kind}`}
                style={{ flex: s.size }}
              >
                <span>{s.label}</span>
                <small>{s.size}B</small>
              </div>
            ))}
          </div>
          {stage.total && <p className="stage-note">sizeof = {stage.total}</p>}
          {stage.note && <p className="stage-note">{stage.note}</p>}
        </div>
      )
    case 'compare':
      return (
        <div className="stage stage-compare">
          <div className="cmp">
            <h4>{stage.left.title}</h4>
            <ul>
              {stage.left.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div className="cmp">
            <h4>{stage.right.title}</h4>
            <ul>
              {stage.right.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      )
    case 'flow':
      return (
        <div className="stage stage-flow">
          {stage.steps.map((s, i) => (
            <div
              key={s.label}
              className={`flow-step${s.on ? ' flow-step--on' : ''}${s.warn ? ' flow-step--warn' : ''}`}
            >
              <span className="flow-n">{i + 1}</span>
              {s.label}
            </div>
          ))}
        </div>
      )
    case 'ruler':
      return (
        <div className="stage stage-ruler">
          <div className="ruler">
            {stage.blocks.map((b) => (
              <div
                key={b.label}
                className={`ruler-block${b.accent ? ' ruler-block--accent' : ''}`}
                style={{
                  left: `${((b.offset - stage.base) / 48) * 100}%`,
                  width: `${(b.size / 48) * 100}%`,
                }}
              >
                <code>
                  +{b.offset - stage.base}
                </code>
                {b.label}
              </div>
            ))}
          </div>
          <div className="ruler-ptrs">
            {stage.pointers.map((p) => (
              <div key={p.name} className="ruler-ptr">
                <code>{p.name}</code> → {p.at.toString(16)}
              </div>
            ))}
          </div>
        </div>
      )
  }
}

function MemCell({ cell }: { cell: Cell }) {
  return (
    <div
      className={`mem-cell mem-cell--${cell.kind ?? 'stack'}${cell.ghost ? ' mem-cell--ghost' : ''}`}
    >
      <span className="mem-name">{cell.label}</span>
      {cell.value && <span className="mem-val">{cell.value}</span>}
    </div>
  )
}
