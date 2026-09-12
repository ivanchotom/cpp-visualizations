import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'zero' | 'dtor' | 'five' | 'del'

const MODES: { id: Mode; title: string }[] = [
  { id: 'zero', title: 'Rule of Zero' },
  { id: 'dtor', title: 'user ~T()' },
  { id: 'five', title: 'Rule of Five' },
  { id: 'del', title: 'move-only' },
]

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
  const trap = copied || (id === 'del' && decided && !recap)
  const ok = (id === 'zero' && recap) || (id === 'five' && recap) || (id === 'del' && recap)

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
          : `class Handle {
  ~Handle();  // user-declared
};`
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
        ? 'Play T b = std::move(a). If every resource is already a member that knows copy/move/destroy, write nothing. That is the Rule of Zero.'
        : id === 'dtor'
          ? 'Play user ~T(). In C++14 a user-declared destructor suppresses implicit moves. Your class silently starts copying.'
          : id === 'five'
            ? 'Play the five. If you manage a raw resource, define or delete destructor, both copies, and both moves.'
            : 'Play = delete copy. Delete the copy to make a type move-only. unique_ptr is this shape.'
      : id === 'zero' && i === 1
        ? 'string and unique_ptr already know the five. The compiler’s memberwise special members do the right thing. Stations light in place.'
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
                    ? 'Once you touch one, look at all of them. The two stations are the checklist, not a five-wide grid of flying tiles.'
                    : id === 'five' && i === 2
                      ? 'Copies are user-provided. Moves still pending. The class is not done until both copies and both moves are named.'
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

  const verdict =
    id === 'zero' && recap
      ? 'members moved · you wrote nothing'
      : id === 'zero' && decided
        ? 'members manage · no specials'
        : id === 'zero' && stepped
          ? 'all five generated'
          : copied
            ? 'std::move copied · source ok'
            : id === 'dtor' && decided
              ? 'moves absent · C++14'
              : id === 'dtor' && stepped
                ? 'user dtor · even empty'
                : id === 'five' && recap
                  ? 'all five user · define or delete'
                  : id === 'five' && decided
                    ? 'copies user · moves pending'
                    : id === 'five' && stepped
                      ? 'dtor user · look at the rest'
                      : stolen && id === 'del'
                        ? 'move-only · a gone'
                        : id === 'del' && decided
                          ? 'copy = delete'
                          : id === 'del' && stepped
                            ? 'dtor + moves'
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
            <span className="fx-note">mbr</span>
            <span className="fx-note">{stolen ? 'gone' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : decided ? ' fx-rank--on' : ''}`}>
            <code>b</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{stolen ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dtor' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${copied ? ' fx-rank--trap' : ''}`}>
            <code>~T</code>
            <span className="fx-note">usr</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${copied ? ' fx-rank--trap' : ''}`}>
            <code>mv</code>
            <span className="fx-note">T&&</span>
            <span className="fx-note">{copied ? 'cpy' : decided ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'five' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>~T</code>
            <span className="fx-note">dt</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>mv</code>
            <span className="fx-note">all</span>
            <span className="fx-note">{recap ? 'ok' : decided ? 'no' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'del' && (
        <div className="fx-ladder">
          <div className={`fx-rank${decided ? ' fx-rank--on' : stepped ? ' fx-rank--on' : ''}${decided ? ' fx-rank--trap' : ''}`}>
            <code>cp</code>
            <span className="fx-note">cpy</span>
            <span className="fx-note">{decided ? 'ill' : '—'}</span>
          </div>
          <div className={`fx-rank${stolen ? ' fx-rank--on fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{stolen ? 'gone' : '—'}</span>
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
