import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'firewall' | 'dtor' | 'moves' | 'abi'
type SlotKind = 'gen' | 'user' | 'absent' | 'deleted' | 'idle'

const SLOTS = [
  { key: 'dtor', label: '~T()' },
  { key: 'copy', label: 'T(const T&)' },
  { key: 'cassign', label: 'T& operator=' },
  { key: 'move', label: 'T(T&&)' },
  { key: 'massign', label: 'T& operator= &&' },
] as const

const MODES: { id: Mode; title: string }[] = [
  { id: 'firewall', title: 'firewall' },
  { id: 'dtor', title: 'dtor' },
  { id: 'moves', title: 'moves' },
  { id: 'abi', title: 'ABI' },
]

function slotState(mode: Mode, i: number, key: (typeof SLOTS)[number]['key']): SlotKind {
  if (mode === 'firewall' || mode === 'abi') return 'idle'
  if (i === 0) return 'idle'
  if (mode === 'dtor') {
    if (key === 'dtor') return i >= 1 ? 'user' : 'idle'
    return 'idle'
  }
  if (key === 'dtor') return 'user'
  if (key === 'copy' || key === 'cassign') return i >= 3 ? 'deleted' : 'idle'
  if (key === 'move' || key === 'massign') return i >= 3 ? 'user' : i >= 2 ? 'absent' : 'idle'
  return 'idle'
}

function slotLabel(st: SlotKind): string {
  if (st === 'idle') return '—'
  if (st === 'gen') return 'generated'
  if (st === 'user') return 'user'
  if (st === 'deleted') return '= delete'
  return 'absent'
}

