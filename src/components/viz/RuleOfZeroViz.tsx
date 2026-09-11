import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'zero' | 'quiet' | 'raw' | 'virt'
type SlotKind = 'gen' | 'user' | 'absent' | 'deleted' | 'idle'

const SLOTS = [
  { key: 'dtor', label: '~T()' },
  { key: 'copy', label: 'T(const T&)' },
  { key: 'cassign', label: 'T& operator=' },
  { key: 'move', label: 'T(T&&)' },
  { key: 'massign', label: 'T& operator= &&' },
] as const

const MODES: { id: Mode; title: string }[] = [
  { id: 'zero', title: 'Zero' },
  { id: 'quiet', title: 'empty dtor' },
  { id: 'raw', title: 'raw ptr' },
  { id: 'virt', title: 'virtual dtor' },
]

function slotState(mode: Mode, i: number, key: (typeof SLOTS)[number]['key']): SlotKind {
  if (i === 0) return 'idle'
  if (mode === 'zero') {
    if (key === 'copy' || key === 'cassign') return i >= 2 ? 'deleted' : 'gen'
    return 'gen'
  }
  if (mode === 'quiet') {
    if (key === 'dtor') return 'user'
    if (key === 'move' || key === 'massign') return i >= 2 ? 'absent' : 'gen'
    return 'gen'
  }
  if (mode === 'raw') {
    if (key === 'dtor') return i >= 3 ? 'user' : 'gen'
    return 'gen'
  }
  if (key === 'dtor') return 'user'
  if (i < 3) return i >= 2 ? 'absent' : 'idle'
  return 'user'
}

