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
  const trap = jumped || mixTrap
  const ok = steadyOk || (castOk && !trap)

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
        ? 'Play steady_clock. duration is how long, time_point is when, clock is which epoch. Measure intervals with steady_clock — it does not jump.'
        : id === 'jump'
          ? 'Play system_clock. system_clock is the wall. NTP and the user can step it backwards. That is a terrible stopwatch.'
          : id === 'cast'
            ? 'Play duration_cast. You pick the unit. The conversion truncates toward zero — 1500 ms becomes 1 second, not 2.'
            : 'Play a - b. time_points from different clocks do not convert. You cannot subtract them. That is a type error, not a runtime surprise.'
      : id === 'steady' && i === 1
        ? 't0 = now(). A time_point on this clock’s epoch. Not a wall-clock date. Stations light in place until work finishes.'
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
                    ? '1500 milliseconds. duration<Rep, Period>. The Period is a std::ratio. The count lives in the status column, not a size bar.'
                    : id === 'cast' && i === 2
                      ? 'duration_cast<seconds> truncates toward zero → 1. There is no rounding helper in C++14.'
                      : id === 'cast'
                        ? 'Overflow is real for a huge count with a tiny Period. Keep the unit matched to the scale you store.'
                        : i === 1
                          ? 'Two time_points. They look like “now,” but each clock has its own epoch and tick.'
                          : i === 2
                            ? 'Minus is not defined across clocks. The types do not match. That is the feature.'
                            : 'Need a wall time? system_clock. Need a duration? subtract two points from the same clock, then duration_cast.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'steady'
      ? 'Play steady_clock'
      : id === 'jump'
        ? 'Play system_clock'
        : id === 'cast'
          ? 'Play duration_cast'
          : 'Play a - b'

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
      {id === 'steady' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>t0</code>
            <span className="fx-note">now</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>dt</code>
            <span className="fx-note">cnt</span>
            <span className="fx-note">{steadyOk ? '42' : decided ? 'ms' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'jump' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>t0</code>
            <span className="fx-note">wall</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${jumped ? ' fx-rank--on' : ''}${jumped ? ' fx-rank--trap' : ''}`}>
            <code>dt</code>
            <span className="fx-note">sub</span>
            <span className="fx-note">{recap ? '-2' : jumped ? 'neg' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cast' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>ms</code>
            <span className="fx-note">dur</span>
            <span className="fx-note">{stepped ? '1500' : '—'}</span>
          </div>
          <div className={`fx-rank${castOk ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>s</code>
            <span className="fx-note">cut</span>
            <span className="fx-note">{castOk ? '1' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'mix' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>A</code>
            <span className="fx-note">stdy</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${mixTrap ? ' fx-rank--on' : ''}${mixTrap ? ' fx-rank--trap' : ''}`}>
            <code>B</code>
            <span className="fx-note">sub</span>
            <span className="fx-note">{mixTrap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
