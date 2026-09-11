import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'fold' | 'runtime'

const MODES: { id: Mode; title: string }[] = [
  { id: 'fold', title: 'constexpr call' },
  { id: 'runtime', title: 'runtime x' },
]

const DOUBLES = [1, 2, 4, 8] as const

export function ConstexprViz() {
  const [id, setId] = useState<Mode>('fold')
  const { i, playing, play, reset } = useBeats(5)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const r = i === 0 ? null : DOUBLES[Math.min(i - 1, DOUBLES.length - 1)]
  const looping = i >= 1 && i <= 3
  const baked = id === 'fold' && i >= 4
  const ran = id === 'runtime' && i >= 4
  const filled = r === null ? 0 : DOUBLES.filter((n) => n <= r).length

  const code =
    id === 'fold'
      ? i === 0
        ? `constexpr int pow2(int n) {
  int r = 1;
  for (int i = 0; i < n; ++i) r *= 2;
  return r;
}`
        : i < 4
          ? `constexpr int table_size = pow2(3);
// compiler is evaluating the loop
// r = ${r}`
          : `constexpr int table_size = pow2(3);  // 8
int a[table_size];  // bound is a constant`
      : i === 0
        ? `constexpr int pow2(int n) { /* same */ }
int x = /* runtime */;`
        : i < 4
          ? `int k = pow2(x);  // x is not a constant
// the loop actually runs
// r = ${r}`
          : `int k = pow2(x);  // 8, at run time
// not usable as an array bound`

  const caption =
    i === 0
      ? id === 'fold'
        ? 'Play pow2(3) as a constant. C++14 constexpr may loop and mutate locals. The compiler can finish the work.'
        : 'Play pow2(x) with a runtime x. The same function is then just a normal function. constexpr is not consteval (C++20).'
      : id === 'fold' && looping
        ? `Compile-time loop: r is ${r}. Locals may mutate inside constexpr in C++14. No I/O, no heap, no try.`
        : id === 'fold'
          ? '8 is baked. table_size can be an array bound, a case label, a template argument. The loop never runs on the CPU.'
          : looping
            ? `Runtime loop: r is ${r}. The compiler could not fold it because x is not a constant expression.`
            : 'k holds 8 after the call. You cannot write int a[k] unless k itself is a constant. Marking pow2 constexpr does not force compile time.'

  const tone = baked ? 'ok' : ran ? 'warn' : 'idle'
  const linkCls = baked ? 'fx-link--weld' : looping || ran ? 'fx-link--on' : ''
  const playLabel = id === 'fold' ? 'Play pow2(3)' : 'Play pow2(x)'

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
      stepCount={5}
      sig={id === 'fold' ? 'pow2(3) → 8' : 'pow2(x)'}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-sh">
        <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">{id === 'fold' ? 'compiler' : 'CPU'}</span>
          <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{id === 'fold' ? 'pow2(3)' : 'pow2(x)'}</span>
            <span className="fx-value">{r === null ? 'idle' : `r = ${r}`}</span>
            <span className="fx-note">{id === 'fold' ? 'constant expression' : 'x is not const'}</span>
            <div className="fx-buf-row">
              {DOUBLES.map((n, idx) => (
                <span
                  key={n}
                  className={`fx-letter${idx < filled ? (id === 'fold' ? ' fx-letter--on' : ' fx-letter--move') : ' fx-letter--empty'}`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={`fx-link${linkCls ? ` ${linkCls}` : ''}`} />
        <div className={`fx-pane${baked || ran ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">{id === 'fold' ? 'constexpr slot' : 'stack'}</span>
          <div
            className={`fx-slot${
              baked ? ' fx-slot--ok' : ran ? ' fx-slot--focus' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{id === 'fold' ? 'table_size' : 'k'}</span>
            <span className="fx-value">{baked || ran ? '8' : '—'}</span>
            <span className="fx-note">
              {baked ? 'array bound OK' : ran ? 'not a constant' : id === 'fold' ? 'needs a constant' : 'waiting'}
            </span>
            {baked && <span className="fx-badge fx-badge--open">int a[8]</span>}
            {ran && <span className="fx-badge fx-badge--lock">not a bound</span>}
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 4 ? ' fx-verdict--show' : ''} ${
          baked ? 'fx-verdict--ok' : ran ? 'fx-verdict--warn' : ''
        }`}
      >
        {baked ? 'baked · array bound OK' : ran ? 'runtime 8 · not a constant' : looping ? `loop · r = ${r}` : ''}
      </div>
    </SceneShell>
  )
}
