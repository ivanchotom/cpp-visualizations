import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'observer' | 'find' | 'byval' | 'lie'

const MODES: { id: Mode; title: string }[] = [
  { id: 'observer', title: 'observer' },
  { id: 'find', title: 'find' },
  { id: 'byval', title: 'by value' },
  { id: 'lie', title: 'lie' },
]

export function ConstCorrectViz() {
  const [id, setId] = useState<Mode>('observer')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const readOk = id === 'observer' && i === 1
  const writeTrap = id === 'observer' && decided
  const constFind = id === 'find' && stepped
  const mutFind = id === 'find' && decided
  const moveBlocked = id === 'byval' && decided && !recap
  const returnT = id === 'byval' && recap
  const lieTrap = id === 'lie' && decided
  const trap = writeTrap || moveBlocked || lieTrap

  const code =
    id === 'observer'
      ? decided
        ? `bool Bag::empty() const {
  items_.clear();   // ill-formed: this is const
  return items_.empty();
}`
        : `class Bag {
public:
  bool empty() const { return items_.empty(); }
private:
  std::vector<Item> items_;
};`
      : id === 'find'
        ? `class Bag {
public:
  const Item* find(Id id) const;
  Item* find(Id id);
};
void show(const Bag& b) { b.find(id); }  // const*
void edit(Bag& b) { b.find(id)->n = 1; }`
        : id === 'byval'
          ? recap
            ? `std::string name();          // return T
std::string s = name();      // move or NRVO
// const T by value blocks move from the temporary`
            : decided
              ? `const std::string name();
std::string s = std::move(name());
// const return blocks move from the temporary`
              : `const std::string name() {
  return std::string("Ada");
}`
          : decided
            ? `bool Bag::empty() const {
  ++g_hits;        // compiles. not const in spirit.
  return items_.empty();
}`
            : `int g_hits = 0;
class Bag {
public:
  bool empty() const;
};`

  const caption =
    i === 0
      ? id === 'observer'
        ? 'Play observer. A const method can read members. Writing them is a compile error — that is the point of the annotation, not a style hint.'
        : id === 'find'
          ? 'Play find. Pair a const overload that returns const T* with a non-const one that returns T*. The const Bag& caller cannot reach the mutator.'
          : id === 'byval'
            ? 'Play by value. Returning const T by value is usually pointless: it blocks moving from the temporary. Return T. Return const T& when you mean a borrow.'
            : 'Play lie. A const method that mutates a global still compiles. Const is not thread-safety. It is a contract about *this, not the whole process.'
      : id === 'observer' && i === 1
        ? 'empty() reads items_. this is const Bag*. Callers with a const Bag& can use it. The weld is a read, not a copy.'
        : id === 'observer' && i === 2
          ? 'items_.clear() is ill-formed. The member function is const. You wanted a non-const mutator, or you wanted this call not to exist.'
          : id === 'observer'
            ? 'Mark observers const. Then a const Bag& is actually usable, and you notice accidental writes at compile time.'
            : id === 'find' && i === 1
              ? 'const Bag& picks find(Id) const. The pointer you get is const Item*. You cannot write through it.'
              : id === 'find' && i === 2
                ? 'Bag& picks the non-const overload. Item* lets you mutate. Same object, two contracts. Do not implement one via const_cast of the other without care.'
                : id === 'find'
                  ? 'This is the usual pair. cv-qualifiers on the pointer are a different page; here the const is on the method / the handle.'
                  : id === 'byval' && i === 1
                    ? 'const std::string comes back. The temporary is const-qualified. C++14 will not move from it; it copies.'
                    : id === 'byval' && i === 2
                      ? 'std::move is blocked by the const temporary. Returning const T by value is a pessimization. Return T. const T& is a borrow, not a value.'
                      : id === 'byval'
                        ? 'const on a parameter (const T&) is a gift. const on a returned value is usually a footgun. C++17 prvalues change the story slightly; this page is C++14.'
                        : i === 1
                          ? 'empty() const. this is const. Members of *this are safe. Globals are not in that contract.'
                          : i === 2
                            ? '++g_hits compiles. Two threads calling empty() now race. Const-correctness is not a mutex.'
                            : 'mutable is for a logical-const cache inside the object. A global counter is neither. Protect shared mutable data or do not share it.'

  const tone = trap ? (lieTrap ? 'trap' : 'warn') : readOk || mutFind || returnT ? 'ok' : 'idle'
  const playLabel =
    id === 'observer'
      ? 'Play empty() const'
      : id === 'find'
        ? 'Play find'
        : id === 'byval'
          ? 'Play const T'
          : 'Play ++g_hits'

  const verdict =
    id === 'observer' && i === 1
      ? 'empty() · read ok'
      : writeTrap && !recap
        ? 'clear() · ill-formed'
        : writeTrap
          ? 'observers const · compiles catch writes'
          : constFind && !mutFind
            ? 'const Bag& · const Item*'
            : mutFind && !recap
              ? 'Bag& · Item* write-through'
              : mutFind
                ? 'two overloads · one object'
                : id === 'byval' && i === 1
                  ? 'const T · temporary is const'
                  : moveBlocked
                    ? 'std::move blocked · copies'
                    : returnT
                      ? 'return T · not const T'
                      : id === 'lie' && i === 1
                        ? 'this is const · globals are not'
                        : lieTrap && !recap
                          ? '++g_hits · compiles'
                          : lieTrap
                            ? 'const is not a mutex'
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
      {id === 'observer' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${writeTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">empty() const</span>
            <div className={`fx-slot${writeTrap ? ' fx-slot--trap' : readOk ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">this</span>
              <span className="fx-value">{stepped ? 'Bag' : '—'}</span>
              <span className="fx-note">{writeTrap ? 'clear() ill-formed' : 'const Bag*'}</span>
            </div>
          </div>
          <div className={`fx-link${writeTrap ? ' fx-link--dead' : readOk ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">items_</span>
            <div className="fx-buf-row">
              {['a', 'b', 'c'].map((ch) => (
                <span
                  key={ch}
                  className={`fx-letter${writeTrap ? ' fx-letter--on' : readOk ? ' fx-letter--read' : ' fx-letter--empty'}`}
                >
                  {stepped ? ch : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">{writeTrap ? 'unchanged' : 'read, not write'}</span>
          </div>
        </div>
      )}
      {id === 'find' && (
        <div className="fx-ladder">
          <div className={`fx-rank${constFind ? ' fx-rank--on' : ''}${mutFind ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">const</span>
            <code>const Item*</code>
            <span className="fx-note">{constFind ? 'read' : '—'}</span>
          </div>
          <div className={`fx-rank${mutFind ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">Bag&</span>
            <code>Item*</code>
            <span className="fx-note">{mutFind ? 'write' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'byval' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${moveBlocked ? ' fx-pane--trap' : ''}${returnT ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">{returnT ? 'T' : 'const T'}</span>
            <div className="fx-buf-row">
              {['A', 'd', 'a'].map((ch) => (
                <span
                  key={ch}
                  className={`fx-letter${returnT ? ' fx-letter--empty' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}
                >
                  {returnT ? '·' : stepped ? ch : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">{returnT ? 'moved-from' : moveBlocked ? 'const temp' : 'temporary'}</span>
          </div>
          <div className={`fx-link${returnT ? ' fx-link--weld' : moveBlocked ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">s</span>
            <div className="fx-buf-row">
              {['A', 'd', 'a'].map((ch) => (
                <span
                  key={ch}
                  className={`fx-letter${returnT ? ' fx-letter--move' : moveBlocked ? ' fx-letter--on' : ' fx-letter--empty'}`}
                >
                  {decided ? ch : '·'}
                </span>
              ))}
            </div>
            <span className="fx-note">{returnT ? 'stole' : moveBlocked ? 'copy · blocked move' : 'waiting'}</span>
          </div>
        </div>
      )}
      {id === 'lie' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">empty() const</span>
            <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">this</span>
              <span className="fx-value">{stepped ? 'Bag' : '—'}</span>
              <span className="fx-note">members are const</span>
            </div>
          </div>
          <div className={`fx-link${lieTrap ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${lieTrap ? ' fx-pane--focus' : ''}${lieTrap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">g_hits</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${lieTrap ? ' fx-letter--write' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                {lieTrap ? '1' : stepped ? '0' : '·'}
              </span>
            </div>
            <span className="fx-note">{lieTrap ? 'not a mutex' : 'global, not a member'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          lieTrap ? 'fx-verdict--trap' : trap ? 'fx-verdict--warn' : readOk || mutFind || returnT ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
