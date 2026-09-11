import { useEffect, useState } from 'react'
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
  const [flash, setFlash] = useState<'local' | 'closure' | 'both' | null>(null)

  function select(next: string) {
    reset()
    setFlash(null)
    setId(next as Mode)
  }

  const captured = i >= 1
  const ran = i >= 2
  const frameGone = id === 'dangle' && i >= 2
  const dangled = id === 'dangle' && i >= 3
  const stole = id === 'init' && captured
  const welded = (id === 'ref' || id === 'dangle') && captured && !dangled && !frameGone
  const copied = id === 'copy' && captured

  const outerVal =
    id === 'ref' && ran
      ? 8
      : id === 'init'
        ? stole
          ? 'empty'
          : '7'
        : frameGone
          ? 'gone'
          : 7

  const closureVal =
    id === 'init'
      ? stole
        ? 7
        : '—'
      : id === 'dangle'
        ? dangled
          ? 'UB'
          : captured
            ? 7
            : '—'
        : id === 'copy'
          ? captured
            ? ran
              ? 8
              : 7
            : '—'
          : captured
            ? ran
              ? 8
              : 7
            : '—'

  useEffect(() => {
    if (!playing) return
    if (i === 2 && id === 'copy') setFlash('closure')
    else if (i === 2 && id === 'ref') setFlash('both')
    else if (i === 3 && id === 'dangle') setFlash('closure')
    else setFlash(null)
    const t = window.setTimeout(() => setFlash(null), 520)
    return () => window.clearTimeout(t)
  }, [i, playing, id])

  const code =
    id === 'copy'
      ? i < 2
        ? `int n = 7;\nauto f = [=]() mutable { ++n; };`
        : `f();  // closure n is 8, outer n is still 7`
      : id === 'ref'
        ? i < 2
          ? `int n = 7;\nauto f = [&] { ++n; };`
          : `f();  // write-through: outer n is 8`
        : id === 'dangle'
          ? i === 0
            ? `auto make() {\n  int n = 7;\n  return [&] { return n; };\n}`
            : i === 1
              ? `return [&] { return n; };  // weld to stack n`
              : i === 2
                ? `}  // n is destroyed. The alias is leftover.`
                : `auto f = make();\nf();  // dangling reference — UB`
          : i < 2
            ? `auto p = std::make_unique<int>(7);\nauto f = [p = std::move(p)] {\n  return *p;\n};`
            : `f();  // *p is 7. Original p is empty.`

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
              ? 'Green weld: no copy. The lambda is an alias for n. Cheap, and dangerous if you outlive n.'
              : id === 'ref' && i === 2
                ? 'Write-through: ++n updates the local. Same object, two names — just like T&.'
                : id === 'ref'
                  ? 'Keep [&] lambdas inside the scope of what they name. Return them and you dangle.'
                  : id === 'dangle' && i === 1
                    ? 'Green weld to stack n. Returning the lambda takes that alias out of the function.'
                    : id === 'dangle' && i === 2
                      ? 'make() returned. The frame is gone. n is destroyed. The capture still names that slot.'
                      : id === 'dangle'
                        ? 'f() reads a dead local. That is UB — not a stale copy, a hole in the stack. Capture by value, or a named [&n] you can audit.'
                        : i === 1
                          ? 'The unique_ptr member is initialized from std::move(p). Original p is empty. You cannot copy unique_ptr; you move it in.'
                          : i === 2
                            ? 'f() reads *p. The unique_ptr lives as long as the closure. That is how you ship ownership into a callback in C++14.'
                            : 'Init-capture is C++14. Use it when the member is not a copy of an existing name — move, or a computed value.'

  const tone = dangled ? 'trap' : frameGone ? 'warn' : stole && ran ? 'ok' : ran ? 'ok' : 'idle'

  const linkCls = dangled || frameGone ? 'fx-link--dead' : copied || stole ? 'fx-link--on' : welded ? 'fx-link--weld' : ''
  const playLabel =
    id === 'copy'
      ? 'Play [=] mutable'
      : id === 'ref'
        ? 'Play [&] write'
        : id === 'dangle'
          ? 'Play make() then f()'
          : 'Play init-capture'

  const localFlash = flash === 'local' || flash === 'both'
  const closureFlash = flash === 'closure' || flash === 'both'

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={() => {
        setFlash(null)
        play()
      }}
      onReset={() => {
        reset()
        setFlash(null)
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
      <div className="fx-sh">
        <div
          className={`fx-pane${captured && !frameGone ? ' fx-pane--focus' : ''}${
            frameGone ? ' fx-pane--gone' : ''
          }`}
        >
          <span className="fx-kicker">{id === 'dangle' ? 'make() frame' : id === 'init' ? 'unique_ptr' : 'local'}</span>
          <div
            className={`fx-slot${
              stole
                ? ' fx-slot--dim'
                : welded
                  ? ' fx-slot--weld'
                  : captured
                    ? ' fx-slot--focus'
                    : ' fx-slot--dim'
            }${localFlash ? ' fx-slot--flash-ref' : ''}${frameGone ? ' fx-pane--gone' : ''}`}
          >
            <span className="fx-kicker">{id === 'init' ? 'p' : 'n'}</span>
            <span className="fx-value">{outerVal}</span>
            <span className="fx-note">
              {frameGone ? 'destroyed' : stole ? 'moved-from' : id === 'ref' && ran ? 'written through' : 'outer'}
            </span>
          </div>
        </div>
        <div className={`fx-link${linkCls ? ` ${linkCls}` : ''}`} />
        <div className={`fx-pane${captured ? ' fx-pane--focus' : ''}${dangled ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">closure f</span>
          <div
            className={`fx-slot${
              dangled
                ? ' fx-slot--trap'
                : copied || stole
                  ? ' fx-slot--focus'
                  : welded
                    ? ' fx-slot--weld'
                    : ' fx-slot--dim'
            }${closureFlash ? (id === 'copy' ? ' fx-slot--flash' : id === 'dangle' ? '' : ' fx-slot--flash-ref') : ''}`}
          >
            <span className="fx-kicker">{id === 'init' ? 'p' : id === 'copy' ? 'n' : '&n'}</span>
            <span className="fx-value">{closureVal}</span>
            <span className="fx-note">
              {copied
                ? ran
                  ? 'mutated copy'
                  : 'copied member'
                : welded
                  ? 'alias'
                  : stole
                    ? ran
                      ? '*p is 7'
                      : 'init-capture'
                    : dangled
                      ? 'dangling'
                      : 'no capture yet'}
            </span>
            {copied && <span className="fx-badge">[=] mutable</span>}
            {stole && <span className="fx-badge fx-badge--owner">moved in</span>}
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          dangled ? 'fx-verdict--trap' : ran && id !== 'dangle' ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'copy' && ran
          ? '[=] copy · outer still 7'
          : id === 'ref' && ran
            ? '[&] weld · write-through'
            : dangled
              ? 'dangling [&] · UB'
              : id === 'dangle' && frameGone
                ? 'frame gone · alias leftover'
                : stole && ran
                  ? 'init-capture · C++14 steal'
                  : stole
                    ? 'unique_ptr moved into f'
                    : ''}
      </div>
    </SceneShell>
  )
}
