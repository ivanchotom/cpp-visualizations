import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hop, waitNextBeat, type Point } from './motion.ts'

type Mode = 'include' | 'sqr' | 'parens' | 'guard'

const MODES: { id: Mode; title: string; sig: string }[] = [
  { id: 'include', title: '#include', sig: '#include "math.hpp"' },
  { id: 'sqr', title: 'SQR(++i)', sig: 'SQR(x) ((x)*(x))' },
  { id: 'parens', title: 'DOUBLE', sig: 'DOUBLE(x) x+x' },
  { id: 'guard', title: 'guard', sig: '#pragma once' },
]

const STEP_MS = 1300
const HOP_MS = 700

export function PreprocessorViz() {
  const [id, setId] = useState<Mode>('include')
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hopT, setHopT] = useState(1)
  const [from, setFrom] = useState<Point>({ x: 80, y: 90 })
  const [to, setTo] = useState<Point>({ x: 360, y: 90 })

  const stageRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const dstRef = useRef<HTMLDivElement>(null)

  const stepCount = 4
  const pasted = (id === 'include' || id === 'guard') && i >= 1
  const bounced = id === 'guard' && i >= 3
  const iVal = id === 'sqr' ? (i === 0 ? 2 : i === 1 ? 3 : 4) : 0
  const prod = id === 'sqr' && i >= 3 ? 12 : id === 'sqr' && i === 2 ? '3×?' : id === 'sqr' && i === 1 ? '3×?' : null
  const expr =
    id === 'parens'
      ? i === 0
        ? '2*DOUBLE(3)'
        : i === 1
          ? '2*x+x'
          : i === 2
            ? '2*3+3'
            : '9'
      : ''

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !srcRef.current || !dstRef.current) return
    const origin = stage.getBoundingClientRect()
    const a = srcRef.current.getBoundingClientRect()
    const b = dstRef.current.getBoundingClientRect()
    setFrom({ x: a.left - origin.left + a.width / 2, y: a.top - origin.top + a.height / 2 })
    setTo({ x: b.left - origin.left + b.width / 2, y: b.top - origin.top + b.height / 2 })
  }, [id, i])

  useEffect(() => {
    if (!playing) return
    const hopBorn = performance.now()
    let raf = 0
    const hopLoop = (now: number) => {
      setHopT(Math.min(1, (now - hopBorn) / HOP_MS))
      if (now - hopBorn < HOP_MS) raf = requestAnimationFrame(hopLoop)
    }
    raf = requestAnimationFrame(hopLoop)
    const stopBeat = waitNextBeat(STEP_MS, () => {
      if (i >= stepCount - 1) {
        setPlaying(false)
        setHopT(1)
        return
      }
      setI(i + 1)
      setHopT(0)
    })
    return () => {
      cancelAnimationFrame(raf)
      stopBeat()
    }
  }, [playing, i, stepCount])

  function select(next: Mode) {
    setPlaying(false)
    setId(next)
    setI(0)
    setHopT(1)
  }

  function play() {
    setI(0)
    setHopT(0)
    setPlaying(true)
  }

  const pos = hopT < 1 && i >= 1 ? hop(from, to, hopT) : null
  const flyerText =
    id === 'include'
      ? 'paste'
      : id === 'guard'
        ? bounced
          ? 'skip'
          : 'paste'
        : id === 'sqr'
          ? i === 1
            ? '++i'
            : i === 2
              ? '++i'
              : '3×4'
          : i < 3
            ? 'expand'
            : '9 ≠ 12'

  const code =
    id === 'include'
      ? i === 0
        ? `// math.hpp\nint add(int, int);\n\n// main.cpp\n#include "math.hpp"`
        : i < 3
          ? `// after preprocess, one text stream\nint add(int, int);`
          : `int add(int, int);\n// the compiler never saw #include`
      : id === 'sqr'
        ? i === 0
          ? `#define SQR(x) ((x)*(x))\nint i = 2;\nSQR(++i);`
          : i === 1
            ? `((++i)*(x))  // first x already ++i`
            : i === 2
              ? `((++i)*(++i))  // second x also ++i`
              : `// i is 4, product is 12\n// not 3*3. Arguments evaluated twice.`
        : id === 'parens'
          ? i === 0
            ? `#define DOUBLE(x) x+x\n2 * DOUBLE(3);`
            : i === 1
              ? `2 * x+x     // no extra parens`
              : i === 2
                ? `2 * 3 + 3`
                : `// 9, not 12. Write ((x)+(x)).`
          : i === 0
            ? `// math.hpp\n#pragma once\nint add(int, int);`
            : i === 1
              ? `#include "math.hpp"  // first paste`
              : i === 2
                ? `#include "math.hpp"  // again`
                : `// second paste skipped. One definition.`

  const caption =
    i === 0
      ? id === 'include'
        ? 'Play include. The preprocessor is a text engine: it pastes files before the compiler type-checks anything.'
        : id === 'sqr'
          ? 'Play SQR(++i). Function-like macros have no types and no “call once.” Each x in the replacement is a fresh paste of the argument.'
          : id === 'parens'
            ? 'Play DOUBLE. Missing parentheses in the replacement list is a precedence trap, not a type error.'
            : 'Play the guard. #pragma once (or #ifndef/#define/#endif) stops a header from being pasted twice into one TU.'
      : id === 'include' && i === 1
        ? 'Tokens hop from the header into the translation unit. Quotes search locally first; angle brackets search the include path.'
        : id === 'include' && i === 2
          ? 'The TU is now one stream of text. #include is gone. Missing a semicolon in the header fails here, in this file’s compile.'
          : id === 'include'
            ? 'Prefer the language over macros: constexpr, inline, templates. The preprocessor has no scope and no namespaces.'
            : id === 'sqr' && i === 1
              ? 'First replacement of x is ++i. i becomes 3. The macro cannot “bind” the argument; it only pastes tokens.'
              : id === 'sqr' && i === 2
                ? 'Second x is another ++i. i becomes 4. SQR(++i) is ((++i)*(++i)) — unsequenced-ish chaos, and not 9.'
                : id === 'sqr'
                  ? '3×4 = 12. A constexpr function would evaluate ++i once. That is why macros are the last resort, not the first.'
                  : id === 'parens' && i === 1
                    ? 'DOUBLE(3) is x+x. The call was 2*DOUBLE(3), so you get 2*x+x. * still binds tighter than +.'
                    : id === 'parens' && i === 2
                      ? '2*3+3. The 2 only multiplies the first 3. Parenthesize the replacement: ((x)+(x)).'
                      : id === 'parens'
                        ? 'Result 9, not 12. The compiler never saw a function named DOUBLE. It saw tokens. Prefer an inline function.'
                        : i === 1
                          ? 'First include pastes the header. The guard macro (or #pragma once) is now set for this TU.'
                          : i === 2
                            ? 'Second #include of the same header arrives. Without a guard this would duplicate declarations — or definitions.'
                            : 'Bounced. One paste per TU. That is all a guard does. It does not stop ODR issues across TUs.'

  const m = MODES.find((x) => x.id === id) ?? MODES[0]
  const trap = (id === 'sqr' && i >= 3) || (id === 'parens' && i >= 3)
  const stageKind = trap ? 'pp-stage--trap' : bounced ? 'pp-stage--guard' : ''

  return (
    <div className="viz viz--col">
      <div className="stepper">
        {MODES.map((x) => (
          <button
            key={x.id}
            className={`chip${id === x.id ? ' chip--active' : ''}`}
            onClick={() => select(x.id)}
            disabled={playing}
          >
            {x.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={play} disabled={playing}>
          Play expand
        </button>
        <button className="chip chip--ghost" onClick={() => select(id)}>
          reset
        </button>
      </div>

      <div ref={stageRef} className={`viz-stage pp-stage viz-stage--live ${stageKind}`}>
        <p className="ptr-hint-top">
          Step {i + 1}/{stepCount} · <code>{m.sig}</code>
        </p>
        <div className="pp-row">
          <div ref={srcRef} className={`own-card${i >= 1 ? ' own-card--unique' : ''}`}>
            <span className="lf-tag">{id === 'include' || id === 'guard' ? 'header' : 'argument'}</span>
            {id === 'include' || id === 'guard' ? (
              <>
                <span className="own-name">math.hpp</span>
                <span className="mem-val">int add(int,int);</span>
                {id === 'guard' && <span className="mem-note">#pragma once</span>}
              </>
            ) : id === 'sqr' ? (
              <>
                <span className="own-name">i</span>
                <span className="mem-val">{iVal}</span>
                <span className="mem-note">{i === 0 ? 'before expand' : '++ already applied'}</span>
              </>
            ) : (
              <>
                <span className="own-name">x</span>
                <span className="mem-val">3</span>
                <span className="mem-note">#define DOUBLE(x) x+x</span>
              </>
            )}
          </div>
          <div
            ref={dstRef}
            className={`own-card${pasted && !bounced ? ' own-card--shared' : ''}${trap ? ' nd-card--ub' : ''}${bounced ? ' own-ctrl--ghost' : ''}`}
          >
            <span className="lf-tag">{id === 'include' || id === 'guard' ? 'translation unit' : 'replacement'}</span>
            {id === 'include' || id === 'guard' ? (
              <>
                <span className="own-name">{bounced ? 'already in' : pasted ? 'pasted' : 'main.cpp'}</span>
                <span className="mem-val">{pasted && !bounced ? 'int add(int,int);' : bounced ? 'skip' : '#include …'}</span>
                <span className="mem-note">{bounced ? 'guard held' : pasted ? 'text, not a type' : 'waiting'}</span>
              </>
            ) : id === 'sqr' ? (
              <>
                <span className="own-name">{i === 0 ? 'SQR(++i)' : '((x)*(x))'}</span>
                <span className="mem-val">{prod ?? '—'}</span>
                <span className="mem-note">{i >= 3 ? 'twice, not once' : 'each x is a paste'}</span>
              </>
            ) : (
              <>
                <span className="own-name">{expr}</span>
                <span className="mem-val">{i >= 3 ? '9' : '—'}</span>
                <span className="mem-note">{i >= 3 ? '* then +' : 'tokens only'}</span>
              </>
            )}
          </div>
        </div>
        {pos && (
          <span className={`ptr-pulse pp-flyer${trap || bounced ? ' pp-flyer--trap' : ''}`} style={{ left: pos.x, top: pos.y }}>
            {flyerText}
          </span>
        )}
      </div>

      <pre className="code-block sh-code">
        <code>{code}</code>
      </pre>
      <p className="layout-hint">{caption}</p>
    </div>
  )
}
