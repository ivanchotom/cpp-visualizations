import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'zero' | 'quiet' | 'raw' | 'virt'

const MODES: { id: Mode; title: string }[] = [
  { id: 'zero', title: 'Zero' },
  { id: 'quiet', title: 'empty dtor' },
  { id: 'raw', title: 'raw ptr' },
  { id: 'virt', title: 'virtual dtor' },
]

export function RuleOfZeroViz() {
  const [id, setId] = useState<Mode>('zero')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const stolen = id === 'zero' && recap
  const copied = id === 'quiet' && recap
  const leak = id === 'raw' && decided && !recap
  const doubleFree = id === 'raw' && recap
  const virtTrap = id === 'virt' && decided && !recap
  const virtOk = id === 'virt' && recap
  const trap = copied || leak || doubleFree || virtTrap
  const ok = stolen || virtOk

  const code =
    id === 'zero'
      ? recap
        ? `Person b = std::move(a);
// name_ moves; profile_ steals
// copy of Person is deleted`
        : `class Person {
  std::string name_;
  std::unique_ptr<Profile> p_;
public:
  explicit Person(std::string name)
      : name_(std::move(name)) {}
};`
      : id === 'quiet'
        ? decided
          ? `Person b = std::move(a);  // copies
// user-declared dtor
// implicit moves are not generated`
          : `class Person {
  std::string name_;
public:
  ~Person() {}  // “debug”
};`
        : id === 'raw'
          ? recap
            ? `~Bag() { delete p; }
Bag a, b = a;
// two objects, one new
// double free`
            : `class Bag {
  int* p;  // owning
  // no dtor, no copy, no delete
};`
          : recap
            ? `struct Base {
  virtual ~Base() = default;
  Base(const Base&) = default;
  Base& operator=(const Base&) = default;
  Base(Base&&) = default;
  Base& operator=(Base&&) = default;
};`
            : `struct Base {
  virtual ~Base() = default;
  // C++14: user dtor kills moves
};`

  const caption =
    i === 0
      ? id === 'zero'
        ? 'Play Zero. string and unique_ptr already know copy/move/destroy. The class stays quiet. That is the Rule of Zero — the one you want.'
        : id === 'quiet'
          ? 'Play empty dtor. A do-nothing destructor “for debugging” is a user-declared dtor. In C++14 that suppresses implicit moves. Copies sneak back in.'
          : id === 'raw'
            ? 'Play raw ptr. An owning int* is not a member that manages itself. Zero thinking here is a leak, or a double free the moment you copy.'
            : 'Play virtual dtor. A polymorphic base often needs virtual ~Base(). That is a Rule of Five moment: =default the rest so you do not silently kill moves.'
      : id === 'zero' && i === 1
        ? 'name_ is a std::string. Copying Person would copy the string. unique_ptr is not in the picture yet. No specials in Person. Stations light in place.'
        : id === 'zero' && i === 2
          ? 'unique_ptr makes copy ctor and copy assign deleted. Move of Person still generates and steals the pointer. Still no specials in Person.'
          : id === 'zero'
            ? 'std::move(a) steals into b. name_ moves; p_ is empty on a. The constructor taking string by value is a sink, not a special member.'
            : id === 'quiet' && i === 1
              ? '~Person() {}. You declared a destructor. Even an empty one counts. =default is still user-declared for this rule.'
              : id === 'quiet' && i === 2
                ? 'Move ctor and move assign are not generated. Copy ctor and copy assign still are. Person b = std::move(a) will copy.'
                : id === 'quiet'
                  ? 'The source is unchanged. A type with unique_ptr members would be ill-formed here; string members just get slow. Look at all five if you declare one.'
                  : id === 'raw' && i === 1
                    ? 'new int sits in p. The class has no destructor. When Bag dies the allocation leaks. Raw owning pointers are not Zero-compatible.'
                    : id === 'raw' && i === 2
                      ? 'Copy copies the pointer. Two objects, one allocation. The compiler still thinks this is Zero because you wrote nothing.'
                      : id === 'raw'
                        ? 'Add ~Bag() { delete p; } and you have a double free. unique_ptr<int> is the Zero-compatible member.'
                        : i === 1
                          ? 'virtual ~Base() so delete (Base*)p runs the right destructor. That is not Zero; it is a known exception.'
                          : i === 2
                            ? 'If you only write the virtual dtor and forget the rest, C++14 suppresses moves. Moves go absent, not generated.'
                            : '=default copy and move. Prefer composition (Zero) over a polymorphic hierarchy when you can. When you cannot, spell the five.'

  const tone = trap ? (doubleFree ? 'trap' : 'warn') : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'zero'
      ? 'Play Zero'
      : id === 'quiet'
        ? 'Play empty dtor'
        : id === 'raw'
          ? 'Play raw ptr'
          : 'Play virtual dtor'

  const verdict =
    id === 'zero' && i === 1
      ? 'members manage · no specials'
      : id === 'zero' && i === 2
        ? 'unique_ptr · copy = delete'
        : stolen
          ? 'members moved · you wrote nothing'
          : id === 'quiet' && i === 1
            ? 'user dtor · even empty'
            : id === 'quiet' && i === 2
              ? 'moves absent · C++14 trap'
              : copied
                ? 'std::move copied · source unchanged'
                : id === 'raw' && i === 1
                  ? 'owning raw · leak waiting'
                  : leak
                    ? 'copy copies the pointer'
                    : doubleFree
                      ? 'add a dtor · double free'
                      : id === 'virt' && i === 1
                        ? 'virtual dtor · not Zero'
                        : virtTrap
                          ? 'user dtor kills moves'
                          : virtOk
                            ? '=default the rest'
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
      {id === 'zero' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${stolen ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">members manage</span>
            <span className="fx-note">{stolen ? 'gone' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}`}>
            <code>b</code>
            <span className="fx-note">{stolen ? 'steal' : 'copy = delete'}</span>
            <span className="fx-note">{stolen ? 'ok' : decided ? 'del' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'quiet' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${copied ? ' fx-rank--done' : ''}`}>
            <code>{'~T'}</code>
            <span className="fx-note">user-declared</span>
            <span className="fx-note">{stepped ? 'user' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${copied ? ' fx-rank--trap' : ''}`}>
            <code>{'T&&'}</code>
            <span className="fx-note">implicit move</span>
            <span className="fx-note">{copied ? 'copy' : decided ? 'gone' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'raw' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${leak || doubleFree ? ' fx-rank--trap' : ''}`}>
            <code>a</code>
            <span className="fx-note">owning raw</span>
            <span className="fx-note">{doubleFree ? 'dbl' : leak ? 'leak' : stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${doubleFree ? ' fx-rank--trap' : ''}`}>
            <code>b</code>
            <span className="fx-note">copy the ptr</span>
            <span className="fx-note">{doubleFree ? 'dbl' : leak ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'virt' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${virtOk ? ' fx-rank--done' : ''}`}>
            <code>{'~B'}</code>
            <span className="fx-note">virtual dtor</span>
            <span className="fx-note">{stepped ? 'user' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${virtTrap ? ' fx-rank--trap' : ''}`}>
            <code>{'T&&'}</code>
            <span className="fx-note">{virtOk ? '=default' : 'implicit move'}</span>
            <span className="fx-note">{virtOk ? 'ok' : virtTrap ? 'gone' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          doubleFree ? 'fx-verdict--trap' : trap ? 'fx-verdict--warn' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