function slotLabel(st: SlotKind): string {
  if (st === 'idle') return '—'
  if (st === 'gen') return 'generated'
  if (st === 'user') return 'user'
  if (st === 'deleted') return '= delete'
  return 'absent'
}

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
        ? 'name_ is a std::string. Copying Person would copy the string. unique_ptr is not in the picture yet. No specials in Person.'
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
                            ? 'If you only write the virtual dtor and forget the rest, C++14 suppresses moves. The grid goes absent, not generated.'
                            : '=default copy and move. Prefer composition (Zero) over a polymorphic hierarchy when you can. When you cannot, spell the five.'

  const tone = trap ? (doubleFree ? 'trap' : 'warn') : stolen || virtOk ? 'ok' : 'idle'
  const playLabel =
    id === 'zero'
      ? 'Play Zero'
      : id === 'quiet'
        ? 'Play empty dtor'
        : id === 'raw'
          ? 'Play raw ptr'
          : 'Play virtual dtor'

  const inName = id === 'zero' ? 'members' : id === 'quiet' ? '~Person()' : id === 'raw' ? 'heap' : 'Base'
  const inVal =
    id === 'zero' ? (decided ? 'string + ptr' : stepped ? 'string' : '—') : id === 'quiet' ? '{}' : id === 'raw' ? (stepped ? 'new int{7}' : 'unset') : 'polymorphic'
  const midName = id === 'zero' ? 'Person' : id === 'quiet' ? 'implicit moves' : id === 'raw' ? 'Bag' : '~Base()'
  const midVal =
    id === 'zero' && decided
      ? 'copy deleted'
      : id === 'zero' && stepped
        ? 'no specials'
        : id === 'quiet' && decided
          ? 'suppressed'
          : id === 'raw' && stepped
            ? recap
              ? 'user dtor'
              : 'thinks Zero'
            : id === 'virt' && recap
              ? '=default rest'
              : id === 'virt' && stepped
                ? 'virtual'
                : '—'
  const outName = id === 'zero' ? 'b = move(a)' : id === 'quiet' ? 'b = move(a)' : id === 'raw' ? 'Bag b = a' : 'the five'
  const outVal = stolen
    ? 'b owns · a empty'
    : copied
      ? 'copy · a unchanged'
      : leak
        ? 'two ptrs, one new'
        : doubleFree
          ? 'double free'
          : virtTrap
            ? 'moves absent'
            : virtOk
              ? 'all five spelled'
              : '—'

  const leftLink = stepped ? (trap && decided ? 'fx-link--dead' : stolen || virtOk ? 'fx-link--weld' : 'fx-link--on') : ''
  const rightLink = doubleFree ? 'fx-link--dead' : stolen || virtOk ? 'fx-link--weld' : copied || leak || virtTrap ? 'fx-link--dead' : ''

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

  const nameB = stolen ? 'Ivan' : copied ? 'Ada' : ''

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
      <div className="fx-five">
        {SLOTS.map((s) => {
          const st = slotState(id, i, s.key)
          return (
            <div key={s.key} className={`fx-sm fx-sm--${st}`}>
              <span className="fx-kicker">{s.label}</span>
              <span className="fx-note">{slotLabel(st)}</span>
            </div>
          )
        })}
      </div>
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">in</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">resource</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${trap && decided ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">class</span>
          <div
            className={`fx-slot${
              trap && decided ? ' fx-slot--trap' : stolen || virtOk ? ' fx-slot--weld' : stepped ? ' fx-slot--focus' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'zero'
                ? 'compiler writes them'
                : id === 'quiet'
                  ? 'user dtor kills moves'
                  : id === 'raw'
                    ? 'raw is not a member manager'
                    : 'deliberate Five'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${recap || (id === 'zero' && decided) ? ' fx-pane--focus' : ''}${doubleFree ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div
            className={`fx-slot${
              doubleFree
                ? ' fx-slot--trap'
                : stolen || virtOk
                  ? ' fx-slot--weld'
                  : copied || leak
                    ? ' fx-slot--flash'
                    : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {stolen
                ? 'string moved, ptr stole'
                : copied
                  ? 'C++14 copies'
                  : leak
                    ? 'two owners'
                    : doubleFree
                      ? 'UB / crash'
                      : virtOk
                        ? 'moves restored'
                        : 'specials'}
            </span>
            {stolen && <span className="fx-badge fx-badge--owner">owner</span>}
            {copied && <span className="fx-badge fx-badge--open">copy</span>}
          </div>
        </div>
      </div>
      {id !== 'virt' && stepped ? (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${stolen ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">a</span>
            <div className="fx-buf-row">
              {id === 'raw' ? (
                <span className={`fx-letter${doubleFree ? ' fx-letter--dead' : ' fx-letter--on'}`}>7</span>
              ) : (
                (id === 'zero' ? ['I', 'v', 'a', 'n'] : ['A', 'd', 'a']).map((ch, n) => (
                  <span key={n} className={`fx-letter${stolen ? ' fx-letter--empty' : ' fx-letter--on'}`}>
                    {stolen ? '·' : ch}
                  </span>
                ))
              )}
            </div>
            <span className="fx-note">{stolen ? 'moved-from' : leak || doubleFree ? 'owns p' : 'source'}</span>
          </div>
          <div className={`fx-link${stolen ? ' fx-link--weld' : copied || leak ? ' fx-link--on' : doubleFree ? ' fx-link--dead' : ''}`} />
          <div className={`fx-pane${stolen || copied || leak || doubleFree ? ' fx-pane--focus' : ''}${doubleFree ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">b</span>
            <div className="fx-buf-row">
              {id === 'raw' ? (
                leak || doubleFree ? (
                  <span className={`fx-letter${doubleFree ? ' fx-letter--dead' : ' fx-letter--on'}`}>7</span>
                ) : (
                  <span className="fx-letter fx-letter--empty">·</span>
                )
              ) : stolen || copied ? (
                (nameB || '').split('').map((ch, n) => (
                  <span key={n} className={`fx-letter${stolen ? ' fx-letter--move' : ' fx-letter--on'}`}>
                    {ch}
                  </span>
                ))
              ) : (
                (id === 'zero' ? ['I', 'v', 'a', 'n'] : ['A', 'd', 'a']).map((_, n) => (
                  <span key={n} className="fx-letter fx-letter--empty">
                    ·
                  </span>
                ))
              )}
            </div>
            <span className="fx-note">
              {stolen ? 'stole' : copied ? 'copy of a' : leak ? 'same p' : doubleFree ? 'double free' : 'not yet'}
            </span>
          </div>
        </div>
      ) : null}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          doubleFree ? 'fx-verdict--trap' : trap ? 'fx-verdict--warn' : stolen || virtOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
