import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'active' | 'pun' | 'bits' | 'cis'

const MODES: { id: Mode; title: string }[] = [
  { id: 'active', title: 'active' },
  { id: 'pun', title: 'pun' },
  { id: 'bits', title: 'bits' },
  { id: 'cis', title: 'prefix' },
]

export function UnionViz() {
  const [id, setId] = useState<Mode>('active')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const activeI = id === 'active' || id === 'pun' || id === 'cis'
  const trap = (id === 'pun' && i >= 2) || (id === 'bits' && i >= 2 && i < 3)
  const won = id === 'cis' && i >= 2

  const code =
    id === 'active'
      ? `union S { int i; float f; };\nS s;\ns.i = 1;          // i is active`
      : id === 'pun'
        ? `s.i = 1;\nfloat x = s.f;   // UB in C++`
        : id === 'bits'
          ? `struct F {\n  unsigned a : 3;\n  unsigned b : 5;\n};`
          : `union U { A a; B b; };  // A and B share a prefix\n// read the common initial sequence`

  const caption =
    i === 0
      ? id === 'active'
        ? 'Play the union. One storage. One active member at a time. The bytes are shared; the name is not.'
        : id === 'pun'
          ? 'Play type punning. Reading a member that is not active is undefined in C++. Use memcpy for bits.'
          : id === 'bits'
            ? 'Play bit-fields. Adjacent fields pack into a word. Layout is implementation-defined. Do not take their address.'
            : 'Play common initial sequence. Two structs in a union may share a prefix of compatible members. That prefix is the portable overlap.'
      : id === 'active' && i === 1
        ? 's.i = 1. Those four bytes now mean int. The float window is inactive — not “the other view”.'
        : id === 'active'
          ? 'Writing s.f would start the float’s lifetime and end i’s. One name at a time.'
          : id === 'pun' && i === 1
            ? 'i is active. The bytes happen to be 1 as an int. That does not make them a float 1.0f.'
            : id === 'pun'
              ? 'Reading s.f is UB. Overlay is not a portable pun. memcpy into a float if you need the bits.'
              : id === 'bits' && i === 1
                ? 'a occupies 3 bits, b occupies 5. They sit in one word. You cannot take &f.a.'
                : id === 'bits'
                  ? 'Packing, endianness, and adjacent-field merging are implementation-defined. Don’t serialize this as a wire format without a spec.'
                  : i === 1
                    ? 'A and B both start with the same int tag. That prefix is the common initial sequence.'
                    : 'Reading u.a.tag after storing u.b is allowed for that prefix. The rest of the members are not.'

  const bytes = ['0', '0', '0', '1']
  const tone = trap ? 'trap' : won ? 'ok' : 'idle'

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
      playLabel="Play union"
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {id === 'bits' ? (
        <div>
          <span className="fx-kicker">one word</span>
          <div className="fx-bitrow" style={{ marginTop: 10 }}>
            {Array.from({ length: 8 }, (_, n) => (
              <span key={n} className={`fx-bit${i >= 1 && n < 3 ? ' fx-bit--a' : ''}${i >= 1 && n >= 3 && n < 8 ? ' fx-bit--b' : ''}`}>
                {i >= 1 && n < 3 ? 'a' : i >= 1 && n < 8 ? 'b' : ''}
              </span>
            ))}
          </div>
          <span className="fx-note" style={{ marginTop: 8 }}>
            {i >= 2 ? 'no & on a bit-field · layout is impl-defined' : 'a : 3  then  b : 5'}
          </span>
        </div>
      ) : (
        <div>
          <span className="fx-kicker">shared storage (4 bytes)</span>
          <div className="fx-bytes" style={{ marginTop: 10 }}>
            {bytes.map((b, n) => (
              <span key={n} className={`fx-byte${i >= 1 && activeI ? ' fx-byte--on' : ''}${id === 'pun' && i >= 2 ? ' fx-byte--other' : ''}`}>
                {i >= 1 ? b : '·'}
              </span>
            ))}
          </div>
          <div className="fx-compare" style={{ marginTop: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div className={`fx-slot${i >= 1 && id !== 'pun' ? ' fx-slot--ok' : ''}${id === 'pun' && i >= 1 && i < 2 ? ' fx-slot--ok' : ''}`}>
              <span className="fx-kicker">int i</span>
              <span className="fx-value">{i >= 1 ? '1' : '—'}</span>
            </div>
            <div className={`fx-slot${id === 'pun' && i >= 2 ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">float f</span>
              <span className="fx-value">{id === 'pun' && i >= 2 ? 'UB' : 'inactive'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : won ? 'fx-verdict--ok' : 'fx-verdict--ok'
        }`}
      >
        {id === 'active' && i >= 2
          ? 'i is active · f is not a second view'
          : id === 'pun' && i >= 2
            ? 'read of inactive member · UB'
            : id === 'bits' && i >= 2
              ? 'packed · do not take the address'
              : id === 'cis' && i >= 2
                ? 'common initial sequence is the allowed overlap'
                : ''}
      </div>
    </SceneShell>
  )
}
