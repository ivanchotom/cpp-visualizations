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

  const looked = i >= 1
  const found = i >= 2
  const recap = i >= 3
  const won = (id === 'swap' || id === 'stream' || id === 'friend') && found
  const killed = id === 'parens' && found

  const code =
    id === 'swap'
      ? i < 2
        ? `namespace N {
  struct Item {};
  void swap(Item&, Item&);
}`
        : `void f(N::Item a, N::Item b) {
  using std::swap;
  swap(a, b);          // ADL may pick N::swap
}
// std::swap(a, b);    // skips N::swap`
      : id === 'stream'
        ? `std::cout << x;
// unqualified operator<<
// ADL searches namespace std
// because cout's type lives there`
        : id === 'friend'
          ? i < 2
            ? `struct Item {
  friend bool operator==(Item, Item) { return true; }
};`
            : `Item a, b;
bool ok = a == b;     // ADL finds the friend
// operator==(a, b) as a free name
// in this scope? no — hidden`
          : i < 2
            ? `int a = 1, b = 2;
int m = (std::min)(a, b);`
            : `int m = (std::min)(a, b);  // no ADL
std::min<int>(a, b);        // no ADL
// also dodges Windows.h min/max`

  const caption =
    i === 0
      ? id === 'swap'
        ? 'Play swap. using std::swap; then swap(a, b); lets ADL pick a better N::swap for Item. Qualifying std::swap(a, b) skips it.'
        : id === 'stream'
          ? 'Play stream. std::cout << x finds operator<< in namespace std because ADL searches the namespaces of the argument types. That is Koenig lookup.'
          : id === 'friend'
            ? 'Play friend. friend operator== defined inside the class is not visible to ordinary lookup. ADL finds it when you compare two objects of that type.'
            : 'Play parens. (std::min)(a, b) or std::min<int>(a, b) suppress ADL. Useful around Windows min/max macros too.'
      : id === 'swap' && i === 1
        ? 'using std::swap enters the overload set. Ordinary lookup now sees std::swap. That is not the whole set.'
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

  const tone = killed ? 'warn' : won ? 'ok' : 'idle'
  const playLabel =
    id === 'swap'
      ? 'Play swap(a, b)'
      : id === 'stream'
        ? 'Play cout << x'
        : id === 'friend'
          ? 'Play a == b'
          : 'Play (std::min)'

  const verdict =
    id === 'swap' && found
      ? recap
        ? 'qualify std::swap and you skip N'
        : 'ADL · N::swap wins'
      : id === 'stream' && found
        ? 'ADL · operator<< in std'
        : id === 'friend' && found
          ? 'hidden friend · ADL only'
          : killed
            ? 'parens · ADL off'
            : id === 'swap' && looked
              ? 'using std::swap · not the whole set'
              : id === 'stream' && looked
                ? 'associated ns · std'
                : id === 'friend' && looked
                  ? 'ordinary lookup · empty'
                  : id === 'parens' && looked
                    ? 'parenthesized id · no ADL'
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
          <div className={`fx-rank${looked ? ' fx-rank--on' : ''}${found ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">ordinary</span>
            <code>std::swap</code>
            <span className="fx-note">{looked ? 'in set' : '—'}</span>
          </div>
          <div className={`fx-rank${found ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">ADL</span>
            <code>N::swap</code>
            <span className="fx-note">{found ? 'wins' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'stream' && (
        <div className="fx-sh">
          <div className={`fx-pane${looked ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">cout</span>
            <div className={`fx-slot${looked ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">ostream</span>
              <span className="fx-value">{looked ? 'std' : '—'}</span>
              <span className="fx-note">associated namespace</span>
            </div>
          </div>
          <div className={`fx-link${won ? ' fx-link--weld' : looked ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${found ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">unqualified</span>
            <div className={`fx-slot${won ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">operator</span>
              <span className="fx-value">{found ? '<<' : '—'}</span>
              <span className="fx-note">{found ? 'found in std' : 'waiting'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'friend' && (
        <div className="fx-ladder">
          <div className={`fx-rank${looked ? ' fx-rank--on' : ''}${found ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">ordinary</span>
            <code>operator==</code>
            <span className="fx-note">{looked ? 'hidden' : '—'}</span>
          </div>
          <div className={`fx-rank${found ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">ADL</span>
            <code>friend ==</code>
            <span className="fx-note">{found ? 'found' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'parens' && (
        <div className="fx-ladder">
          <div className={`fx-rank${looked ? ' fx-rank--on' : ''}${killed ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">id-expr</span>
            <code>(std::min)</code>
            <span className="fx-note">{looked ? 'no ADL' : '—'}</span>
          </div>
          <div className={`fx-rank${killed ? ' fx-rank--on fx-rank--trap' : ''}`}>
            <span className="fx-note">N::min</span>
            <code>skipped</code>
            <span className="fx-note">{killed ? 'off' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          killed ? 'fx-verdict--warn' : won ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
