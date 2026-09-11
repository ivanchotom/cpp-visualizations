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
  const trap = bounce || (protTrap && !recap)
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
        ? 'The constructor is a private name. Access control does not hide the layout from the ABI — only the names from other TUs’ source.'
        : id === 'priv' && i === 2
          ? 'Token{1} is ill-formed. Invariants belong in the private section, not in a comment. Use the factory or a public named constructor.'
          : id === 'priv'
            ? 'private does not mean secret. Anyone with the header can read the members’ types. It only means other code cannot name them. t.id() is the public name.'
            : id === 'friend' && i === 1
              ? 'makeToken may name Token’s private constructor. No one else is. The weld is a hole in the name check, not a flying token.'
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
        <div className="fx-sh">
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}${bounce ? ' fx-slot--trap' : ''}`}>
            <span className="fx-kicker">caller</span>
            <span className="fx-value">
              <code>main</code>
            </span>
            <span className="fx-note">{privOk ? 't.id()' : 'not a member'}</span>
          </div>
          <div className={`fx-link${bounce ? ' fx-link--dead' : privOk ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${bounce ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">Token</span>
            <div className={`fx-slot${bounce ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">private</span>
              <span className="fx-note">explicit Token(int)</span>
              <span className="fx-badge fx-badge--lock">private</span>
            </div>
            <div className={`fx-slot${privOk ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">public</span>
              <span className="fx-note">int id() const</span>
              {privOk && <span className="fx-badge fx-badge--open">API</span>}
            </div>
          </div>
        </div>
      )}
      {id === 'friend' && (
        <div className="fx-own">
          <div className="fx-pane">
            <span className="fx-kicker">main</span>
            <div className={`fx-slot${stepped ? ' fx-slot--dim' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">caller</span>
              <span className="fx-note">cannot name Token(int)</span>
            </div>
          </div>
          <div className={`fx-link${won ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${won ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">Token</span>
            <div className={`fx-slot${won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">private ctor</span>
              <span className="fx-note">{won ? 'named only by friends' : 'locked'}</span>
              <span className="fx-badge fx-badge--lock">private</span>
            </div>
          </div>
          <div className={`fx-link${won ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">makeToken</span>
            <div className={`fx-slot${won ? ' fx-slot--weld' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">friend</span>
              <span className="fx-note">{won ? 'Token{id} allowed here' : 'one function'}</span>
              {won && <span className="fx-badge fx-badge--open">ok</span>}
            </div>
          </div>
        </div>
      )}
      {id === 'prot' && (
        <div className="fx-sh">
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">Derived</span>
            <span className="fx-note">is-a Base</span>
          </div>
          <div className={`fx-link${protTrap && !recap ? ' fx-link--dead' : recap ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${protTrap && !recap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">Base</span>
            <div className={`fx-slot${protTrap && !recap ? ' fx-slot--trap' : recap ? ' fx-slot--ok' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">{recap ? 'private n_' : 'protected'}</span>
              <span className="fx-value">
                <code>n_</code>
              </span>
              <span className="fx-note">{recap ? 'bump() is protected' : protTrap ? 'n_ = 1 compiles · coupling' : 'visible to derived'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'st' && (
        <div className="fx-sh">
          <div className={`fx-slot${stepped ? ' fx-slot--ok' : ''}`}>
            <span className="fx-kicker">struct Dto</span>
            <span className="fx-value">
              <code>int id</code>
            </span>
            <span className="fx-note">default public · fine DTO</span>
          </div>
          <div className={`fx-link${recap ? ' fx-link--on' : ''}`} />
          <div className={`fx-slot${decided ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">class Token</span>
            <span className="fx-value">
              <code>int id_</code>
            </span>
            <span className="fx-note">{decided ? 'default private · invariant' : 'same layout, hidden name'}</span>
            {decided && <span className="fx-badge fx-badge--lock">private</span>}
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
