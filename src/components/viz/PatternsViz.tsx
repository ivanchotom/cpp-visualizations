import { useState } from 'react'
import { cppPatterns } from '../../data/patterns.ts'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'raii' | 'own' | 'auto' | 'ret'

const MODES: { id: Mode; title: string }[] = [
  { id: 'raii', title: 'RAII' },
  { id: 'own', title: 'own' },
  { id: 'auto', title: 'auto' },
  { id: 'ret', title: 'return' },
]

export function PatternsViz() {
  const [id, setId] = useState<Mode>('raii')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const opened = id === 'raii' && stepped && !decided
  const closed = id === 'raii' && decided
  const pOwns = id === 'own' && stepped && !decided
  const qOwns = id === 'own' && decided
  const copied = id === 'auto' && decided
  const retOk = id === 'ret' && decided && !recap
  const moveInhibit = id === 'ret' && recap

  const code =
    id === 'raii'
      ? recap
        ? `~File() { if (handle_) std::fclose(handle_); }
// runs on return and on throw`
        : `class File {
public:
  explicit File(const char* path)
      : handle_(std::fopen(path, "r")) {}
  ~File() { if (handle_) std::fclose(handle_); }
  File(const File&) = delete;
  File& operator=(const File&) = delete;
private:
  std::FILE* handle_;
};`
      : id === 'own'
        ? decided
          ? `auto p = std::make_unique<Widget>();
take(std::move(p));                  // steal
// p is empty; callee owns`
          : `std::unique_ptr<T> make();          // transfer
void peek(const T&);                 // borrow
void maybe(T*);                      // nullable borrow`
        : id === 'auto'
          ? decided
            ? `auto x = v[i];         // string copy — often a bug
const auto& y = v[i];  // still write the type
                       // when it documents a contract`
            : `std::vector<std::string> v;
auto x = v[i];         // copy
const auto& y = v[i];  // borrow`
          : recap
            ? `std::string f() {
  std::string s = "ok";
  return std::move(s); // inhibits NRVO
}`
            : `std::string f() {
  std::string s = "ok";
  return s;            // move or NRVO
}`

  const caption =
    i === 0
      ? id === 'raii'
        ? 'Play RAII. Lifetime of a resource = lifetime of an object. Destructors run on throw. That is how C++14 holds a file, a lock, a socket.'
        : id === 'own'
          ? 'Play own. unique_ptr<T> in a signature means transfer. T const& means borrow. T* often means nullable borrow. The type is the contract.'
          : id === 'auto'
            ? 'Play auto. Deduce from the initializer. auto x = v[i] copies an element. const auto& borrows. Write the type when it documents a contract.'
            : 'Play return. Return locals by value; let the compiler move or elide. std::move on a returned local can inhibit NRVO.'
      : id === 'raii' && i === 1
        ? 'fopen is inside File. The FILE* is not a public handle. Copies are deleted so two Files cannot fclose the same pointer. The weld is ownership.'
        : id === 'raii' && i === 2
          ? '~File runs fclose. Scope exit, return, and throw all go through the destructor. Do not throw from that destructor.'
          : id === 'raii'
            ? 'lock_guard, unique_ptr, fstream, and vector are the same idea. A class that holds a raw resource must be Rule of Five, or it leaks on copy.'
            : id === 'own' && i === 1
              ? 'unique_ptr is the return type of make. The caller receives ownership. peek(const T&) would not steal.'
              : id === 'own' && i === 2
                ? 'std::move is the spelling of “I am done with this unique_ptr.” The source is empty afterwards. The magenta is a steal, not a copy.'
                : id === 'own'
                  ? 'T* in a signature is the fuzzy one: nullable, no ownership, or an array. Prefer a comment or a not_null policy in C++14.'
                  : id === 'auto' && i === 1
                    ? 'v[i] is a string. auto decays like T by value. That is a copy of a potentially fat object. Cells light in x — they do not hop.'
                    : id === 'auto' && i === 2
                      ? 'The copy lands. Often a bug in a loop. const auto& y = v[i] would weld, not clone. Still write the type when the type is the point.'
                      : id === 'auto'
                        ? 'auto that hides an expensive copy is the usual complaint. auto that hides int is fine. Use auto when the right-hand side already says the type.'
                        : i === 1
                          ? 'local s is a named automatic. Returning it by value is the C++11/14 default: move, or elide the copy entirely (NRVO).'
                          : i === 2
                            ? 'return s. Named Return Value Optimization may construct s directly in the caller. std::move is not required.'
                            : 'std::move(s) on the return. The compiler is no longer allowed to elide. You made it slower. Write return s;'

  const tone = copied || moveInhibit ? 'warn' : closed || qOwns || retOk ? 'ok' : 'idle'
  const playLabel =
    id === 'raii' ? 'Play ~File()' : id === 'own' ? 'Play unique_ptr' : id === 'auto' ? 'Play auto x = v[i]' : 'Play return s'

  const verdict =
    opened
      ? 'File owns FILE*'
      : closed
        ? '~File · fclose on every path'
        : pOwns
          ? 'unique_ptr · transfer'
          : qOwns
            ? 'std::move · callee owns'
            : id === 'auto' && stepped && !copied
              ? 'auto x · by-value copy'
              : copied
                ? 'copy · often a loop bug'
                : id === 'ret' && stepped && !decided
                  ? 'local · return by value'
                  : retOk
                    ? 'NRVO or move'
                    : moveInhibit
                      ? 'std::move(s) · inhibits NRVO'
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
      footer={
        <div className="fx-pane fx-footer-gap">
          <span className="fx-kicker">idioms on this sheet</span>
          {cppPatterns.map((p) => (
            <div key={p.title} className="fx-struct-line">
              <code>{p.title}</code>
              <span className="fx-note">{p.tagline}</span>
            </div>
          ))}
        </div>
      }
    >
      {id === 'raii' && (
        <div className="fx-sh">
          <div className={`fx-pane${opened ? ' fx-pane--focus' : ''}${closed ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">File f</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${opened ? ' fx-letter--on' : ' fx-letter--empty'}`}>h</span>
            </div>
            <span className="fx-note">{opened ? 'owns FILE*' : closed ? 'dtor ran' : 'idle'}</span>
          </div>
          <div className={`fx-link${opened ? ' fx-link--weld' : closed ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${closed ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">resource</span>
            <div className={`fx-slot${opened ? ' fx-slot--weld' : closed ? ' fx-slot--dim' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">FILE*</span>
              <span className="fx-value">{opened ? 'open' : closed ? 'closed' : '—'}</span>
              <span className="fx-note">{closed ? 'fclose on every path' : 'tied to File'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'own' && (
        <div className="fx-sh">
          <div className={`fx-pane${pOwns ? ' fx-pane--focus' : ''}${qOwns ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">caller</span>
            <div
              className={`fx-slot${pOwns ? ' fx-slot--weld' : ' fx-slot--dim'}${qOwns ? ' fx-pane--gone' : ''}`}
            >
              <span className="fx-kicker">unique_ptr</span>
              <span className="fx-value">
                <code>p</code>
              </span>
              <span className="fx-note">{pOwns ? 'exclusive' : qOwns ? 'empty after move' : 'idle'}</span>
              {pOwns && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
          </div>
          <div className={`fx-link${pOwns ? ' fx-link--weld' : qOwns ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${qOwns ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">callee</span>
            <div className={`fx-slot${qOwns ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">take</span>
              <span className="fx-value">
                <code>q</code>
              </span>
              <span className="fx-note">{qOwns ? 'stole T' : 'waiting'}</span>
              {qOwns && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
          </div>
        </div>
      )}
      {id === 'auto' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">v[i]</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>h</span>
              <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>i</span>
            </div>
            <span className="fx-note">source still owns</span>
          </div>
          <div className={`fx-link${copied ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${copied ? ' fx-pane--focus' : ''}${copied ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">auto x</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${copied ? ' fx-letter--on' : ' fx-letter--empty'}`}>h</span>
              <span className={`fx-letter${copied ? ' fx-letter--on' : ' fx-letter--empty'}`}>i</span>
            </div>
            <span className="fx-note">{copied ? 'by-value copy' : 'waiting'}</span>
          </div>
        </div>
      )}
      {id === 'ret' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${moveInhibit ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">local s</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${stepped && !moveInhibit ? ' fx-letter--on' : ' fx-letter--empty'}`}>o</span>
              <span className={`fx-letter${stepped && !moveInhibit ? ' fx-letter--on' : ' fx-letter--empty'}`}>k</span>
            </div>
            <span className="fx-note">{moveInhibit ? 'std::move(s)' : 'named automatic'}</span>
          </div>
          <div className={`fx-link${retOk ? ' fx-link--weld' : moveInhibit ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${moveInhibit ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">caller</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>o</span>
              <span className={`fx-letter${decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>k</span>
            </div>
            <span className="fx-note">{moveInhibit ? 'NRVO inhibited' : retOk ? 'moved or elided' : 'waiting'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          copied || moveInhibit ? 'fx-verdict--warn' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
