import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'steady' | 'jump' | 'cast' | 'mix'

const MODES: { id: Mode; title: string }[] = [
  { id: 'steady', title: 'steady' },
  { id: 'jump', title: 'jump' },
  { id: 'cast', title: 'cast' },
  { id: 'mix', title: 'clocks' },
]

function Pips({ n, of, trap }: { n: number; of: number; trap?: boolean }) {
  return (
    <div className="fx-size" aria-hidden>
      {Array.from({ length: of }, (_, k) => (
        <span
          key={k}
          className={`fx-size-unit${k < n ? ' fx-size-unit--on' : ''}${trap && k < n ? ' fx-size-unit--trap' : ''}`}
        />
      ))}
    </div>
  )
}

export function ChronoViz() {
  const [id, setId] = useState<Mode>('steady')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const jumped = id === 'jump' && decided
  const mixTrap = id === 'mix' && decided
  const steadyOk = id === 'steady' && recap
  const castOk = id === 'cast' && decided

  const code =
    id === 'steady'
      ? `using clock = std::chrono::steady_clock;
auto t0 = clock::now();
work();
auto ms = std::chrono::duration_cast<
    std::chrono::milliseconds>(clock::now() - t0);
std::cout << ms.count() << " ms\\n";`
      : id === 'jump'
        ? decided
          ? `// NTP stepped the clock -2s
// dt can be negative. Not elapsed time.`
          : `auto t0 = std::chrono::system_clock::now();
work();
auto dt = std::chrono::system_clock::now() - t0;`
        : id === 'cast'
          ? `auto d = std::chrono::milliseconds{1500};
auto s = std::chrono::duration_cast<
    std::chrono::seconds>(d);
// s.count() == 1  — toward zero`
          : `auto a = std::chrono::steady_clock::now();
auto b = std::chrono::system_clock::now();
// a - b;  // error: different clocks`

  const caption =
    i === 0
      ? id === 'steady'
        ? 'Play steady. duration is how long, time_point is when, clock is which epoch. Measure intervals with steady_clock — it does not jump.'
        : id === 'jump'
          ? 'Play jump. system_clock is the wall. NTP and the user can step it backwards. That is a terrible stopwatch.'
          : id === 'cast'
            ? 'Play duration_cast. You pick the unit. The conversion truncates toward zero — 1500 ms becomes 1 second, not 2.'
            : 'Play clocks. time_points from different clocks do not convert. You cannot subtract them. That is a type error, not a runtime surprise.'
      : id === 'steady' && i === 1
        ? 't0 = now(). A time_point on this clock’s epoch. Not a wall-clock date. The bar is empty until work finishes.'
        : id === 'steady' && i === 2
          ? 'work() runs. now() is later on the same clock. The difference is a duration — milliseconds via duration_cast.'
          : id === 'steady'
            ? '.count() is the integer tick count. C++14 has no operator<< for durations — print the count and the unit yourself.'
            : id === 'jump' && i === 1
              ? 't0 from system_clock. Fine for logging “what time was it,” bad for “how long did that take.”'
              : id === 'jump' && i === 2
                ? 'The wall jumps backward (NTP). The clock did not measure your function; it measured politics and radio.'
                : id === 'jump'
                  ? 'now - t0 can be negative. Use steady_clock for elapsed time. system_clock::to_time_t for C APIs.'
                  : id === 'cast' && i === 1
                    ? '1500 milliseconds. duration<Rep, Period>. The Period is a std::ratio. The pips are the count, in place.'
                    : id === 'cast' && i === 2
                      ? 'duration_cast<seconds> truncates toward zero → 1. There is no rounding helper in C++14.'
                      : id === 'cast'
                        ? 'Overflow is real for a huge count with a tiny Period. Keep the unit matched to the scale you store.'
                        : i === 1
                          ? 'Two time_points. They look like “now,” but each clock has its own epoch and tick.'
                          : i === 2
                            ? 'Minus is not defined across clocks. The types do not match. That is the feature.'
                            : 'Need a wall time? system_clock. Need a duration? subtract two points from the same clock, then duration_cast.'

  const tone = jumped || mixTrap ? 'trap' : steadyOk || castOk ? 'ok' : 'idle'
  const playLabel =
    id === 'steady'
      ? 'Play steady_clock'
      : id === 'jump'
        ? 'Play system_clock'
        : id === 'cast'
          ? 'Play duration_cast'
          : 'Play a - b'

  const inName =
    id === 'steady' ? 'steady_clock' : id === 'jump' ? 'system_clock' : id === 'cast' ? 'milliseconds' : 'steady tp'
  const inVal =
    id === 'steady' ? 'monotonic' : id === 'jump' ? (jumped ? 'jumped' : 'wall') : id === 'cast' ? '1500' : 'epoch A'
  const midName =
    id === 'steady' ? 'work()' : id === 'jump' ? 'work()' : id === 'cast' ? 'duration_cast<seconds>' : 'system tp'
  const midVal =
    id === 'steady' && stepped
      ? decided
        ? 'done'
        : 'running'
      : id === 'jump' && stepped
        ? jumped
          ? 'NTP −2s'
          : 'running'
        : id === 'cast' && stepped
          ? 'toward 0'
          : id === 'mix' && stepped
            ? 'different epoch'
            : '—'
  const outName = id === 'steady' ? 'duration' : id === 'jump' ? 'now − t0' : id === 'cast' ? 'count()' : 'minus'
  const outVal = steadyOk ? '42 ms' : jumped ? (recap ? '−2000 ms' : '??') : castOk ? '1' : mixTrap ? 'ill-formed' : '—'

  const leftLink = stepped ? 'fx-link--on' : ''
  const rightLink = jumped || mixTrap ? 'fx-link--dead' : steadyOk || castOk ? 'fx-link--weld' : decided ? 'fx-link--on' : ''

  const verdict =
    id === 'steady' && i === 2
      ? 'same clock · duration'
      : steadyOk
        ? '42 ms · .count()'
        : jumped && !recap
          ? 'wall jumped backward'
          : jumped
            ? 'negative elapsed · not a stopwatch'
            : id === 'cast' && i === 1
              ? '1500 ms'
              : castOk
                ? '1500 ms → 1 s · toward 0'
                : id === 'mix' && i === 1
                  ? 'two epochs'
                  : mixTrap
                    ? 'different clocks · no minus'
                    : ''

  const pipN =
    id === 'steady' ? (recap ? 8 : decided ? 5 : 0) : id === 'cast' ? (castOk ? 1 : stepped ? 15 : 0) : jumped ? 3 : 0
  const pipOf = id === 'cast' ? (castOk ? 2 : 15) : 8

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
      <div className="fx-own">
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">clock</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">when / how long</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${mixTrap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">step</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'steady'
                ? 'does not jump'
                : id === 'jump'
                  ? 'NTP / user can step it'
                  : id === 'cast'
                    ? 'truncate, not round'
                    : 'no implicit conversion'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${jumped || mixTrap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div
            className={`fx-slot${
              jumped || mixTrap ? ' fx-slot--trap' : steadyOk || castOk ? ' fx-slot--ok' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            {(id === 'steady' || id === 'cast') && stepped && (
              <Pips n={pipN} of={pipOf} trap={false} />
            )}
            {jumped && recap && <Pips n={3} of={8} trap />}
            <span className="fx-note">
              {steadyOk
                ? 'elapsed, .count()'
                : jumped
                  ? 'wall clock lied'
                  : castOk
                    ? '1500 ms → 1 s'
                    : mixTrap
                      ? 'ill-formed mix'
                      : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          jumped || mixTrap ? 'fx-verdict--trap' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
