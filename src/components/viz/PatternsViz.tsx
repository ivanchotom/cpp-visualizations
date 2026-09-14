import { useState } from 'react'
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
  const copyTrap = id === 'auto' && decided
  const moveInhibit = id === 'ret' && recap
  const trap = copyTrap || moveInhibit
  const ok =
    (id === 'raii' && recap) || (id === 'own' && recap) || (id === 'ret' && decided && !recap)

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
void maybe(T*);                    // nullable borrow`
        : id === 'auto'
          ? recap
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
        ? 'Play ~File(). Lifetime of a resource equals lifetime of an object. Destructors run on throw. That is how C++14 holds a file, a lock, a socket.'
        : id === 'own'
          ? 'Play take(move). unique_ptr<T> in a signature means transfer. T const& means borrow. T* often means nullable borrow. The type is the contract.'
          : id === 'auto'
            ? 'Play auto x. Deduce from the initializer. auto x = v[i] copies an element. const auto& borrows. Write the type when it documents a contract.'
            : 'Play return s. Return locals by value; let the compiler move or elide. std::move on a returned local can inhibit NRVO.'
      : id === 'raii' && i === 1
        ? 'fopen is inside File. Copies are deleted so two Files cannot fclose the same pointer. Stations light in place.'
        : id === 'raii' && i === 2
          ? '~File runs fclose. Scope exit, return, and throw all go through the destructor. Do not throw from that destructor.'
          : id === 'raii'
            ? 'lock_guard, unique_ptr, fstream, and vector are the same idea. A class that holds a raw resource must be Rule of Five, or it leaks on copy.'
            : id === 'own' && i === 1
              ? 'unique_ptr is the return type of make. The caller receives ownership. peek(const T&) would not steal.'
              : id === 'own' && i === 2
                ? 'std::move is the spelling of “I am done with this unique_ptr.” The source is empty afterwards. That is a steal, not a copy.'
                : id === 'own'
                  ? 'T* in a signature is the fuzzy one: nullable, no ownership, or an array. Prefer a comment or a not_null policy in C++14.'
                  : id === 'auto' && i === 1
                    ? 'v[i] is a string. auto decays like T by value. That is a copy of a potentially fat object. Stations light in place.'
                    : id === 'auto' && i === 2
                      ? 'The copy lands. Often a bug in a loop. const auto& y = v[i] would borrow, not clone. Still write the type when the type is the point.'
                      : id === 'auto'
                        ? 'auto that hides an expensive copy is the usual complaint. auto that hides int is fine. Use auto when the right-hand side already says the type.'
                        : i === 1
                          ? 'local s is a named automatic. Returning it by value is the C++11/14 default: move, or elide the copy entirely (NRVO).'
                          : i === 2
                            ? 'return s. Named Return Value Optimization may construct s directly in the caller. std::move is not required.'
                            : 'std::move(s) on the return. The compiler is no longer allowed to elide. You made it slower. Write return s;'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'raii' ? 'Play ~File()' : id === 'own' ? 'Play take(move)' : id === 'auto' ? 'Play auto x' : 'Play return s'

  const verdict =
    id === 'raii' && recap
      ? '~File · fclose on every path'
      : id === 'raii' && decided
        ? '~File · fclose'
        : id === 'raii' && stepped
          ? 'File owns FILE*'
          : id === 'own' && recap
            ? 'std::move · callee owns'
            : id === 'own' && decided
              ? 'p empty · q owns'
              : id === 'own' && stepped
                ? 'unique_ptr · transfer'
                : copyTrap && recap
                  ? 'copy · often a loop bug'
                  : copyTrap
                    ? 'auto x · by-value copy'
                    : id === 'auto' && stepped
                      ? 'v[i] · string'
                      : moveInhibit
                        ? 'std::move(s) · inhibits NRVO'
                        : id === 'ret' && decided
                          ? 'NRVO or move'
                          : id === 'ret' && stepped
                            ? 'local · return by value'
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
      {id === 'raii' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>f</code>
            <span className="fx-note">T</span>
            <span className="fx-note">{recap ? 'gn' : stepped ? 'own' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>h</code>
            <span className="fx-note">fp</span>
            <span className="fx-note">{recap ? 'ok' : decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'own' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">up</span>
            <span className="fx-note">{decided ? 'gn' : stepped ? 'own' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>q</code>
            <span className="fx-note">got</span>
            <span className="fx-note">{decided ? 'own' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'auto' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${copyTrap ? ' fx-rank--trap' : ''}`}>
            <code>x</code>
            <span className="fx-note">cpy</span>
            <span className="fx-note">{copyTrap ? 'cpy' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>y</code>
            <span className="fx-note">ref</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ret' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--done' : ''}`}>
            <code>s</code>
            <span className="fx-note">ret</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${moveInhibit ? ' fx-rank--trap' : ''}`}>
            <code>mv</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{moveInhibit ? 'no' : '—'}</span>
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
