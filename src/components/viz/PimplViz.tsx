import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'firewall' | 'dtor' | 'moves' | 'abi'

const MODES: { id: Mode; title: string }[] = [
  { id: 'firewall', title: 'firewall' },
  { id: 'dtor', title: 'dtor' },
  { id: 'moves', title: 'moves' },
  { id: 'abi', title: 'ABI' },
]

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
  const dtorTrap = id === 'dtor' && decided
  const dtorFix = id === 'dtor' && recap
  const movesGone = id === 'moves' && decided
  const movesOk = id === 'moves' && recap
  const abiOk = id === 'abi' && decided
  const trap = dtorTrap || movesGone
  const ok = fireOk || dtorFix || movesOk || abiOk

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
          ? 'Play ~Widget in hpp. unique_ptr<Impl> in the header is fine only if ~Widget is defined in the .cpp after Impl is complete. Otherwise unique_ptr’s dtor cannot sizeof(Impl).'
          : id === 'moves'
            ? 'Play user dtor. A user-declared destructor suppresses implicit moves in C++14. Declare the destructor and the moves in the header; default them in the .cpp.'
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

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'firewall'
      ? 'Play firewall'
      : id === 'dtor'
        ? 'Play ~Widget in hpp'
        : id === 'moves'
          ? 'Play user dtor'
          : 'Play ABI'

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
      {id === 'firewall' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>W</code>
            <span className="fx-note">ptr</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>im</code>
            <span className="fx-note">cpp</span>
            <span className="fx-note">{fireOk ? 'ok' : stepped ? 'n' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dtor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${dtorTrap ? ' fx-rank--trap' : ''}`}>
            <code>~</code>
            <span className="fx-note">dt</span>
            <span className="fx-note">{dtorTrap ? 'ill' : stepped ? 'sz' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${dtorTrap ? ' fx-rank--trap' : ''}`}>
            <code>im</code>
            <span className="fx-note">inc</span>
            <span className="fx-note">{dtorTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'moves' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>~</code>
            <span className="fx-note">usr</span>
            <span className="fx-note">{stepped ? 'yes' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${movesGone ? ' fx-rank--trap' : ''}`}>
            <code>mv</code>
            <span className="fx-note">gen</span>
            <span className="fx-note">{movesGone ? 'gone' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'abi' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>W</code>
            <span className="fx-note">sz</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>im</code>
            <span className="fx-note">fld</span>
            <span className="fx-note">{recap ? '2' : decided ? '1' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