export function PimplViz() {
  const [id, setId] = useState<Mode>('firewall')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const fireOk = id === 'firewall' && decided
  const dtorTrap = id === 'dtor' && decided && !recap
  const dtorFix = id === 'dtor' && recap
  const movesGone = id === 'moves' && decided && !recap
  const movesOk = id === 'moves' && recap
  const abiOk = id === 'abi' && decided
  const trap = dtorTrap || movesGone
  const showSlots = id === 'dtor' || id === 'moves'

  const code =
    id === 'firewall'
      ? decided
        ? `// widget.cpp
struct Widget::Impl { int n = 0; };
Widget::Widget() : impl_(std::make_unique<Impl>()) {}
void Widget::draw() const { /* impl_->n */ }
// client TUs do not recompile when n changes`
        : `// widget.hpp
class Widget {
  struct Impl;
  std::unique_ptr<Impl> impl_;
};`
      : id === 'dtor'
        ? recap
          ? `// widget.hpp:  ~Widget();
// widget.cpp:  Widget::~Widget() = default;
// after struct Widget::Impl { … };`
          : decided
            ? `// unique_ptr::~unique_ptr calls delete
// delete needs sizeof(Impl)
// ~Widget() = default; in the header
// instantiates that while Impl is incomplete`
            : `// widget.hpp  — Impl is incomplete here
class Widget {
  ~Widget() = default;     // ill-formed
  std::unique_ptr<Impl> impl_;
};`
        : id === 'moves'
          ? recap
            ? `class Widget {
public:
  Widget();
  ~Widget();
  Widget(Widget&&) noexcept;
  Widget& operator=(Widget&&) noexcept;
  Widget(const Widget&) = delete;
  Widget& operator=(const Widget&) = delete;
};
// define the defaults in the .cpp`
            : `class Widget {
  ~Widget();               // user-declared
  // C++14: implicit moves are suppressed
};`
          : recap
            ? `struct Widget::Impl { int n = 0; std::string s; };
// sizeof(Widget) still one pointer
// clients do not recompile`
            : `struct Widget::Impl { int n = 0; };
// sizeof(Widget) is one pointer`

  const caption =
    i === 0
      ? id === 'firewall'
        ? 'Play firewall. The public class holds unique_ptr<Impl>. Impl is defined only in the .cpp. Clients recompile when the public header changes, not when private members change.'
        : id === 'dtor'
          ? 'Play dtor. unique_ptr<Impl> in the header is fine only if ~Widget is defined in the .cpp after Impl is complete. Otherwise unique_ptr’s dtor cannot sizeof(Impl).'
          : id === 'moves'
            ? 'Play moves. A user-declared destructor suppresses implicit moves in C++14. Declare the destructor and the moves in the header; default them in the .cpp.'
            : 'Play ABI. The public object’s size stays one pointer. You can add Impl fields without changing sizeof(Widget). That is the stable ABI.'
      : id === 'firewall' && i === 1
        ? 'Impl lives in the .cpp. The header only forward-declares it. make_unique is C++14 — that is the allocation you pay, plus a pointer hop on every call.'
        : id === 'firewall' && i === 2
          ? 'The client TU does not see n. Change Impl and only widget.cpp rebuilds. That is the compilation firewall. Hot small value types should stay in the header instead.'
          : id === 'firewall'
            ? 'PIMPL is for big, stable façades (a Widget, a Client, a Parser). Passing one by value in a tight loop will show up in profiles.'
            : id === 'dtor' && i === 1
              ? 'unique_ptr’s destructor will delete the Impl. That requires a complete type so the compiler knows how many bytes to destroy.'
              : id === 'dtor' && i === 2
                ? 'Impl is still incomplete in the header. ~Widget() = default; here instantiates unique_ptr’s destructor too soon. Ill-formed.'
                : id === 'dtor'
                  ? 'Declare ~Widget(); in the header. Define Widget::~Widget() = default; in the .cpp after struct Widget::Impl { … };'
                  : id === 'moves' && i === 1
                    ? '~Widget is user-declared. In C++14 that suppresses the implicit move constructor and move assign.'
                    : id === 'moves' && i === 2
                      ? 'The implicit move is gone. Widget becomes copy-only (or ill-formed if copies are deleted). You meant to steal the unique_ptr.'
                      : id === 'moves'
                        ? 'Declare the moves in the header, default them in the .cpp next to the destructor. Copies are either deleted or written by hand.'
                        : i === 1
                          ? 'Impl has n. The public class still holds one unique_ptr. Padding may sit next to that pointer; the size does not grow with Impl.'
                          : i === 2
                            ? 'sizeof(Widget) stays one pointer. Add strings, containers, more fields — the client’s layout is unchanged. That is why PIMPL is an ABI firewall too.'
                            : 'You still pay an allocation and a hop. Do not PIMPL a type you pass by value in a hot loop.'

  const tone = trap ? 'warn' : fireOk || dtorFix || movesOk || abiOk ? 'ok' : 'idle'
  const playLabel =
    id === 'firewall' ? 'Play firewall' : id === 'dtor' ? 'Play dtor' : id === 'moves' ? 'Play moves' : 'Play ABI'

  const inName = id === 'firewall' ? 'widget.hpp' : id === 'dtor' ? 'header' : id === 'moves' ? 'header' : 'Widget'
  const inVal =
    id === 'firewall'
      ? 'struct Impl; ptr'
      : id === 'dtor'
        ? recap
          ? '~Widget();'
          : '~Widget() = default'
        : id === 'moves'
          ? recap
            ? 'moves declared'
            : '~Widget();'
          : 'unique_ptr<Impl>'
  const midName = id === 'firewall' ? 'widget.cpp' : id === 'dtor' ? 'unique_ptr' : id === 'moves' ? 'C++14' : 'Impl'
  const midVal =
    id === 'firewall' && stepped
      ? 'Impl complete'
      : id === 'dtor' && recap
        ? 'complete in .cpp'
        : id === 'dtor' && stepped
          ? 'needs complete T'
          : id === 'moves' && recap
            ? 'moves declared'
            : id === 'moves' && decided
              ? 'moves suppressed'
              : id === 'moves' && stepped
                ? 'dtor declared'
                : id === 'abi' && recap
                  ? 'n + string'
                  : id === 'abi' && stepped
                    ? '+ extra field'
                    : '—'
  const outName = id === 'firewall' ? 'client TU' : id === 'dtor' ? 'compile' : id === 'moves' ? 'Widget(Widget&&)' : 'sizeof'
  const outVal = fireOk
    ? 'no rebuild'
    : dtorTrap
      ? 'ill-formed'
      : dtorFix
        ? 'ok in .cpp'
        : movesOk
          ? 'defined'
          : movesGone
            ? 'suppressed'
            : abiOk
              ? 'one pointer'
              : '—'

  const leftLink = stepped ? (trap ? 'fx-link--dead' : fireOk || dtorFix || movesOk || abiOk ? 'fx-link--weld' : 'fx-link--on') : ''
  const rightLink = trap ? 'fx-link--dead' : fireOk || dtorFix || movesOk || abiOk ? 'fx-link--weld' : ''

  const verdict =
    id === 'firewall' && i === 1
      ? 'Impl in .cpp · header opaque'
      : fireOk
        ? 'compilation firewall'
        : id === 'dtor' && i === 1
          ? 'unique_ptr dtor needs complete T'
          : dtorTrap
            ? 'default in header · ill-formed'
            : dtorFix
              ? 'declare in hpp · default in cpp'
              : id === 'moves' && i === 1
                ? 'user dtor · C++14'
                : movesGone
                  ? 'implicit moves gone'
                  : movesOk
                    ? 'declare, default in .cpp'
                    : id === 'abi' && i === 1
                      ? 'Impl grows · Widget does not'
                      : abiOk && !recap
                        ? 'sizeof stays one pointer'
                        : abiOk
                          ? 'stable ABI · pay an allocation'
                          : ''

  const implLetters =
    id === 'abi' && recap ? ['n', 's'] : id === 'abi' && stepped ? ['n'] : id === 'firewall' && stepped ? ['n'] : []

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
      {showSlots ? (
        <div className="fx-five">
          {SLOTS.map((s) => {
            const st = slotState(id, i, s.key)
            return (
              <div key={s.key} className={`fx-sm fx-sm--${st}`}>
                <span className="fx-kicker">{s.label}</span>
                <span className="fx-note">{slotLabel(st)}</span>
              </div>
            )
          })}
        </div>
      ) : null}
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">in</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">public</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">impl</span>
          <div
            className={`fx-slot${
              trap ? ' fx-slot--trap' : fireOk || dtorFix || abiOk ? ' fx-slot--weld' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'firewall'
                ? 'clients never see n'
                : id === 'dtor'
                  ? 'dtor runs delete'
                  : id === 'moves'
                    ? 'user dtor kills moves'
                    : 'private layout'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div
            className={`fx-slot${
              trap ? ' fx-slot--trap' : fireOk || dtorFix || movesOk || abiOk ? ' fx-slot--weld' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {fireOk
                ? 'stable header'
                : dtorTrap
                  ? 'Impl incomplete'
                  : dtorFix
                    ? 'define after Impl'
                    : movesOk
                      ? 'declare, define later'
                      : movesGone
                        ? 'implicit move gone'
                        : abiOk
                          ? 'add fields freely'
                          : 'client'}
            </span>
          </div>
        </div>
      </div>
      {id === 'firewall' || id === 'abi' ? (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">Widget</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>p</span>
            </div>
            <span className="fx-note">{abiOk ? 'sizeof unchanged' : 'one unique_ptr'}</span>
          </div>
          <div className={`fx-link${fireOk || abiOk ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">Impl</span>
            <div className="fx-buf-row">
              {implLetters.length ? (
                implLetters.map((ch) => (
                  <span key={ch} className="fx-letter fx-letter--on">
                    {ch}
                  </span>
                ))
              ) : (
                <span className="fx-letter fx-letter--empty">·</span>
              )}
            </div>
            <span className="fx-note">{id === 'abi' && recap ? 'n + string' : 'private'}</span>
          </div>
        </div>
      ) : null}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : fireOk || dtorFix || movesOk || abiOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
