import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'plus' | 'implicit' | 'postfix' | 'andop'

const MODES: { id: Mode; title: string }[] = [
  { id: 'plus', title: '2 + v' },
  { id: 'implicit', title: 'implicit' },
  { id: 'postfix', title: 'postfix' },
  { id: 'andop', title: 'operator&&' },
]

export function OpOverloadViz() {
  const [id, setId] = useState<Mode>('plus')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const bounce = id === 'plus' && i === 2
  const trapped = (id === 'implicit' && i >= 2) || (id === 'andop' && i >= 2)
  const won = (id === 'plus' && i >= 3) || (id === 'postfix' && i >= 3)
  const memberMiss = id === 'plus' && i >= 1 && i < 3
  const freeOn = id === 'plus' && i >= 3
  const boolOn = id === 'implicit' && i >= 1
  const arithTrap = id === 'implicit' && i >= 2
  const oldOn = id === 'postfix' && i >= 1
  const incOn = id === 'postfix' && i >= 2
  const bRan = id === 'andop' && i >= 2
  const iVal = id === 'postfix' && i >= 2 ? '4' : '3'

  const code =
    id === 'plus'
      ? i < 3
        ? `class Vec {
public:
  Vec(int n);
  Vec& operator+=(const Vec& o);
};
inline Vec operator+(Vec a, const Vec& b) {
  a += b;
  return a;
}`
        : `2 + v;   // Vec(2) then free operator+
// v.operator+(2) is not this call`
      : id === 'implicit'
        ? i < 2
          ? `struct Flag {
  operator bool() const { return on_; }
};
if (v) { }     // ok
int n = v + 1; // bool → int`
          : `int n = v + 1;  // 1 + 1
// explicit operator bool() would refuse`
        : id === 'postfix'
          ? `T operator++(int) {  // dummy int
  T old = *this;
  ++*this;
  return old;
}
i++;  // copy 3, then i is 4`
          : i < 2
            ? `bool operator&&(const Flag&, const Flag&);
if (a && b) { }`
            : `a && b;  // both evaluated
// built-in && would skip b when a is false`

  const caption =
    i === 0
      ? id === 'plus'
        ? 'Play 2 + v. A member operator+ needs *this on the left. A free operator+ lets either operand convert — that is why + is usually a non-member.'
        : id === 'implicit'
          ? 'Play v + 1. Implicit operator bool() also converts to int. if (v) works; so does v + 1, which is rarely what you meant.'
          : id === 'postfix'
            ? 'Play i++. The dummy int overload is postfix. Copy the old value, prefix-increment, return the copy — by value, not a reference to a local.'
            : 'Play a && b. Overloaded && || and comma lose short-circuit and sequencing. Prefer named functions if you must combine two Flags.'
      : id === 'plus' && i === 1
        ? '2 is int. Lookup for a member call would need a Vec on the left. The int does not grow a Vec::operator+.'
        : id === 'plus' && i === 2
          ? 'Miss. Member operators never convert the left operand. That is why 2 + v is a different design from v + 2.'
          : id === 'plus'
            ? 'Free operator+(Vec, Vec). 2 converts via Vec(int), then +=. Either side may convert. Keep + unsurprising: it should not mutate its operands.'
            : id === 'implicit' && i === 1
              ? 'v converts to bool. Contextual conversions (if, &&, !) are the intended use.'
              : id === 'implicit' && i === 2
                ? 'bool promotes to int. v + 1 is 2. The type now does arithmetic it never declared.'
                : id === 'implicit'
                  ? 'Mark it explicit operator bool() (C++11). if (v) still works; v + 1 does not. That is the whole point of explicit.'
                  : id === 'postfix' && i === 1
                    ? 'Copy the current value. The result of i++ is that snapshot, not the incremented object. The copy sits in its own slot.'
                    : id === 'postfix' && i === 2
                      ? '++*this. Implement postfix in terms of prefix so there is one increment to maintain. i is 4; old is still 3.'
                      : id === 'postfix'
                        ? 'Return old by value. Returning a reference to the local copy is a dangling-ref bug.'
                        : i === 1
                          ? 'a is false. Built-in && would not evaluate b. The overloaded call is an ordinary function call.'
                          : i === 2
                            ? 'b runs anyway. Side effects, throws, work — all happen. That is why overloading && is a footgun.'
                            : 'Write a named all() / both(). Keep && for bool. Same story for operator, (comma) and overloaded ||.'

  const tone = trapped || bounce ? 'trap' : won ? 'ok' : 'idle'

  const playLabel =
    id === 'plus' ? 'Play 2 + v' : id === 'implicit' ? 'Play v + 1' : id === 'postfix' ? 'Play i++' : 'Play a && b'

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
      {id === 'plus' && (
        <div className="fx-compare">
          <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">lhs</span>
            <span className="fx-value">
              <code>2</code>
            </span>
            <span className="fx-note">int at the call site</span>
          </div>
          <span className={`fx-op${memberMiss ? ' fx-op--on' : ''}`}>+</span>
          <div className={`fx-slot${memberMiss ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">member</span>
            <span className="fx-note">Vec::operator+</span>
            <span className="fx-note">{memberMiss ? 'left is not Vec' : 'needs *this on the left'}</span>
          </div>
          <span className={`fx-op${freeOn ? ' fx-op--on' : ''}`}>{freeOn ? '→' : ' '}</span>
          <div className={`fx-slot${freeOn ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">free</span>
            <span className="fx-note">operator+(Vec, Vec)</span>
            <span className="fx-note">{freeOn ? 'Vec(2) then +=' : 'either side may convert'}</span>
          </div>
        </div>
      )}
      {id === 'implicit' && (
        <div className="fx-compare">
          <div className={`fx-slot${boolOn ? ' fx-slot--weld' : ''}`}>
            <span className="fx-kicker">Flag v</span>
            <span className="fx-value">true</span>
            <span className="fx-note">if (v) is the intended use</span>
          </div>
          <span className={`fx-op${boolOn ? ' fx-op--on' : ''}`}>→</span>
          <div className={`fx-slot${boolOn ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">operator bool</span>
            <span className="fx-note">contextual conversion</span>
          </div>
          <span className={`fx-op${arithTrap ? ' fx-op--on' : ''}`}>+</span>
          <div className={`fx-slot${arithTrap ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">v + 1</span>
            <span className="fx-value">{arithTrap ? '2' : '—'}</span>
            <span className="fx-note">{arithTrap ? 'bool → int  (oops)' : 'accidental arithmetic'}</span>
          </div>
        </div>
      )}
      {id === 'postfix' && (
        <div className="fx-compare">
          <div className={`fx-slot${incOn ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">i</span>
            <span className="fx-value">{iVal}</span>
            <span className="fx-note">{incOn ? '++*this' : 'current'}</span>
          </div>
          <span className={`fx-op${oldOn ? ' fx-op--on' : ''}`}>i++</span>
          <div className={`fx-slot${oldOn ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">old</span>
            <span className="fx-value">{oldOn ? '3' : '—'}</span>
            <span className="fx-note">the result · by value</span>
          </div>
          <span className="fx-op"> </span>
          <div className={`fx-slot${won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">return</span>
            <span className="fx-note">{won ? 'return old · not a ref to local' : 'postfix returns the snapshot'}</span>
          </div>
        </div>
      )}
      {id === 'andop' && (
        <div className="fx-compare">
          <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">a</span>
            <span className="fx-value">false</span>
            <span className="fx-note">built-in && would stop</span>
          </div>
          <span className={`fx-op${i >= 1 ? ' fx-op--on' : ''}`}>&&</span>
          <div className={`fx-slot${i >= 1 ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">operator&&</span>
            <span className="fx-note">ordinary function call</span>
          </div>
          <span className={`fx-op${bRan ? ' fx-op--on' : ''}`}>b</span>
          <div className={`fx-slot${bRan ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">b</span>
            <span className="fx-note">{bRan ? 'evaluated anyway' : 'would skip if built-in'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          trapped || bounce ? 'fx-verdict--trap' : won ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'plus' && bounce
          ? 'member + cannot convert lhs'
          : freeOn
            ? 'free + · Vec(2) then +='
            : arithTrap
              ? 'v + 1 → 2 · use explicit bool'
              : won && id === 'postfix'
                ? 'old is 3 · i is 4'
                : bRan
                  ? 'no short-circuit · b ran'
                  : ''}
      </div>
    </SceneShell>
  )
}
