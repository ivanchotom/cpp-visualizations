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

  const memberMiss = id === 'plus' && stepped && !recap
  const freeWin = id === 'plus' && recap
  const boolOn = id === 'implicit' && stepped
  const arithTrap = id === 'implicit' && decided && !recap
  const oldOn = id === 'postfix' && stepped
  const incOn = id === 'postfix' && decided
  const bRan = id === 'andop' && decided
  const ok = freeWin || (id === 'postfix' && recap) || (id === 'implicit' && recap)
  const iVal = incOn ? '4' : '3'

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
          ? `T operator++(int) {  // dummy int
  T old = *this;
  ++*this;
  return old;
}
i++;  // copy 3, then i is 4`
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
                    ? 'Copy the current value. The result of i++ is that snapshot, not the incremented object. The copy sits in its own cell.'
                    : id === 'postfix' && i === 2
                      ? '++*this. Implement postfix in terms of prefix so there is one increment to maintain. i is 4; old is still 3.'
                      : id === 'postfix'
                        ? 'Return old by value. Returning a reference to the local copy is a dangling-ref bug.'
                        : i === 1
                          ? 'a is false. Built-in && would not evaluate b. The overloaded call is an ordinary function call.'
                          : i === 2
                            ? 'b runs anyway. Side effects, throws, work — all happen. That is why overloading && is a footgun.'
                            : 'Write a named all() / both(). Keep && for bool. Same story for operator, (comma) and overloaded ||.'

  const tone = arithTrap || bRan ? 'trap' : memberMiss ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'plus' ? 'Play 2 + v' : id === 'implicit' ? 'Play v + 1' : id === 'postfix' ? 'Play i++' : 'Play a && b'

  const verdict =
    id === 'plus' && memberMiss && !recap
      ? 'member + cannot convert lhs'
      : freeWin
        ? 'free + · Vec(2) then +='
        : arithTrap && !recap
          ? 'v + 1 → 2 · bool promotes'
          : id === 'implicit' && recap
            ? 'explicit operator bool · if (v) still works'
            : id === 'postfix' && recap
              ? 'old is 3 · i is 4'
              : id === 'postfix' && incOn
                ? '++*this · snapshot stays 3'
                : bRan && !recap
                  ? 'b evaluated · no short-circuit'
                  : id === 'andop' && recap
                    ? 'overload && is a function call'
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
        <>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">call site</span>
            <span className="fx-value">
              <code>2 + v</code>
            </span>
            <span className="fx-note">int on the left</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${memberMiss ? ' fx-rank--trap' : recap ? ' fx-rank--done' : ''}`}>
            <code>member +</code>
            <span className="fx-note">Vec::operator+</span>
            <span className="fx-note">{memberMiss ? 'lhs not Vec' : recap ? 'not this call' : 'needs *this'}</span>
          </div>
          <div className={`fx-rank${freeWin ? ' fx-rank--on' : stepped ? ' fx-rank--on' : ''}`}>
            <code>free +</code>
            <span className="fx-note">operator+(Vec, Vec)</span>
            <span className="fx-note">{freeWin ? 'Vec(2) then +=' : 'either side converts'}</span>
          </div>
        </>
      )}
      {id === 'implicit' && (
        <div className="fx-own">
          <div className={`fx-pane${boolOn ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">Flag v</span>
            <div className={`fx-slot${boolOn ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">object</span>
              <span className="fx-value">true</span>
              <span className="fx-note">if (v) is intended</span>
            </div>
          </div>
          <div className={`fx-link${boolOn ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${boolOn ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">conversion</span>
            <div className={`fx-slot${boolOn ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">operator bool</span>
              <span className="fx-note">{recap ? 'explicit · contextual only' : 'contextual conversion'}</span>
            </div>
          </div>
          <div className={`fx-link${arithTrap && !recap ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${arithTrap && !recap ? ' fx-pane--trap' : recap ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">v + 1</span>
            <div className={`fx-slot${arithTrap && !recap ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">int</span>
              <span className="fx-value">{arithTrap && !recap ? '2' : '—'}</span>
              <span className="fx-note">{recap ? 'refused' : arithTrap ? 'bool → int' : 'accidental arithmetic'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'postfix' && (
        <>
          <div className="fx-sh">
            <div className={`fx-slot${incOn ? ' fx-slot--focus' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">i</span>
              <span className="fx-note">{incOn ? '++*this' : 'current'}</span>
            </div>
            <div className={`fx-link${oldOn ? ' fx-link--on' : ''}`} />
            <div className={`fx-slot${oldOn ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">old</span>
              <span className="fx-note">snapshot · by value</span>
            </div>
          </div>
          <div className="fx-buf-row" style={{ justifyContent: 'center' }}>
            <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>{stepped ? iVal : '·'}</span>
            <span className={`fx-letter${oldOn ? ' fx-letter--on' : ' fx-letter--empty'}`}>{oldOn ? '3' : '·'}</span>
          </div>
        </>
      )}
      {id === 'andop' && (
        <>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}`}>
            <span className="fx-kicker">call site</span>
            <span className="fx-value">
              <code>a && b</code>
            </span>
            <span className="fx-note">overloaded · not built-in</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>a</code>
            <span className="fx-note">false</span>
            <span className="fx-note">{stepped ? 'evaluated' : 'lhs'}</span>
          </div>
          <div className={`fx-rank${bRan ? ' fx-rank--trap' : stepped ? ' fx-rank--on' : ''}`}>
            <code>b</code>
            <span className="fx-note">would skip</span>
            <span className="fx-note">{bRan ? 'ran anyway' : 'built-in would stop'}</span>
          </div>
        </>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          arithTrap || bRan ? 'fx-verdict--trap' : memberMiss ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
