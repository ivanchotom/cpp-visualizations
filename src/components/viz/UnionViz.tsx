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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const iLive = (id === 'active' || id === 'pun') && stepped
  const punTrap = id === 'pun' && decided
  const bitsOn = id === 'bits' && stepped
  const noAddr = id === 'bits' && decided
  const prefixOk = id === 'cis' && decided
  const trap = punTrap || (id === 'bits' && decided && !recap)
  const ok = (id === 'active' && recap) || (id === 'cis' && recap) || (id === 'bits' && recap)

  const code =
    id === 'active'
      ? recap
        ? `s.f = 2.0f;  // f starts, i ends
// one active member at a time`
        : `union S { int i; float f; };
S s;
s.i = 1;          // i is active`
      : id === 'pun'
        ? recap
          ? `float x;
std::memcpy(&x, &s.i, sizeof x);
// bits, not a type pun through f`
          : `s.i = 1;
float x = s.f;   // UB in C++`
        : id === 'bits'
          ? `struct F {
  unsigned a : 3;
  unsigned b : 5;
};
// no &f.a`
          : recap
            ? `// after u.b = …
int t = u.a.tag;  // allowed prefix
// u.a.rest is not`
            : `union U { A a; B b; };
// A and B share a prefix of
// compatible members`

  const caption =
    i === 0
      ? id === 'active'
        ? 'Play s.i = 1. One storage. One active member at a time. The bytes are shared; the name is not.'
        : id === 'pun'
          ? 'Play s.f. Reading a member that is not active is undefined in C++. Use memcpy for the bits. C++14 has no std::bit_cast.'
          : id === 'bits'
            ? 'Play a : 3. Adjacent fields pack into a word. Layout is implementation-defined. Do not take their address.'
            : 'Play prefix. Two structs in a union may share a prefix of compatible members. That prefix is the portable overlap.'
      : id === 'active' && i === 1
        ? 's.i = 1. Those four bytes now mean int. The float name is inactive — not “the other view”.'
        : id === 'active'
          ? 'Writing s.f would start the float’s lifetime and end i’s. One name at a time.'
          : id === 'pun' && i === 1
            ? 'i is active. The bytes happen to be 1 as an int. That does not make them a float 1.0f.'
            : id === 'pun'
              ? 'Reading s.f is UB. Overlay is not a portable pun. memcpy into a float if you need the bits.'
              : id === 'bits' && i === 1
                ? 'a occupies 3 bits, b occupies 5. They sit in one word. You cannot take &f.a.'
                : id === 'bits'
                  ? 'Packing, endianness, and adjacent-field merging are implementation-defined. Do not serialize this as a wire format without a spec.'
                  : i === 1
                    ? 'A and B both start with the same int tag. That prefix is the common initial sequence.'
                    : 'Reading u.a.tag after storing u.b is allowed for that prefix. The rest of the members are not.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'active' ? 'Play s.i = 1' : id === 'pun' ? 'Play s.f' : id === 'bits' ? 'Play a : 3' : 'Play prefix'

  const verdict =
    id === 'active' && recap
      ? 'one name at a time'
      : id === 'active' && stepped
        ? 'i is active · f is not a view'
        : punTrap
          ? 'read of inactive member · UB'
          : id === 'pun' && stepped
            ? 'i active · bytes are not float'
            : noAddr && recap
              ? 'packed · do not take the address'
              : bitsOn && decided
                ? 'no & on a bit-field'
                : prefixOk && recap
                  ? 'prefix ok · rest is not'
                  : prefixOk
                    ? 'common initial sequence'
                    : id === 'cis' && stepped
                      ? 'shared tag · compatible prefix'
                      : ''

  const bytes = ['0', '0', '0', '1']

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
      {id === 'bits' ? (
        <>
          <span className="fx-kicker">one word</span>
          <div className="fx-bitrow" style={{ marginTop: 10 }}>
            {Array.from({ length: 8 }, (_, n) => (
              <span
                key={n}
                className={`fx-bit${bitsOn && n < 3 ? ' fx-bit--a' : ''}${bitsOn && n >= 3 && n < 8 ? ' fx-bit--b' : ''}`}
              >
                {bitsOn && n < 3 ? 'a' : bitsOn ? 'b' : ''}
              </span>
            ))}
          </div>
          <span className="fx-note" style={{ marginTop: 8 }}>
            {noAddr ? 'no & on a bit-field · layout is impl-defined' : 'a : 3  then  b : 5'}
          </span>
        </>
      ) : id === 'cis' ? (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${prefixOk ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">tag</span>
            <code>A / B</code>
            <span className="fx-note">{prefixOk ? 'ok' : stepped ? 'same' : '—'}</span>
          </div>
          <div className={`fx-rank${prefixOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">rest</span>
            <code>not cis</code>
            <span className="fx-note">{recap ? 'no' : '—'}</span>
          </div>
        </div>
      ) : (
        <>
          <span className="fx-kicker">shared storage</span>
          <div className="fx-buf-row" style={{ justifyContent: 'center', marginTop: 10 }}>
            {bytes.map((ch, n) => (
              <span
                key={n}
                className={`fx-letter${punTrap ? ' fx-letter--dead' : iLive ? ' fx-letter--on' : ' fx-letter--empty'}`}
              >
                {iLive ? ch : '·'}
              </span>
            ))}
          </div>
          <div className="fx-ladder" style={{ marginTop: 12 }}>
            <div className={`fx-rank${iLive ? ' fx-rank--on' : ''}${punTrap ? ' fx-rank--done' : ''}`}>
              <code>i</code>
              <span className="fx-note">int</span>
              <span className="fx-note">{iLive ? 'on' : '—'}</span>
            </div>
            <div className={`fx-rank${punTrap ? ' fx-rank--trap' : ''}`}>
              <code>f</code>
              <span className="fx-note">float</span>
              <span className="fx-note">{punTrap ? 'ub' : 'off'}</span>
            </div>
          </div>
        </>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
