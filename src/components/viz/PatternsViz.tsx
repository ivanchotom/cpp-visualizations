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
  const autoCopy = id === 'auto' && decided
  const moveInhibit = id === 'ret' && recap
  const raiiOk = id === 'raii' && decided
  const ownOk = id === 'own' && decided
  const retOk = id === 'ret' && decided && !recap

  const code =
    id === 'raii'
      ? `class File {
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
        ? 'Play RAII. Lifetime of a resource = lifetime of an object. Destructors run on throw. That is not a decoration — it is how C++14 holds a file, a lock, a socket.'
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
                  ? 'T* in a signature is the fuzzy one: nullable, no ownership, or an array. Prefer span-like types later; in C++14 write the comment or a not_null policy.'
                  : id === 'auto' && i === 1
                    ? 'The initializer is a string (or a proxy). auto decays like T by value. That is a copy of a potentially fat object. Cells light in x — they do not hop.'
                    : id === 'auto' && i === 2
                      ? 'The copy lands. Often a bug in a loop. const auto& y = v[i] borrows. Still write vector<string>::value_type when the type is the point.'
                      : id === 'auto'
                        ? 'auto that hides an expensive copy is the usual complaint. auto that hides int is fine. Use auto when the right-hand side already says the type.'
                        : i === 1
                          ? 'local s is a named automatic. Returning it by value is the C++11/14 default: move, or elide the copy entirely (NRVO).'
                          : i === 2
                            ? 'return s. Named Return Value Optimization may construct s directly in the caller. std::move is not required.'
                            : 'std::move(s) on the return. The compiler is no longer allowed to elide. You made it slower. Write return s;'

  const tone = autoCopy || moveInhibit ? 'warn' : raiiOk || ownOk || retOk ? 'ok' : 'idle'
  const playLabel =
    id === 'raii' ? 'Play ~File()' : id === 'own' ? 'Play unique_ptr' : id === 'auto' ? 'Play auto x = v[i]' : 'Play return s'

  const inName = id === 'raii' ? 'scope' : id === 'own' ? 'caller' : id === 'auto' ? 'vector' : 'local s'
  const inVal = id === 'raii' ? 'File f(path)' : id === 'own' ? 'make_unique<T>' : id === 'auto' ? 'v[i]' : 'string s'
  const midName = id === 'raii' ? 'File' : id === 'own' ? 'signature' : id === 'auto' ? 'auto x' : 'return'
  const midVal =
    id === 'raii' && stepped
      ? 'owns FILE*'
      : id === 'own' && stepped
        ? 'transfer'
        : id === 'auto' && stepped
          ? 'deduced T'
          : id === 'ret' && stepped
            ? recap
              ? 'std::move(s)'
              : 'by value'
            : '—'
  const outName = id === 'raii' ? 'fclose' : id === 'own' ? 'callee' : id === 'auto' ? 'x' : 'caller'
  const outVal = raiiOk
    ? 'released'
    : ownOk
      ? 'owns T'
      : autoCopy
        ? 'expensive copy'
        : retOk
          ? 'moved / elided'
          : moveInhibit
            ? 'NRVO inhibited'
            : '—'

  const leftLink = stepped
    ? id === 'raii' && !decided
      ? 'fx-link--weld'
      : ownOk
        ? 'fx-link--on'
        : autoCopy || moveInhibit
          ? 'fx-link--dead'
          : 'fx-link--on'
    : ''
  const rightLink = raiiOk
    ? 'fx-link--weld'
    : ownOk
      ? 'fx-link--on'
      : autoCopy || moveInhibit
        ? 'fx-link--dead'
        : retOk
          ? 'fx-link--weld'
          : ''

  const verdict =
    id === 'raii' && i === 1
      ? 'File owns FILE*'
      : raiiOk
        ? '~File · fclose on every path'
        : id === 'own' && i === 1
          ? 'unique_ptr · transfer'
          : ownOk
            ? 'std::move · callee owns'
            : id === 'auto' && i === 1
              ? 'auto x · by-value copy'
              : autoCopy
                ? 'copy · often a loop bug'
                : id === 'ret' && i === 1
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
    >
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${id === 'raii' && recap ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">in</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">site</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">op</span>
          <div
            className={`fx-slot${
              id === 'raii' && stepped && !recap
                ? ' fx-slot--weld'
                : ownOk
                  ? ' fx-slot--focus'
                  : stepped
                    ? ' fx-slot--focus'
                    : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'raii'
                ? 'dtor on every path'
                : id === 'own'
                  ? 'T const& borrows'
                  : id === 'auto'
                    ? 'not const auto&'
                    : 'NRVO or move'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${autoCopy || moveInhibit ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div
            className={`fx-slot${
              autoCopy || moveInhibit ? ' fx-slot--trap' : raiiOk || ownOk || retOk ? ' fx-slot--ok' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {raiiOk
                ? 'including throw'
                : ownOk
                  ? 'unique_ptr in, unique_ptr out'
                  : autoCopy
                    ? 'hides a copy'
                    : moveInhibit
                      ? 'do not move a returned local'
                      : retOk
                        ? 'let the compiler'
                        : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          autoCopy || moveInhibit ? 'fx-verdict--warn' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
