import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'rank' | 'del' | 'boolp' | 'hide'

const MODES: { id: Mode; title: string }[] = [
  { id: 'rank', title: 'ICS rank' },
  { id: 'del', title: 'deleted' },
  { id: 'boolp', title: 'ptr → bool' },
  { id: 'hide', title: 'hiding' },
]

export function OverloadViz() {
  const [id, setId] = useState<Mode>('rank')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const delTrap = id === 'del' && decided
  const hideTrap = id === 'hide' && decided
  const boolWarn = id === 'boolp' && decided
  const trap = delTrap || hideTrap
  const ok = id === 'rank' && recap

  const code =
    id === 'rank'
      ? recap
        ? `f('a');  // char → int  (promotion)
// not char → double (standard)`
        : `void f(int);
void f(double);
f('a');`
      : id === 'del'
        ? recap
          ? `draw(1.2);  // deleted double wins
// then the program is ill-formed`
          : `void draw(int);
void draw(double) = delete;
draw(1.2);`
        : id === 'boolp'
          ? `void f(int);
void f(bool);
void* p = nullptr;
f(p);  // f(bool)  — pointer → bool`
          : recap
            ? `d.f(1);  // D::f(double)
// B::f(int) is hidden, not overloaded`
            : `struct B { void f(int); };
struct D : B { void f(double); };
d.f(1);`

  const caption =
    i === 0
      ? id === 'rank'
        ? "Play f('a'). Viable candidates, then ICS rank: identity beats promotion beats standard conversion beats user-defined. Ties are ill-formed."
        : id === 'del'
          ? 'Play draw(1.2). A deleted overload still participates. If it wins, the call is an error — that is how you ban a conversion.'
          : id === 'boolp'
            ? 'Play f(p). A pointer converts to bool surprisingly well. That is why bool overloads next to pointer overloads are a footgun.'
            : 'Play d.f(1). Overloading in a derived class hides the base. You need a using B::f; to overload across the hierarchy.'
      : id === 'rank' && i === 1
        ? "'a' is char. Both f(int) and f(double) are viable. Ranking decides, not “closest type name.” Stations light in place."
        : id === 'rank' && i === 2
          ? 'char → int is a promotion. char → double is a standard conversion. Promotion wins. Identity would beat both.'
          : id === 'rank'
            ? 'f(int) is the best match. If two winners tie, the program is ill-formed — add a third overload or a cast.'
            : id === 'del' && i === 1
              ? '1.2 is double. Exact match on draw(double). draw(int) would need a standard conversion. Exact wins.'
              : id === 'del' && i === 2
                ? 'Deleted still wins. Participation is not “only if it would succeed.” The diagnostic is: deleted function.'
                : id === 'del'
                  ? 'Ill-formed. That is useful: delete the copy, delete the dangerous conversion. The winner is the one you banned.'
                  : id === 'boolp' && i === 1
                    ? 'p is void*. f(int) is not viable (no pointer-to-int). f(bool) is: any pointer converts to bool.'
                    : id === 'boolp' && i === 2
                      ? 'Standard conversion pointer → bool. There is no “null means skip.” You called f(true) if p is non-null.'
                      : id === 'boolp'
                        ? 'Prefer overloads that do not include bool next to pointers, or take a tag type. nullptr is still a pointer here.'
                        : i === 1
                          ? '1 is int. Name lookup in D finds D::f and stops. B::f is not in the overload set unless you using-declare it.'
                          : i === 2
                            ? 'D::f(double) via int → double. A worse conversion than B::f(int) would have been — but B::f was never a candidate.'
                            : 'Hidden, not overloaded. using B::f; in D brings the int overload back into the set, then ranking applies.'

  const tone = trap ? 'trap' : boolWarn ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'rank' ? "Play f('a')" : id === 'del' ? 'Play draw(1.2)' : id === 'boolp' ? 'Play f(p)' : 'Play d.f(1)'

  const verdict =
    id === 'rank' && recap
      ? 'promotion beats standard · f(int)'
      : id === 'rank' && decided
        ? 'char → int · promotion'
        : id === 'rank' && stepped
          ? 'both viable'
          : delTrap && recap
            ? 'deleted double wins · ill-formed'
            : delTrap
              ? 'deleted still participates'
              : id === 'del' && stepped
                ? 'exact match · double'
                : boolWarn && recap
                  ? 'ptr → bool · f(bool)'
                  : boolWarn
                    ? 'pointer converts to bool'
                    : id === 'boolp' && stepped
                      ? 'f(int) not viable'
                      : hideTrap && recap
                        ? 'B::f hidden · using B::f;'
                        : hideTrap
                          ? 'D::f(double) · worse but only candidate'
                          : id === 'hide' && stepped
                            ? 'lookup stops in D'
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
      {id === 'rank' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>int</code>
            <span className="fx-note">promo</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}`}>
            <code>dbl</code>
            <span className="fx-note">std</span>
            <span className="fx-note">{decided ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'del' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>int</code>
            <span className="fx-note">std</span>
            <span className="fx-note">{delTrap ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${delTrap ? ' fx-rank--trap' : ''}`}>
            <code>dbl</code>
            <span className="fx-note">del</span>
            <span className="fx-note">{delTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'boolp' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>int</code>
            <span className="fx-note">via</span>
            <span className="fx-note">{stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${boolWarn ? ' fx-rank--trap' : ''}`}>
            <code>bool</code>
            <span className="fx-note">ptr</span>
            <span className="fx-note">{boolWarn ? 'yes' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'hide' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${hideTrap ? ' fx-rank--trap' : ''}`}>
            <code>B</code>
            <span className="fx-note">hid</span>
            <span className="fx-note">{hideTrap ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${hideTrap ? ' fx-rank--on' : ''}`}>
            <code>D</code>
            <span className="fx-note">dbl</span>
            <span className="fx-note">{hideTrap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : boolWarn ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
