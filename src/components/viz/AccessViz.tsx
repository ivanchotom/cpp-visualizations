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

  const bounce = id === 'priv' && i === 2
  const trapped = (id === 'priv' && i === 2) || (id === 'prot' && i >= 2)
  const won = id === 'friend' && i >= 2
  const structOk = id === 'st' && i >= 3
  const privOk = id === 'priv' && i >= 3

  const code =
    id === 'priv'
      ? i < 2
        ? `class Token {
public:
  int id() const { return id_; }
private:
  explicit Token(int id);
  int id_;
};`
        : `Token t{1};          // ill-formed
int n = t.id();      // the public name
// access is a name check, not a sandbox`
      : id === 'friend'
        ? `class Token {
  explicit Token(int id);
  friend Token makeToken(int);
};
Token makeToken(int id) { return Token{id}; }
// friend is not inherited, not transitive`
        : id === 'prot'
          ? i < 2
            ? `class Base {
protected:
  int n_;
};`
            : `class Derived : public Base {
  void bump() { n_ = 1; }   // compiles
};
// derived classes couple to n_.
// prefer private data + protected functions`
          : i < 2
            ? `struct Dto { int id; };     // public
class Token { int id_; };  // private`
            : `// the only language difference:
// default access (and default inheritance)
// public struct = DTO
// class with public knobs + broken invariant ≠ DTO`

  const caption =
    i === 0
      ? id === 'priv'
        ? 'Play private. Access is a compile-time check on names, not a runtime sandbox. class defaults to private. Token{1} from main is ill-formed; id() is the public name.'
        : id === 'friend'
          ? 'Play friend. friend Token makeToken(int); punches a hole for one function. Not inherited, not transitive. Prefer a single function over friend class Factory.'
          : id === 'prot'
            ? 'Play protected. Derived can write n_. That compiles and couples every derived class to the layout. Prefer private data and protected functions.'
            : 'Play struct. The only language difference vs class is default access (and default inheritance: public vs private). A public struct is a fine DTO.'
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

  const tone = trapped || bounce ? 'trap' : won || structOk || privOk ? 'ok' : 'idle'

  const playLabel =
    id === 'priv' ? 'Play Token{1}' : id === 'friend' ? 'Play makeToken' : id === 'prot' ? 'Play n_ =' : 'Play struct vs class'

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
          <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}${bounce ? ' fx-slot--trap' : ''}`}>
            <span className="fx-kicker">caller</span>
            <span className="fx-value">
              <code>main</code>
            </span>
            <span className="fx-note">{privOk ? 't.id()' : 'not a member'}</span>
          </div>
          <div className={`fx-link${bounce ? ' fx-link--dead' : privOk ? ' fx-link--weld' : i >= 1 ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}${bounce ? ' fx-pane--trap' : ''}`}>
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
        <div className="fx-sh">
          <div className={`fx-slot${i >= 1 ? ' fx-slot--weld' : ''}`}>
            <span className="fx-kicker">makeToken</span>
            <span className="fx-value">
              <code>friend</code>
            </span>
            <span className="fx-note">one function · not a class</span>
          </div>
          <div className={`fx-link${won ? ' fx-link--weld' : i >= 1 ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">Token</span>
            <div className={`fx-slot${won ? ' fx-slot--ok' : i >= 1 ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">private ctor</span>
              <span className="fx-note">{won ? 'Token{id} allowed here' : 'named only by friends'}</span>
              {won && <span className="fx-badge fx-badge--open">ok</span>}
            </div>
          </div>
        </div>
      )}
      {id === 'prot' && (
        <div className="fx-sh">
          <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">Derived</span>
            <span className="fx-note">is-a Base</span>
          </div>
          <div className={`fx-link${trapped ? ' fx-link--dead' : i >= 1 ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${i >= 1 ? ' fx-pane--focus' : ''}${trapped ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">Base</span>
            <div className={`fx-slot${trapped ? ' fx-slot--trap' : i >= 1 ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">protected</span>
              <span className="fx-value">
                <code>n_</code>
              </span>
              <span className="fx-note">{trapped ? 'n_ = 1 compiles · coupling' : 'visible to derived'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'st' && (
        <div className="fx-compare" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <div className={`fx-slot${i >= 1 ? ' fx-slot--ok' : ''}`}>
            <span className="fx-kicker">struct Dto</span>
            <span className="fx-value">
              <code>int id</code>
            </span>
            <span className="fx-note">default public · fine DTO</span>
          </div>
          <span className="fx-op">vs</span>
          <div className={`fx-slot${i >= 2 ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">class Token</span>
            <span className="fx-value">
              <code>int id_</code>
            </span>
            <span className="fx-note">{i >= 2 ? 'default private · invariant' : 'same layout, hidden name'}</span>
            {i >= 2 && <span className="fx-badge fx-badge--lock">private</span>}
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          trapped || bounce ? 'fx-verdict--trap' : won || structOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'priv' && bounce
          ? 'Token{1} · ill-formed'
          : privOk
            ? 't.id() · the public name'
            : won
              ? 'friend hole · not inherited'
              : trapped && id === 'prot'
                ? 'n_ = 1 · prefer private data'
                : structOk
                  ? 'keyword signals invariant vs DTO'
                  : id === 'st' && i >= 2
                    ? 'only the default differs'
                    : ''}
      </div>
    </SceneShell>
  )
}
