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

  const ranked = i >= 2
  const rejected = (id === 'del' && i >= 2) || (id === 'hide' && i >= 3)
  const leftWin = id === 'rank' && ranked
  const rightWin = (id === 'del' && i >= 1) || (id === 'boolp' && ranked) || (id === 'hide' && ranked)
  const leftSkip = id === 'hide' && i >= 1
  const leftDead = id === 'boolp' && i >= 1

  const code =
    id === 'rank'
      ? i < 2
        ? `void f(int);
void f(double);
f('a');`
        : `f('a');  // char → int  (promotion)
// not char → double (standard)`
      : id === 'del'
        ? i < 2
          ? `void draw(int);
void draw(double) = delete;
draw(1.2);`
          : `draw(1.2);  // deleted double wins
// then the program is ill-formed`
        : id === 'boolp'
          ? `void f(int);
void f(bool);
void* p = nullptr;
f(p);  // f(bool)  — pointer → bool`
          : i < 2
            ? `struct B { void f(int); };
struct D : B { void f(double); };
d.f(1);`
            : `d.f(1);  // D::f(double)
// B::f(int) is hidden, not overloaded`

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
        ? "'a' is char. Both f(int) and f(double) are viable. Ranking decides, not “closest type name.”"
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

  const arg =
    id === 'rank' ? "'a'" : id === 'del' ? '1.2' : id === 'boolp' ? 'p' : '1'
  const argTy = id === 'rank' ? 'char' : id === 'del' ? 'double' : id === 'boolp' ? 'void*' : 'int'
  const leftName = id === 'rank' ? 'f(int)' : id === 'del' ? 'draw(int)' : id === 'boolp' ? 'f(int)' : 'B::f(int)'
  const rightName = id === 'rank' ? 'f(double)' : id === 'del' ? 'draw(double)' : id === 'boolp' ? 'f(bool)' : 'D::f(double)'
  const leftRank =
    id === 'rank'
      ? ranked
        ? 'promotion'
        : 'viable'
      : id === 'del'
        ? 'standard'
        : id === 'boolp'
          ? 'not viable'
          : 'hidden'
  const rightRank =
    id === 'rank'
      ? 'standard'
      : id === 'del'
        ? rejected
          ? '= delete'
          : 'exact'
        : id === 'boolp'
          ? 'ptr → bool'
          : 'int → double'

  const tone = rejected ? 'trap' : leftWin ? 'ok' : id === 'boolp' && ranked ? 'warn' : 'idle'
  const playLabel =
    id === 'rank' ? "Play f('a')" : id === 'del' ? 'Play draw(1.2)' : id === 'boolp' ? 'Play f(p)' : 'Play d.f(1)'

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
      <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}`}>
        <span className="fx-kicker">call site</span>
        <span className="fx-value">
          <code>{arg}</code>
        </span>
        <span className="fx-note">{argTy}</span>
      </div>
      <div className={`fx-rank${i >= 1 ? ' fx-rank--on' : ''}${leftWin ? ' fx-rank--on' : ''}${leftSkip || leftDead ? ' fx-rank--done' : ''}`}>
        <code>{leftName}</code>
        <span className="fx-note">{leftRank}</span>
        <span className="fx-note">{leftWin ? 'best' : leftSkip ? 'hidden' : leftDead ? '—' : 'candidate'}</span>
      </div>
      <div
        className={`fx-rank${i >= 1 ? ' fx-rank--on' : ''}${rejected ? ' fx-rank--trap' : rightWin && !rejected ? ' fx-rank--on' : ''}`}
      >
        <code>{rightName}</code>
        <span className="fx-note">{rightRank}</span>
        <span className="fx-note">{rejected ? 'ill-formed' : rightWin ? 'best' : 'candidate'}</span>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          rejected ? 'fx-verdict--trap' : leftWin ? 'fx-verdict--ok' : id === 'boolp' && ranked ? 'fx-verdict--warn' : ''
        }`}
      >
        {id === 'rank' && ranked
          ? 'promotion beats standard · f(int)'
          : rejected && id === 'del'
            ? 'deleted double wins · ill-formed'
            : id === 'boolp' && ranked
              ? 'ptr → bool · f(bool)'
              : rejected && id === 'hide'
                ? 'B::f hidden · using B::f;'
                : id === 'hide' && ranked
                  ? 'D::f(double) · worse but only candidate'
                  : ''}
      </div>
    </SceneShell>
  )
}
