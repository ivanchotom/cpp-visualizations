import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'zero' | 'dtor' | 'five' | 'del'

type SlotKind = 'gen' | 'user' | 'absent' | 'deleted' | 'idle'

const SLOTS = [
  { key: 'dtor', label: '~T()' },
  { key: 'copy', label: 'T(const T&)' },
  { key: 'cassign', label: 'T& operator=' },
  { key: 'move', label: 'T(T&&)' },
  { key: 'massign', label: 'T& operator= &&' },
] as const

const MODES: { id: Mode; title: string }[] = [
  { id: 'zero', title: 'Rule of Zero' },
  { id: 'dtor', title: 'user ~T()' },
  { id: 'five', title: 'Rule of Five' },
  { id: 'del', title: 'move-only' },
]

function slotState(mode: Mode, i: number, key: (typeof SLOTS)[number]['key']): SlotKind {
  if (i === 0) return 'idle'
  if (mode === 'zero') return 'gen'
  if (mode === 'dtor') {
    if (key === 'dtor') return i >= 1 ? 'user' : 'idle'
    if (key === 'move' || key === 'massign') return i >= 2 ? 'absent' : 'gen'
    return 'gen'
  }
  if (mode === 'five') {
    if (key === 'dtor') return i >= 1 ? 'user' : 'idle'
    if (key === 'copy' || key === 'cassign') return i >= 2 ? 'user' : 'idle'
    return i >= 3 ? 'user' : 'idle'
  }
  if (key === 'copy' || key === 'cassign') return i >= 2 ? 'deleted' : 'idle'
  if (key === 'dtor' || key === 'move' || key === 'massign') return i >= 1 ? 'user' : 'idle'
  return 'idle'
}

function slotLabel(st: SlotKind): string {
  if (st === 'idle') return '—'
  if (st === 'gen') return 'generated'
  if (st === 'user') return 'user'
  if (st === 'deleted') return '= delete'
  return 'absent'
}

export function SpecialMembersViz() {
  const [id, setId] = useState<Mode>('zero')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const copied = id === 'dtor' && i >= 3
  const stolen = (id === 'zero' || id === 'del') && i >= 3
  const aEmpty = stolen
  const bOn = i >= 3

  const code =
    id === 'zero'
      ? i < 2
        ? `class Person {
  std::string name_;
  std::unique_ptr<Profile> p_;
};`
        : `Person b = std::move(a);
// members move. You wrote nothing.`
      : id === 'dtor'
        ? i === 0
          ? `class Handle { /* compiler five */ };`
          : i === 1
            ? `~Handle();  // user-declared`
            : i === 2
              ? `// implicit moves are gone (C++14)`
              : `Handle b = std::move(a);  // copies`
        : id === 'five'
          ? i < 3
            ? `Handle(const Handle&);
Handle& operator=(const Handle&);
Handle(Handle&&) noexcept;
Handle& operator=(Handle&&) noexcept;
~Handle();`
            : `// define or delete all five.`
          : i < 2
            ? `Handle(const Handle&) = delete;
Handle& operator=(const Handle&) = delete;`
            : `Handle(Handle&&) = default;
// move-only, like unique_ptr`

  const caption =
    i === 0
      ? id === 'zero'
        ? 'Play move. If every resource is already a member that knows copy/move/destroy, write nothing. That is the Rule of Zero.'
        : id === 'dtor'
          ? 'Play a user destructor. In C++14 a user-declared destructor suppresses implicit moves. Your class silently starts copying.'
          : id === 'five'
            ? 'Play the five. If you manage a raw resource, define or delete destructor, both copies, and both moves.'
            : 'Play delete. Delete the copy to make a type move-only. unique_ptr is this shape.'
      : id === 'zero' && i === 1
        ? 'string and unique_ptr already know the five. The compiler’s memberwise special members do the right thing.'
        : id === 'zero' && i === 2
          ? 'All five stay generated. No user dtor, no user copy, no user move — the compiler may write moves.'
          : id === 'zero'
            ? 'std::move(a) steals into b. You wrote nothing. Members did the rest. Cells fill on b; a goes empty in place.'
            : id === 'dtor' && i === 1
              ? 'A user-declared destructor. Even an empty one “for logging” counts. =default is still user-declared for this rule.'
              : id === 'dtor' && i === 2
                ? 'Move ctor and move assign are not generated. Copy ctor and copy assign still are. That is the C++11/14 trap.'
                : id === 'dtor'
                  ? 'T b = std::move(a) copies. The source is unchanged. A type that owned a raw pointer would now double-free on destroy.'
                  : id === 'five' && i === 1
                    ? 'Once you touch one, look at all of them. The grid is the checklist, not a suggestion.'
                    : id === 'five' && i === 2
                      ? 'Copies are user-provided. Moves still pending. The class is not done until the row is full.'
                      : id === 'five'
                        ? 'All five are user-provided. A polymorphic base is the deliberate exception: virtual ~Base() = default, then default or delete the rest.'
                        : i === 1
                          ? 'Destructor and moves are user. Copy is not decided yet.'
                          : i === 2
                            ? 'Copy ctor and copy assign are deleted. Copy initialization will not compile.'
                            : 'b steals. a is empty. You cannot accidentally copy a Handle and double-free.'

  const tone = copied ? 'warn' : stolen || (id === 'five' && i >= 3) ? 'ok' : 'idle'

  const playLabel =
    id === 'zero' ? 'Play T b = std::move(a)' : id === 'dtor' ? 'Play user ~T()' : id === 'five' ? 'Play the five' : 'Play = delete copy'

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
      <div className="fx-obj-row">
        <div className={`fx-slot${i >= 1 ? ' fx-slot--focus' : ''}${aEmpty ? ' fx-slot--dim' : ''}`}>
          <span className="fx-kicker">a</span>
          <span className="fx-value">
            <code>Handle</code>
          </span>
          <span className="fx-note">{aEmpty ? 'moved-from / empty' : i >= 1 ? 'owns' : 'not in the scene yet'}</span>
          {i >= 1 && !aEmpty && <span className="fx-badge fx-badge--owner">owner</span>}
        </div>
        <div className={`fx-slot${bOn ? ' fx-slot--focus' : ' fx-slot--dim'}${copied ? '' : stolen ? ' fx-slot--weld' : ''}`}>
          <span className="fx-kicker">b</span>
          <span className="fx-value">
            <code>Handle</code>
          </span>
          <span className="fx-note">{copied ? 'copy of a' : stolen ? 'stole a' : 'not yet'}</span>
          {copied && <span className="fx-badge fx-badge--open">copy</span>}
          {stolen && <span className="fx-badge fx-badge--owner">owner</span>}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          copied ? 'fx-verdict--warn' : stolen || (id === 'five' && i >= 3) ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'zero' && i >= 3
          ? 'members moved · you wrote nothing'
          : id === 'dtor' && i >= 2 && i < 3
            ? 'moves absent · C++14 trap'
            : copied
              ? 'std::move copied · source unchanged'
              : id === 'five' && i >= 3
                ? 'all five user · define or delete'
                : id === 'del' && i >= 2 && i < 3
                  ? 'copy = delete · move-only'
                  : stolen
                    ? 'move-only · a empty'
                    : id === 'zero' && i >= 1
                      ? 'all five generated'
                      : ''}
      </div>
    </SceneShell>
  )
}
