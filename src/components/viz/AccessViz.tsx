import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'priv' | 'friend' | 'prot' | 'st'

const MODES: { id: Mode; title: string }[] = [
  { id: 'priv', title: 'private' },
  { id: 'friend', title: 'friend' },
  { id: 'prot', title: 'protected' },
  { id: 'st', title: 'struct' },
]

export function AccessViz() {
  const [id, setId] = useState<Mode>('priv')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const bounce = id === 'priv' && decided && !recap
  const privOk = id === 'priv' && recap
  const won = id === 'friend' && decided
  const protTrap = id === 'prot' && decided
  const structOk = id === 'st' && recap
  const trap = bounce || protTrap
  const ok = privOk || (id === 'friend' && recap) || structOk || (id === 'prot' && recap)

  const code =
    id === 'priv'
      ? recap
        ? `Token t{1};          // ill-formed
int n = t.id();      // the public name
// access is a name check, not a sandbox`
        : `class Token {
public:
  int id() const { return id_; }
private:
  explicit Token(int id);
  int id_;
};`
      : id === 'friend'
        ? `class Token {
  explicit Token(int id);
  friend Token makeToken(int);
};
Token makeToken(int id) { return Token{id}; }
// friend is not inherited, not transitive`
        : id === 'prot'
          ? recap
            ? `class Base {
private:
  int n_;
protected:
  void bump() { n_ = 1; }
};`
            : `class Base {
protected:
  int n_;
};
class Derived : public Base {
  void bump() { n_ = 1; }   // compiles
};`
          : recap
            ? `// the only language difference:
// default access (and default inheritance)
// public struct = DTO
// class with an invariant`
            : `struct Dto { int id; };     // public
class Token { int id_; };  // private`

  const caption =
    i === 0
      ? id === 'priv'
        ? 'Play Token{1}. Access is a compile-time check on names, not a runtime sandbox. class defaults to private. Token{1} from main is ill-formed; id() is the public name.'
        : id === 'friend'
          ? 'Play makeToken. friend Token makeToken(int); punches a hole for one function. Not inherited, not transitive. Prefer a single function over friend class Factory.'
          : id === 'prot'
            ? 'Play n_ =. Derived can write n_. That compiles and couples every derived class to the layout. Prefer private data and protected functions.'
            : 'Play struct vs class. The only language difference is default access (and default inheritance: public vs private). A public struct is a fine DTO.'
      : id === 'priv' && i === 1
        ? 'The constructor is a private name. Access control does not hide the layout from the ABI — only the names from other TUs’ source. Stations light in place.'
        : id === 'priv' && i === 2
          ? 'Token{1} is ill-formed. Invariants belong in the private section, not in a comment. Use the factory or a public named constructor.'
          : id === 'priv'
            ? 'private does not mean secret. Anyone with the header can read the members’ types. It only means other code cannot name them. t.id() is the public name.'
            : id === 'friend' && i === 1
              ? 'makeToken may name Token’s private constructor. No one else is. The hole is a name check, not a flying token.'
              : id === 'friend' && i === 2
                ? 'The factory returns a Token. Friendship is not inherited by Derived, and Factory’s friends do not become Token’s friends.'
                : id === 'friend'
                  ? 'friend-ing a whole class when a single function would do makes a wide hole. Keep the friend list short and next to the invariant it upholds.'
                  : id === 'prot' && i === 1
                    ? 'protected n_ is visible in Derived. The language allows the write. The design now has N places that can break the invariant.'
                    : id === 'prot' && i === 2
                      ? 'n_ = 1 compiles. The coupling is the bug. Protected functions that maintain the invariant, private data underneath.'
                      : id === 'prot'
                        ? 'protected is for “derived classes may call this.” It is not a second public. Data almost never belongs there.'
                        : i === 1
                          ? 'struct Dto has public fields. Fine for a bag of values with no invariant. class Token defaults private.'
                          : i === 2
                            ? 'class C { int id_; } hides the name. Same layout as a struct with that member. Default inheritance is private for class, public for struct.'
                            : 'Pick struct when the type is a public aggregate. Pick class when you have an invariant. The keyword is a signal, not a performance hint.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'priv' ? 'Play Token{1}' : id === 'friend' ? 'Play makeToken' : id === 'prot' ? 'Play n_ =' : 'Play struct vs class'

  const verdict =
    bounce
      ? 'Token{1} · ill-formed'
      : privOk
        ? 't.id() · the public name'
        : id === 'friend' && recap
          ? 'friend hole · not inherited'
          : won && !recap
            ? 'makeToken may name the ctor'
            : protTrap && !recap
              ? 'n_ = 1 · prefer private data'
              : id === 'prot' && recap
                ? 'protected functions · private data'
                : structOk
                  ? 'keyword signals invariant vs DTO'
                  : id === 'st' && decided
                    ? 'only the default differs'
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
      {id === 'priv' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${bounce || privOk ? ' fx-rank--trap' : ''}`}>
            <code>{'T{1}'}</code>
            <span className="fx-note">ctor</span>
            <span className="fx-note">{bounce || privOk ? 'ill' : stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${privOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>id()</code>
            <span className="fx-note">name</span>
            <span className="fx-note">{privOk ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'friend' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${stepped ? ' fx-rank--trap' : ''}`}>
            <code>main</code>
            <span className="fx-note">ctor</span>
            <span className="fx-note">{stepped ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${won ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>make</code>
            <span className="fx-note">fn</span>
            <span className="fx-note">{won ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'prot' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${protTrap ? ' fx-rank--trap' : ''}`}>
            <code>n_</code>
            <span className="fx-note">prot</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${protTrap ? ' fx-rank--trap' : ''}`}>
            <code>Der</code>
            <span className="fx-note">set</span>
            <span className="fx-note">{protTrap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'st' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>Dto</code>
            <span className="fx-note">st</span>
            <span className="fx-note">{stepped ? 'pub' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>Tok</code>
            <span className="fx-note">cls</span>
            <span className="fx-note">{decided ? 'priv' : '—'}</span>
          </div>
        </div>
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
