import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'swap' | 'stream' | 'friend' | 'parens'

const MODES: { id: Mode; title: string }[] = [
  { id: 'swap', title: 'swap' },
  { id: 'stream', title: 'stream' },
  { id: 'friend', title: 'hidden friend' },
  { id: 'parens', title: 'parens' },
]

export function AdlViz() {
  const [id, setId] = useState<Mode>('swap')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const killed = id === 'parens' && decided
  const trap = killed
  const ok = (id === 'swap' && recap) || (id === 'stream' && recap) || (id === 'friend' && recap)

  const code =
    id === 'swap'
      ? recap
        ? `swap(a, b);          // ADL may pick N::swap
// std::swap(a, b);    // skips N::swap`
        : `namespace N {
  struct Item {};
  void swap(Item&, Item&);
}
void f(N::Item a, N::Item b) {
  using std::swap;
  swap(a, b);
}`
      : id === 'stream'
        ? recap
          ? `std::cout << x;  // ADL finds operator<<
// your type's << lives next to your type`
          : `std::cout << x;
// unqualified operator<<
// ADL searches namespace std
// because cout's type lives there`
        : id === 'friend'
          ? recap
            ? `bool ok = a == b;     // ADL finds the friend
// operator==(a, b) as a free name
// in this scope? no — hidden`
            : `struct Item {
  friend bool operator==(Item, Item) { return true; }
};
Item a, b;
bool ok = a == b;`
          : recap
            ? `int m = (std::min)(a, b);  // no ADL
std::min<int>(a, b);        // no ADL
// also dodges Windows.h min/max`
            : `int a = 1, b = 2;
int m = (std::min)(a, b);`

  const caption =
    i === 0
      ? id === 'swap'
        ? 'Play swap(a, b). using std::swap; then swap(a, b); lets ADL pick a better N::swap for Item. Qualifying std::swap(a, b) skips it.'
        : id === 'stream'
          ? 'Play cout << x. std::cout << x finds operator<< in namespace std because ADL searches the namespaces of the argument types. That is Koenig lookup.'
          : id === 'friend'
            ? 'Play a == b. friend operator== defined inside the class is not visible to ordinary lookup. ADL finds it when you compare two objects of that type.'
            : 'Play (std::min). (std::min)(a, b) or std::min<int>(a, b) suppress ADL. Useful around Windows min/max macros too.'
      : id === 'swap' && i === 1
        ? 'using std::swap enters the overload set. Ordinary lookup now sees std::swap. That is not the whole set. Stations light in place.'
        : id === 'swap' && i === 2
          ? 'swap(a, b) picks N::swap. Item’s associated namespace is N. ADL adds N::swap. The two-step idiom is how you write a generic swap.'
          : id === 'swap'
            ? 'std::swap(a, b) with qualification never considers N::swap. If Item is expensive to move, you just called the wrong function.'
            : id === 'stream' && i === 1
              ? 'cout’s type is std::ostream, associated namespace std. Unqualified << is a function call in disguise.'
              : id === 'stream' && i === 2
                ? 'ADL finds std::operator<<. Insertion operators live next to the stream types. Your type’s << should live next to your type.'
                : id === 'stream'
                  ? 'A using namespace std plus ADL can make the overload set enormous. Prefer using-declarations, or qualify when you mean a specific function.'
                  : id === 'friend' && i === 1
                    ? 'Ordinary lookup in this scope does not see the friend. The name is hidden on purpose.'
                    : id === 'friend' && i === 2
                      ? 'ADL searches Item’s namespace (and the class itself for friends). The hidden friend is found. That keeps == out of other overload sets.'
                      : id === 'friend'
                        ? 'Hidden friends are the usual C++11 spelling for operator==. They are not a C++20 invention; C++20 just generates them.'
                        : i === 1
                          ? '(std::min) is a parenthesized id-expression. That is not an unqualified function call, so ADL does not run.'
                          : i === 2
                            ? 'N::min is skipped. If a macro named min exists, the parens also stop expansion. std::min<int> is the other ADL kill-switch.'
                            : 'Unqualified begin/end on a mix of arrays and containers is another ADL footgun — std::begin is the portable one.'

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'swap'
      ? 'Play swap(a, b)'
      : id === 'stream'
        ? 'Play cout << x'
        : id === 'friend'
          ? 'Play a == b'
          : 'Play (std::min)'

  const verdict =
    id === 'swap' && recap
      ? 'qualify · skip N'
      : id === 'swap' && decided
        ? 'ADL · N::swap'
        : id === 'swap' && stepped
          ? 'using std::swap · set'
          : id === 'stream' && recap
            ? '<< lives next to the type'
            : id === 'stream' && decided
              ? 'ADL · operator<<'
              : id === 'stream' && stepped
                ? 'cout · ns std'
                : id === 'friend' && recap
                  ? 'hidden friend · ADL only'
                  : id === 'friend' && decided
                    ? 'ADL · friend =='
                    : id === 'friend' && stepped
                      ? 'ordinary · no'
                      : killed && recap
                        ? 'parens · ADL off'
                        : killed
                          ? 'N::min · skipped'
                          : id === 'parens' && stepped
                            ? 'id-expr · no ADL'
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
      {id === 'swap' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>std</code>
            <span className="fx-note">use</span>
            <span className="fx-note">{stepped ? 'set' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>N</code>
            <span className="fx-note">adl</span>
            <span className="fx-note">{decided ? 'win' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'stream' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>cout</code>
            <span className="fx-note">strm</span>
            <span className="fx-note">{stepped ? 'std' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>op</code>
            <span className="fx-note">{'<<'}</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'friend' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>name</code>
            <span className="fx-note">ord</span>
            <span className="fx-note">{stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>==</code>
            <span className="fx-note">fr</span>
            <span className="fx-note">{decided ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'parens' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${killed ? ' fx-rank--done' : ''}`}>
            <code>id</code>
            <span className="fx-note">min</span>
            <span className="fx-note">{stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${killed ? ' fx-rank--trap' : ''}`}>
            <code>N</code>
            <span className="fx-note">min</span>
            <span className="fx-note">{killed ? 'off' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
