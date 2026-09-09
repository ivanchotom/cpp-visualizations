import { useMemo, useState } from 'react'
import {
  computeLayout,
  makeMember,
  memberTypes,
  type MemberType,
  type StructMember,
} from '../data/layout.ts'

const BYTE_PX = 34

const initialMembers: StructMember[] = [
  makeMember(memberTypes[0], 'flag'), // char
  makeMember(memberTypes[3], 'id'), // int
  makeMember(memberTypes[5], 'value'), // double
  makeMember(memberTypes[1], 'ready'), // bool
]

export function MemoryLayoutView() {
  const [members, setMembers] = useState<StructMember[]>(initialMembers)

  const layout = useMemo(() => computeLayout(members), [members])
  const naiveSize = useMemo(
    () => members.reduce((sum, m) => sum + m.type.size, 0),
    [members],
  )

  function addMember(type: MemberType) {
    const count = members.filter((m) => m.type.name === type.name).length
    const base = type.name.replace(/[^a-z0-9]/gi, '') || 'field'
    setMembers((prev) => [...prev, makeMember(type, `${base}${count > 0 ? count : ''}`)])
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function reset() {
    setMembers(initialMembers.map((m) => ({ ...m })))
  }

  return (
    <div className="viz-root">
      <div className="palette">
        <span className="palette-label">Add member:</span>
        {memberTypes.map((t) => (
          <button key={t.name} className="chip" onClick={() => addMember(t)}>
            + <code>{t.name}</code>
          </button>
        ))}
        <button className="chip chip--ghost" onClick={reset}>
          reset
        </button>
      </div>

      <div className="layout-grid">
        <div className="struct-source">
          <div className="struct-source-head">struct Example {'{'}</div>
          {members.length === 0 && (
            <div className="struct-empty">add members above…</div>
          )}
          {members.map((m) => (
            <div key={m.id} className="struct-line">
              <code>
                <span className="kw">{m.type.name}</span> {m.fieldName};
              </code>
              <button
                className="struct-remove"
                onClick={() => removeMember(m.id)}
                aria-label={`remove ${m.fieldName}`}
              >
                ×
              </button>
            </div>
          ))}
          <div className="struct-source-head">{'}'};</div>
        </div>

        <div className="layout-panel">
          <div className="layout-stats">
            <div className="stat">
              <span className="stat-value">{layout.totalSize}</span>
              <span className="stat-label">sizeof (bytes)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{layout.alignment}</span>
              <span className="stat-label">alignof</span>
            </div>
            <div className="stat">
              <span className={`stat-value${layout.paddingBytes > 0 ? ' stat-value--warn' : ''}`}>
                {layout.paddingBytes}
              </span>
              <span className="stat-label">padding</span>
            </div>
            <div className="stat">
              <span className="stat-value">{naiveSize}</span>
              <span className="stat-label">packed size</span>
            </div>
          </div>

          <div className="byte-map">
            {layout.slots.map((slot, i) => (
              <div
                key={i}
                className={`slot slot--${slot.kind}`}
                style={{ width: slot.size * BYTE_PX }}
                title={
                  slot.kind === 'padding'
                    ? `${slot.size} padding byte(s) at offset ${slot.offset}`
                    : `${slot.typeName} ${slot.label} @ offset ${slot.offset} (${slot.size} bytes)`
                }
              >
                <span className="slot-offset">{slot.offset}</span>
                <span className="slot-label">
                  {slot.kind === 'padding' ? 'padding' : slot.label}
                </span>
              </div>
            ))}
          </div>

          <p className="layout-hint">
            {layout.paddingBytes > 0 ? (
              <>
                This struct wastes <strong>{layout.paddingBytes} byte(s)</strong> on
                padding. Try ordering members from largest to smallest to shrink it.
              </>
            ) : (
              <>No padding — members are perfectly packed. </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
