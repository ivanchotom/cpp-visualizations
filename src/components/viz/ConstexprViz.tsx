import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'fold' | 'runtime' | 'cvar' | 'heap'

const MODES: { id: Mode; title: string }[] = [
  { id: 'fold', title: 'pow2(3)' },
  { id: 'runtime', title: 'pow2(x)' },
  { id: 'cvar', title: 'constexpr n' },
  { id: 'heap', title: 'new int' },
]

const DOUBLES = [1, 2, 4, 8] as const

export function ConstexprViz() {
  const [id, setId] = useState<Mode>('fold')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const looping = (id === 'fold' || id === 'runtime') && stepped && !recap
  const r = !looping && !((id === 'fold' || id === 'runtime') && recap) ? null : i === 1 ? 2 : i === 2 ? 4 : 8
  const filled = i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 3 : 4
  const baked = id === 'fold' && recap
  const ran = id === 'runtime' && recap
  const nConst = id === 'cvar' && stepped
  const assignTrap = id === 'cvar' && decided
  const heapTry = id === 'heap' && stepped
  const heapTrap = id === 'heap' && decided

  const code =
    id === 'fold'
      ? recap
        ? `constexpr int table_size = pow2(3);  // 8
int a[table_size];  // bound is a constant`
        : `constexpr int pow2(int n) {
  int r = 1;
  for (int i = 0; i < n; ++i) r *= 2;
  return r;
}
constexpr int table_size = pow2(3);`
      : id === 'runtime'
        ? recap
          ? `int k = pow2(x);  // 8, at run time
// int a[k];      // not a constant bound`
          : `constexpr int pow2(int n) { /* same */ }
int x = /* runtime */;
int k = pow2(x);`
        : id === 'cvar'
          ? recap
            ? `constexpr int n = 3;  // implicitly const
// n = 4;              // error
int k = 3;
k = 4;                  // ok`
            : `constexpr int n = 3;
n = 4;  // error — n is const`
          : recap
            ? `// C++14 constexpr: no new, no try.
// C++20 adds limited constexpr new.`
            : `constexpr int f() {
  int* p = new int(1);  // not a constant
  return *p;
}`

  const caption =
    i === 0
      ? id === 'fold'
        ? 'Play pow2(3). C++14 constexpr may loop and mutate locals. If every input is a constant, the compiler can finish the work.'
        : id === 'runtime'
          ? 'Play pow2(x) with a runtime x. The same function is then just a normal function. constexpr is not consteval (C++20).'
          : id === 'cvar'
            ? 'Play n = 4. A constexpr variable must be initialized by a constant expression. It is implicitly const. That is not the same as a constexpr function.'
            : 'Play new int. C++14 constexpr cannot allocate, throw, or leave a local uninitialized. Marking a function constexpr does not lift those rules.'
      : id === 'fold' && i === 1
        ? 'Compile-time loop: r is 2. Locals may mutate inside constexpr in C++14. No I/O, no heap, no try. Cells light in place.'
        : id === 'fold' && i === 2
          ? 'r is 4, then 8. The compiler is evaluating the loop. The CPU never sees these iterations when the result is required to be a constant.'
          : id === 'fold'
            ? '8 is baked. table_size can be an array bound, a case label, a template argument. The loop never runs on the CPU.'
            : id === 'runtime' && i === 1
              ? 'Runtime loop: r is 2. x is not a constant expression, so the compiler cannot fold the call.'
              : id === 'runtime' && i === 2
                ? 'The loop actually runs. r is 4, then 8. Marking pow2 constexpr did not force compile time.'
                : id === 'runtime'
                  ? 'k holds 8 after the call. You cannot write int a[k] unless k itself is a constant. A constexpr function with a runtime argument is a normal function.'
                  : id === 'cvar' && i === 1
                    ? 'n is 3. A constexpr variable is implicitly const. The cyan slot is the object; it will not accept a later store.'
                    : id === 'cvar' && i === 2
                      ? 'n = 4 is ill-formed. The magenta slot is a plain int k — same initializer, but k may be assigned.'
                      : id === 'cvar'
                        ? 'Want a mutable object? Write int. Want a compile-time constant? Write constexpr. const int n = 3 can still be an integral constant if the initializer is one.'
                        : i === 1
                          ? 'The compiler tries to evaluate f as a constant. new int appears as a heap request. That is not allowed in C++14 constexpr.'
                          : i === 2
                            ? 'Substitution into a constant-expression context fails. This is not SFINAE — it is simply not a constant expression.'
                            : 'Keep constexpr functions to loops, locals, and arithmetic. Heap, I/O, and try wait for later standards in limited forms.'

  const tone = assignTrap || heapTrap ? 'trap' : ran ? 'warn' : baked || (id === 'cvar' && recap) ? 'ok' : 'idle'
  const playLabel =
    id === 'fold' ? 'Play pow2(3)' : id === 'runtime' ? 'Play pow2(x)' : id === 'cvar' ? 'Play n = 4' : 'Play new int'

  const leftLink =
    baked || nConst
      ? 'fx-link--weld'
      : looping || ran || heapTry
        ? heapTrap
          ? 'fx-link--dead'
          : 'fx-link--on'
        : ''

  const verdict =
    baked
      ? 'baked · array bound OK'
      : ran
        ? 'runtime 8 · not a constant'
        : looping
          ? `loop · r = ${r}`
          : assignTrap && recap
            ? 'constexpr n is const'
            : assignTrap
              ? 'n = 4 · ill-formed'
              : nConst
                ? 'n = 3 · implicitly const'
                : heapTrap && recap
                  ? 'C++14 · no constexpr new'
                  : heapTrap
                    ? 'new int · not a constant'
                    : heapTry
                      ? 'compiler · evaluating f()'
                      : ''

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
      {(id === 'fold' || id === 'runtime') && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{id === 'fold' ? 'compiler' : 'CPU'}</span>
            <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
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
          <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
          <div className={`fx-pane${baked || ran ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{id === 'fold' ? 'constexpr slot' : 'stack'}</span>
            <div className={`fx-slot${baked ? ' fx-slot--ok' : ran ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
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
      )}
      {id === 'cvar' && (
        <div className="fx-sh">
          <div className={`fx-pane${nConst ? ' fx-pane--focus' : ''}${assignTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">constexpr</span>
            <div className={`fx-slot${assignTrap ? ' fx-slot--trap' : nConst ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">int n</span>
              <span className="fx-value">{nConst ? '3' : '—'}</span>
              <span className="fx-note">{assignTrap ? 'n = 4 rejected' : nConst ? 'implicitly const' : 'must be constant-init'}</span>
              {nConst && <span className="fx-badge fx-badge--lock">const</span>}
            </div>
          </div>
          <div className={`fx-link${assignTrap ? ' fx-link--dead' : nConst ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">plain int</span>
            <div className={`fx-slot${recap ? ' fx-slot--ok' : decided ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">int k</span>
              <span className="fx-value">{recap ? '4' : decided ? '3' : '—'}</span>
              <span className="fx-note">{recap ? 'k = 4 ok' : decided ? 'mutable' : 'not constexpr'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'heap' && (
        <div className="fx-sh">
          <div className={`fx-pane${heapTry ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">compiler</span>
            <div className={`fx-slot${heapTry ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">constexpr f</span>
              <span className="fx-value">{heapTrap ? 'not a constant' : heapTry ? 'evaluating' : 'idle'}</span>
              <span className="fx-note">needs a constant expression</span>
            </div>
          </div>
          <div className={`fx-link${heapTrap ? ' fx-link--dead' : heapTry ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${heapTry ? ' fx-pane--focus' : ''}${heapTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">heap</span>
            <div className={`fx-slot${heapTrap ? ' fx-slot--trap' : heapTry ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">new int</span>
              <span className="fx-value">{heapTrap ? 'illegal' : heapTry ? 'requested' : '—'}</span>
              <span className="fx-note">{heapTrap ? 'C++14: no constexpr new' : 'not in C++14 constexpr'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          assignTrap || heapTrap ? 'fx-verdict--trap' : ran ? 'fx-verdict--warn' : baked || (id === 'cvar' && recap) ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
