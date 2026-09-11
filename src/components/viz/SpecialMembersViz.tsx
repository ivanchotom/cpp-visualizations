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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const copied = id === 'dtor' && recap
  const stolen = (id === 'zero' || id === 'del') && recap
  const trap = copied
  const ok = stolen || (id === 'five' && recap)

  const code =
    id === 'zero'
      ? recap
        ? `Person b = std::move(a);
// members move. You wrote nothing.`
        : `class Person {
  std::string name_;
  std::unique_ptr<Profile> p_;
};`
      : id === 'dtor'
        ? recap
          ? `Handle b = std::move(a);  // copies
// implicit moves are gone (C++14)`
          : i === 1
            ? `~Handle();  // user-declared`
            : i === 2
              ? `// implicit moves are gone (C++14)`
              : `class Handle { /* compiler five */ };`
        : id === 'five'
          ? recap
            ? `// define or delete all five.`
            : `Handle(const Handle&);
Handle& operator=(const Handle&);
Handle(Handle&&) noexcept;
Handle& operator=(Handle&&) noexcept;
~Handle();`
          : recap
            ? `Handle(Handle&&) = default;
// move-only, like unique_ptr`
            : `Handle(const Handle&) = delete;
Handle& operator=(const Handle&) = delete;`

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
            ? 'std::move(a) steals into b. You wrote nothing. Members did the rest. a goes empty in place; b is the owner.'
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

  const tone = trap ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'zero' ? 'Play T b = std::move(a)' : id === 'dtor' ? 'Play user ~T()' : id === 'five' ? 'Play the five' : 'Play = delete copy'

  const aOn = stepped
  const bOn = recap
  const aEmpty = stolen
  const linkKind = stolen ? 'weld' : copied ? 'on' : decided && id === 'del' ? 'dead' : stepped ? 'on' : ''

  const verdict =
    id === 'zero' && i === 1
      ? 'all five generated'
      : id === 'zero' && i === 2
        ? 'members manage · no specials'
        : stolen && id === 'zero'
          ? 'members moved · you wrote nothing'
          : id === 'dtor' && i === 1
            ? 'user dtor · even empty'
            : id === 'dtor' && i === 2
              ? 'moves absent · C++14 trap'
              : copied
                ? 'std::move copied · source unchanged'
                : id === 'five' && i === 1
                  ? 'dtor user · look at the rest'
                  : id === 'five' && i === 2
                    ? 'copies user · moves pending'
                    : id === 'five' && recap
                      ? 'all five user · define or delete'
                      : id === 'del' && i === 1
                        ? 'dtor + moves · copy pending'
                        : id === 'del' && decided && !recap
                          ? 'copy = delete · move-only'
                          : stolen && id === 'del'
                            ? 'move-only · a empty'
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
      {id !== 'five' && (
        <div className="fx-sh">
          <div className={`fx-pane${aOn ? ' fx-pane--focus' : ''}${aEmpty ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">a</span>
            <div className={`fx-slot${aOn && !aEmpty ? ' fx-slot--focus' : ' fx-slot--dim'}${copied ? ' fx-slot--ok' : ''}`}>
              <span className="fx-kicker">Handle</span>
              <div className="fx-buf-row">
                <span className={`fx-letter${aOn && !aEmpty ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                  {aOn && !aEmpty ? 'H' : '·'}
                </span>
              </div>
              <span className="fx-note">{aEmpty ? 'moved-from / empty' : aOn ? 'owns' : 'not in the scene yet'}</span>
              {aOn && !aEmpty && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
          </div>
          <div className={`fx-link${linkKind ? ` fx-link--${linkKind}` : ''}`} />
          <div className={`fx-pane${bOn ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">b</span>
            <div className={`fx-slot${bOn ? (stolen ? ' fx-slot--weld' : copied ? ' fx-slot--ok' : ' fx-slot--focus') : ' fx-slot--dim'}`}>
              <span className="fx-kicker">Handle</span>
              <div className="fx-buf-row">
                <span className={`fx-letter${bOn ? (stolen ? ' fx-letter--move' : ' fx-letter--on') : ' fx-letter--empty'}`}>
                  {bOn ? 'H' : '·'}
                </span>
              </div>
              <span className="fx-note">{copied ? 'copy of a' : stolen ? 'stole a' : 'not yet'}</span>
              {copied && <span className="fx-badge fx-badge--open">copy</span>}
              {stolen && <span className="fx-badge fx-badge--owner">owner</span>}
            </div>
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
