import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'access' | 'inv' | 'thisc' | 'virtctor'

const MODES: { id: Mode; title: string }[] = [
  { id: 'access', title: 'private' },
  { id: 'inv', title: 'invariant' },
  { id: 'thisc', title: 'this const' },
  { id: 'virtctor', title: 'virt in ctor' },
]

export function ClassesViz() {
  const [id, setId] = useState<Mode>('access')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const bounced = id === 'access' && decided && !recap
  const apiOk = id === 'access' && recap
  const wrote = id === 'inv' && stepped && !decided
  const threw = id === 'inv' && decided
  const threwLive = id === 'inv' && decided && !recap
  const constThis = id === 'thisc' && stepped
  const writeBlocked = id === 'thisc' && decided
  const baseOn = id === 'virtctor' && stepped
  const wrongSpeak = id === 'virtctor' && decided
  const trap = bounced || threwLive || (writeBlocked && !recap)
  const ok = apiOk || (id === 'thisc' && recap) || (id === 'virtctor' && recap) || (id === 'inv' && recap)

  const code =
    id === 'access'
      ? recap
        ? `// r.den_   // ill-formed
r.den();           // the API`
        : `class Ratio {
  int num_, den_;  // private
public:
  int den() const;
};`
      : id === 'inv'
        ? recap
          ? `Ratio(1, 0);  // throws
// no object. The invariant held.`
          : `Ratio(int n, int d) : num_(n), den_(d) {
  if (den_ == 0) throw std::invalid_argument("den");
}`
        : id === 'thisc'
          ? `int num() const {
  // this has type const Ratio*
  return num_;
}`
          : recap
            ? `Base() { speak(); }
// D’s part is not constructed.
// Base::speak runs, not D::speak.`
            : `struct Base {
  Base() { speak(); }
  virtual void speak();
};
struct D : Base { void speak(); };`

  const caption =
    i === 0
      ? id === 'access'
        ? 'Play private. struct vs class is default access. Keep data private and put the invariant in the constructor — that is a type, not a bag of fields.'
        : id === 'inv'
          ? 'Play Ratio(1, 0). If construction throws, there is no object. Callers never see a Ratio with den_ == 0.'
          : id === 'thisc'
            ? 'Play a const member. Inside num() const, this is const Ratio*. You may not assign num_. That is how const-correct APIs compose.'
            : 'Play a virtual call in a constructor. The derived part is not there yet. The call uses the class under construction.'
      : id === 'access' && i === 1
        ? 'den_ is a data member. The lock is the language, not a style guide. The cyan bar is a name lookup, not a hop.'
        : id === 'access' && i === 2
          ? 'Ill-formed. Friendship punches a hole — use sparingly. The public API is den().'
          : id === 'access'
            ? 'r.den() is the read. In-class initializers (int n = 0) fill members a constructor forgets to mention, still in declaration order.'
            : id === 'inv' && i === 1
              ? 'The mem-initializer wrote 0 into den_. The body is the last chance to reject the value. Nothing has escaped to the caller.'
              : id === 'inv' && i === 2
                ? 'throw. Construction fails. Already-constructed members are destroyed in reverse. No Ratio exists for the caller.'
                : id === 'inv'
                  ? 'Public data with no check is a DTO. An invariant lives in the constructor (and in every mutating member).'
                  : id === 'thisc' && i === 1
                    ? 'this is const Ratio*. Reading num_ is fine. The cv of the member function is the cv of *this.'
                    : id === 'thisc' && i === 2
                      ? 'A write through this would not compile. mutable is the deliberate hole for caches — not for the invariant.'
                      : id === 'thisc'
                        ? 'Callers with a const Ratio& may only call const members. That is the whole point of marking them.'
                        : i === 1
                          ? 'Base() runs first. speak() is virtual, but during Base() the dynamic type is Base. Derived is not a slice that exists yet.'
                          : i === 2
                            ? 'Base::speak. D’s vtable slot is not active. Calling a pure virtual here is UB. Don’t virtual-dispatch in ctor/dtor.'
                            : 'D() body has not run. Members of D are not constructed. This is why factories after full construction exist.'

  const tone = bounced || (writeBlocked && !recap) || threwLive ? 'trap' : wrongSpeak && !recap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'access' ? 'Play r.den_' : id === 'inv' ? 'Play Ratio(1, 0)' : id === 'thisc' ? 'Play num() const' : 'Play speak() in ctor'

  const verdict =
    bounced
      ? 'r.den_ · private · ill-formed'
      : apiOk
        ? 'r.den() · the API'
        : wrote
          ? 'den_ = 0 · body will check'
          : threw && !recap
            ? 'throw · no Ratio exists'
            : id === 'inv' && recap
              ? 'invariant held · no object'
              : writeBlocked && !recap
                ? 'const this · write ill-formed'
                : id === 'thisc' && recap
                  ? 'const Ratio& may only call const'
                  : wrongSpeak && !recap
                    ? 'Base::speak · D not alive'
                    : id === 'virtctor' && recap
                      ? 'dynamic type is the class under construction'
                      : id === 'access' && stepped
                        ? 'name lookup · den_ is private'
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
      {id === 'access' && (
        <div className="fx-sh">
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}${bounced ? ' fx-slot--trap' : ''}`}>
            <span className="fx-kicker">caller</span>
            <span className="fx-value">
              <code>r</code>
            </span>
            <span className="fx-note">{apiOk ? 'r.den()' : stepped ? 'wants r.den_' : 'outside the class'}</span>
          </div>
          <div className={`fx-link${bounced ? ' fx-link--dead' : apiOk ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${bounced ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">Ratio</span>
            <div className={`fx-slot${bounced ? ' fx-slot--trap' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">private</span>
              <span className="fx-value">
                <code>den_</code>
              </span>
              <span className="fx-badge fx-badge--lock">private</span>
            </div>
            <div className={`fx-slot${apiOk ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">public</span>
              <span className="fx-note">int den() const</span>
              {apiOk && <span className="fx-badge fx-badge--open">API</span>}
            </div>
          </div>
        </div>
      )}
      {id === 'inv' && (
        <div className="fx-sh">
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ''}${threw ? ' fx-slot--trap' : ''}`}>
            <span className="fx-kicker">ctor args</span>
            <span className="fx-value">
              <code>Ratio(1, 0)</code>
            </span>
            <span className="fx-note">{threw ? 'construction failed' : 'n = 1, d = 0'}</span>
          </div>
          <div className={`fx-link${threw ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${wrote ? ' fx-pane--focus' : ''}${threw ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">{threw ? 'no object' : 'constructing'}</span>
            <div className={`fx-slot${wrote ? ' fx-slot--trap' : threw ? ' fx-slot--dim' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">den_</span>
              <span className="fx-value">{wrote ? '0' : '—'}</span>
              <span className="fx-note">{threw ? 'destroyed on unwind' : 'must not be 0'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'thisc' && (
        <div className="fx-sh">
          <div className={`fx-slot${constThis ? ' fx-slot--weld' : ''}`}>
            <span className="fx-kicker">object</span>
            <span className="fx-value">
              <code>const Ratio</code>
            </span>
            <span className="fx-note">callers may only call const members</span>
          </div>
          <div className={`fx-link${constThis ? ' fx-link--weld' : ''}${writeBlocked && !recap ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${constThis ? ' fx-pane--focus' : ''}${writeBlocked && !recap ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">this</span>
            <span className="fx-value">
              <code>{constThis ? 'const Ratio*' : '—'}</code>
            </span>
            <div className={`fx-slot${writeBlocked && !recap ? ' fx-slot--trap' : constThis ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">num_</span>
              <span className="fx-note">
                {writeBlocked && !recap ? 'write is ill-formed' : recap ? 'read is fine' : constThis ? 'read is fine' : 'not in the member yet'}
              </span>
            </div>
          </div>
        </div>
      )}
      {id === 'virtctor' && (
        <div className="fx-inh">
          <div className={`fx-slice${baseOn ? ' fx-slice--on' : ' fx-slice--off'}${wrongSpeak ? ' fx-slice--hot' : ''}`}>
            <span className="fx-kicker">Base</span>
            <span className="fx-note">{baseOn ? 'vptr → Base' : 'not started'}</span>
          </div>
          <div className="fx-slice fx-slice--off">
            <span className="fx-kicker">Derived</span>
            <span className="fx-note">not constructed</span>
          </div>
          <div className={`fx-slice fx-slice--derived${wrongSpeak ? ' fx-slice--on fx-slice--hot' : ' fx-slice--off'}`}>
            <span className="fx-kicker">speak()</span>
            <span className="fx-note">{wrongSpeak ? 'Base::speak' : 'D::speak?'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap && !recap ? 'fx-verdict--trap' : wrongSpeak && !recap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
