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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const memberMiss = id === 'plus' && decided
  const arithTrap = id === 'implicit' && decided
  const bRan = id === 'andop' && decided
  const trap = arithTrap || bRan
  const warn = memberMiss
  const ok = (id === 'plus' && recap) || (id === 'postfix' && recap) || (id === 'implicit' && recap)

  const code =
    id === 'plus'
      ? recap
        ? `2 + v;  // Vec(2) then free operator+
// v.operator+(2) is not this call`
        : `class Vec {
public:
  Vec(int n);
  Vec& operator+=(const Vec& o);
};
inline Vec operator+(Vec a, const Vec& b) {
  a += b;
  return a;
}`
      : id === 'implicit'
        ? recap
          ? `struct Flag {
  explicit operator bool() const { return on_; }
};
if (v) { }      // ok
// int n = v + 1;  // ill-formed`
          : `struct Flag {
  operator bool() const { return on_; }
};
if (v) { }      // ok
int n = v + 1;  // bool → int`
        : id === 'postfix'
          ? recap
            ? `i++;  // copy 3, then i is 4
// return old by value`
            : `T operator++(int) {  // dummy int
  T old = *this;
  ++*this;
  return old;
}`
          : recap
            ? `a && b;  // both evaluated
// built-in && would skip b when a is false`
            : `bool operator&&(const Flag&, const Flag&);
if (a && b) { }`

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
        ? '2 is int. Lookup for a member call would need a Vec on the left. The int does not grow a Vec::operator+. Stations light in place.'
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
                    ? 'Copy the current value. The result of i++ is that snapshot, not the incremented object.'
                    : id === 'postfix' && i === 2
                      ? '++*this. Implement postfix in terms of prefix so there is one increment to maintain. i is 4; old is still 3.'
                      : id === 'postfix'
                        ? 'Return old by value. Returning a reference to the local copy is a dangling-ref bug.'
                        : i === 1
                          ? 'a is false. Built-in && would not evaluate b. The overloaded call is an ordinary function call.'
                          : i === 2
                            ? 'b runs anyway. Side effects, throws, work — all happen. That is why overloading && is a footgun.'
                            : 'Write a named all() / both(). Keep && for bool. Same story for operator, (comma) and overloaded ||.'

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'plus' ? 'Play 2 + v' : id === 'implicit' ? 'Play v + 1' : id === 'postfix' ? 'Play i++' : 'Play a && b'

  const verdict =
    id === 'plus' && recap
      ? 'free + · Vec(2) then +='
      : memberMiss
        ? 'member + · lhs not Vec'
        : id === 'plus' && stepped
          ? '2 · int on the left'
          : id === 'implicit' && recap
            ? 'explicit bool · if (v) ok'
            : arithTrap
              ? 'v + 1 · 2'
              : id === 'implicit' && stepped
                ? 'if (v) · ok'
                : id === 'postfix' && recap
                  ? 'old is 3 · i is 4'
                  : id === 'postfix' && decided
                    ? '++*this · old stays 3'
                    : id === 'postfix' && stepped
                      ? 'old · snapshot 3'
                      : id === 'andop' && recap
                        ? 'overload && is a call'
                        : bRan
                          ? 'b ran · no short-circuit'
                          : id === 'andop' && stepped
                            ? 'a · false'
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
      {id === 'plus' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${memberMiss ? ' fx-rank--trap' : ''}`}>
            <code>mem</code>
            <span className="fx-note">+</span>
            <span className="fx-note">{memberMiss ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : stepped ? ' fx-rank--on' : ''}`}>
            <code>fr</code>
            <span className="fx-note">+</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'implicit' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>if</code>
            <span className="fx-note">bool</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${arithTrap ? ' fx-rank--trap' : ''}${recap ? ' fx-rank--trap' : ''}`}>
            <code>n</code>
            <span className="fx-note">+1</span>
            <span className="fx-note">{recap ? 'ill' : arithTrap ? '2' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'postfix' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>old</code>
            <span className="fx-note">copy</span>
            <span className="fx-note">{stepped ? '3' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>i</code>
            <span className="fx-note">++*</span>
            <span className="fx-note">{decided ? '4' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'andop' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>a</code>
            <span className="fx-note">false</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${bRan ? ' fx-rank--trap' : ''}`}>
            <code>b</code>
            <span className="fx-note">skip</span>
            <span className="fx-note">{bRan ? 'ran' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : warn ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
