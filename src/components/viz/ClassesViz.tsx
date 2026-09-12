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
  const bounced = id === 'access' && decided
  const threw = id === 'inv' && decided
  const writeBlocked = id === 'thisc' && decided
  const wrongSpeak = id === 'virtctor' && decided
  const trap = bounced || threw || writeBlocked
  const warn = wrongSpeak
  const ok = (id === 'access' && recap) || (id === 'thisc' && recap)

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
          ? recap
            ? `int num() const {
  // this has type const Ratio*
  return num_;
}`
            : `int num() const {
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
        ? 'Play r.den_. struct vs class is default access. Keep data private and put the invariant in the constructor — that is a type, not a bag of fields.'
        : id === 'inv'
          ? 'Play Ratio(1, 0). If construction throws, there is no object. Callers never see a Ratio with den_ == 0.'
          : id === 'thisc'
            ? 'Play num() const. Inside num() const, this is const Ratio*. You may not assign num_. That is how const-correct APIs compose.'
            : 'Play speak() in ctor. The derived part is not there yet. The call uses the class under construction.'
      : id === 'access' && i === 1
        ? 'den_ is a data member. The lock is the language, not a style guide. Stations light in place.'
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

  const tone = trap ? 'trap' : warn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'access' ? 'Play r.den_' : id === 'inv' ? 'Play Ratio(1, 0)' : id === 'thisc' ? 'Play num() const' : 'Play speak() in ctor'

  const verdict =
    id === 'access' && recap
      ? 'r.den() · the API'
      : bounced
        ? 'r.den_ · ill'
        : id === 'access' && stepped
          ? 'den_ · private'
          : id === 'inv' && recap
            ? 'invariant · no object'
            : threw
              ? 'throw · no Ratio'
              : id === 'inv' && stepped
                ? 'den_ · 0'
                : id === 'thisc' && recap
                  ? 'const Ratio& · const only'
                  : writeBlocked
                    ? 'write · ill'
                    : id === 'thisc' && stepped
                      ? 'this · const Ratio*'
                      : id === 'virtctor' && recap
                        ? 'dynamic type is Base'
                        : wrongSpeak
                          ? 'Base::speak · D not alive'
                          : id === 'virtctor' && stepped
                            ? 'Base() · first'
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
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${bounced ? ' fx-rank--trap' : ''}`}>
            <code>den_</code>
            <span className="fx-note">priv</span>
            <span className="fx-note">{bounced ? 'ill' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : bounced ? ' fx-rank--on' : ''}`}>
            <code>den</code>
            <span className="fx-note">API</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'inv' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${threw ? ' fx-rank--trap' : ''}`}>
            <code>d</code>
            <span className="fx-note">den_</span>
            <span className="fx-note">{threw ? 'gone' : stepped ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${threw ? ' fx-rank--trap' : ''}`}>
            <code>R</code>
            <span className="fx-note">obj</span>
            <span className="fx-note">{threw ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'thisc' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>this</code>
            <span className="fx-note">cst</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${writeBlocked ? ' fx-rank--trap' : ''}`}>
            <code>n</code>
            <span className="fx-note">write</span>
            <span className="fx-note">{writeBlocked ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'virtctor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>B</code>
            <span className="fx-note">ctor</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${wrongSpeak ? ' fx-rank--trap' : ''}`}>
            <code>D</code>
            <span className="fx-note">speak</span>
            <span className="fx-note">{wrongSpeak ? 'no' : '—'}</span>
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
