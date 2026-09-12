import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'copy' | 'ref' | 'dangle' | 'init'

const MODES: { id: Mode; title: string }[] = [
  { id: 'copy', title: '[=] copy' },
  { id: 'ref', title: '[&] weld' },
  { id: 'dangle', title: 'dangling [&]' },
  { id: 'init', title: 'init-capture' },
]

export function LambdasViz() {
  const [id, setId] = useState<Mode>('copy')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const captured = i >= 1
  const ran = i >= 2
  const recap = i >= 3
  const frameGone = id === 'dangle' && ran
  const dangled = id === 'dangle' && recap
  const stole = id === 'init' && captured
  const trap = dangled
  const ok = (id === 'copy' && ran) || (id === 'ref' && ran) || (stole && ran)

  const code =
    id === 'copy'
      ? ran
        ? `f();  // closure n is 8, outer n is still 7`
        : `int n = 7;\nauto f = [=]() mutable { ++n; };`
      : id === 'ref'
        ? ran
          ? `f();  // write-through: outer n is 8`
          : `int n = 7;\nauto f = [&] { ++n; };`
        : id === 'dangle'
          ? recap
            ? `auto f = make();\nf();  // dangling reference — UB`
            : ran
              ? `}  // n is destroyed. The alias is leftover.`
              : `auto make() {\n  int n = 7;\n  return [&] { return n; };\n}`
          : ran
            ? `f();  // *p is 7. Original p is empty.`
            : `auto p = std::make_unique<int>(7);\nauto f = [p = std::move(p)] {\n  return *p;\n};`

  const caption =
    i === 0
      ? id === 'copy'
        ? 'Play [=]. The closure copies what it names. mutable lets operator() change that copy. Generic [](auto x) is a template operator() — also C++14.'
        : id === 'ref'
          ? 'Play [&]. The closure welds to the local. Same object, two names — until the local dies.'
          : id === 'dangle'
            ? 'Play make(). Returning [&] from a function is the classic dangling-capture trap.'
            : 'Play init-capture. [p = std::move(p)] is C++14: the member is initialized, not copy-captured.'
      : id === 'copy' && i === 1
        ? 'The closure has its own n. Outer 7 stays put. Huge [=] copies whole containers — name what you need.'
        : id === 'copy' && i === 2
          ? 'mutable lets operator() mutate the copy. Outer n is still 7. [](auto x) would stamp a new operator() per argument type.'
          : id === 'copy'
            ? '[=] is a copy. A captureless lambda converts to a function pointer. Capturing this by [=] copies the pointer, not the object.'
            : id === 'ref' && i === 1
              ? 'No copy. The lambda is an alias for n. Cheap, and dangerous if you outlive n.'
              : id === 'ref' && i === 2
                ? 'Write-through: ++n updates the local. Same object, two names — just like T&.'
                : id === 'ref'
                  ? 'Keep [&] lambdas inside the scope of what they name. Return them and you dangle.'
                  : id === 'dangle' && i === 1
                    ? 'The capture names stack n. Returning the lambda takes that alias out of the function.'
                    : id === 'dangle' && i === 2
                      ? 'make() returned. The frame is gone. n is destroyed. The capture still names that slot.'
                      : id === 'dangle'
                        ? 'f() reads a dead local. That is UB — not a stale copy, a hole in the stack. Capture by value, or a named [&n] you can audit.'
                        : i === 1
                          ? 'The unique_ptr member is initialized from std::move(p). Original p is empty. You cannot copy unique_ptr; you move it in.'
                          : i === 2
                            ? 'f() reads *p. The unique_ptr lives as long as the closure. That is how you ship ownership into a callback in C++14.'
                            : 'Init-capture is C++14. Use it when the member is not a copy of an existing name — move, or a computed value.'

  const tone = trap ? 'trap' : frameGone ? 'warn' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'copy'
      ? 'Play [=] mutable'
      : id === 'ref'
        ? 'Play [&] write'
        : id === 'dangle'
          ? 'Play make() then f()'
          : 'Play init-capture'

  const verdict =
    id === 'copy' && ran
      ? '[=] copy · outer still 7'
      : id === 'ref' && ran
        ? '[&] weld · write-through'
        : dangled
          ? 'dangling [&] · UB'
          : frameGone
            ? 'frame gone · alias leftover'
            : stole && ran
              ? 'init-capture · C++14 steal'
              : stole
                ? 'unique_ptr moved into f'
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
      {id === 'copy' && (
        <div className="fx-ladder">
          <div className={`fx-rank${captured ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">out</span>
            <span className="fx-note">{captured ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${captured ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>[=]</code>
            <span className="fx-note">copy</span>
            <span className="fx-note">{ran ? '8' : captured ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'ref' && (
        <div className="fx-ladder">
          <div className={`fx-rank${captured ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">loc</span>
            <span className="fx-note">{ran ? '8' : captured ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${captured ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>[&]</code>
            <span className="fx-note">weld</span>
            <span className="fx-note">{ran ? '8' : captured ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'dangle' && (
        <div className="fx-ladder">
          <div className={`fx-rank${captured ? ' fx-rank--on' : ''}${frameGone ? ' fx-rank--trap' : ''}`}>
            <code>n</code>
            <span className="fx-note">auto</span>
            <span className="fx-note">{frameGone ? 'gone' : captured ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${captured ? ' fx-rank--on' : ''}${dangled ? ' fx-rank--trap' : ''}`}>
            <code>[&]</code>
            <span className="fx-note">cap</span>
            <span className="fx-note">{dangled ? 'ub' : captured ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'init' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stole ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">own</span>
            <span className="fx-note">{stole ? 'gone' : '—'}</span>
          </div>
          <div className={`fx-rank${stole ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>f</code>
            <span className="fx-note">init</span>
            <span className="fx-note">{ran ? '7' : stole ? 'ok' : '—'}</span>
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
