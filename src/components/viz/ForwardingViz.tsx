import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'lval' | 'prvalue' | 'xvalue'

const MODES: { id: Mode; title: string }[] = [
  { id: 'lval', title: 'wrap(x)' },
  { id: 'prvalue', title: 'wrap(42)' },
  { id: 'xvalue', title: 'wrap(move(x))' },
]

export function ForwardingViz() {
  const [id, setId] = useState<Mode>('lval')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const deduced = i >= 1
  const collapsed = i >= 2
  const forwarded = i >= 3
  const steal = id !== 'lval' && collapsed

  const t = id === 'lval' ? 'int&' : 'int'
  const collapsedTy = id === 'lval' ? 'int&' : 'int&&'
  const fwdCast = id === 'lval' ? 'static_cast<int&>(t)' : 'static_cast<int&&>(t)'
  const callName = id === 'lval' ? 'x' : id === 'prvalue' ? '42' : 'std::move(x)'
  const cat = id === 'lval' ? 'lvalue' : id === 'prvalue' ? 'prvalue' : 'xvalue'

  const code =
    i === 0
      ? `template <typename T>
void wrap(T&& t) {
  sink(std::forward<T>(t));
}`
      : id === 'lval'
        ? deduced && !forwarded
          ? `wrap(x);  // T = int&
// int& &&  →  int&`
          : `sink(std::forward<T>(t));  // lvalue
// named t is still an lvalue`
        : id === 'prvalue'
          ? deduced && !forwarded
            ? `wrap(42);  // T = int
// int &&  →  int&&`
            : `sink(std::forward<T>(t));  // rvalue
// without forward, named t copies`
          : deduced && !forwarded
            ? `wrap(std::move(x));  // T = int
// xvalue matches the prvalue case`
            : `sink(std::forward<T>(t));  // xvalue, steal
// std::move(t) would also steal lvalues`

  const caption =
    i === 0
      ? 'Play wrap. A deduced T&& is a forwarding reference. It is not “rvalue only.” Collapsing, then std::forward, is the whole lesson.'
      : id === 'lval' && i === 1
        ? 'wrap(x) with x an lvalue. T is deduced as int&. The parameter is not “rvalue only.”'
        : id === 'lval' && i === 2
          ? 'T&& collapses: int& && → int&. t is a named parameter, so it is still an lvalue.'
          : id === 'lval'
            ? 'std::forward<int&>(t) is an lvalue cast — sink does not steal. std::move(t) would have stolen even this lvalue.'
            : id === 'prvalue' && i === 1
              ? 'wrap(42). T is int. T&& is int&&. The parameter still has a name — without forward it would copy.'
              : id === 'prvalue' && i === 2
                ? 'Collapse is identity here: int && → int&&. Named t is still an lvalue until you forward.'
                : id === 'prvalue'
                  ? 'std::forward<int>(t) is static_cast<int&&>(t). sink may steal. That is why wrappers must forward, not move.'
                  : i === 1
                    ? 'wrap(std::move(x)) is an xvalue. Deduction matches the prvalue case: T = int, parameter int&&.'
                    : i === 2
                      ? 'Same collapse as wrap(42). The name of t would still copy unless you restore the xvalue.'
                      : 'Forward again so the callee can steal. std::move(t) would also steal — even if the caller had passed an lvalue.'

  const tone = steal && forwarded ? 'warn' : forwarded ? 'ok' : 'idle'
  const playLabel =
    id === 'lval' ? 'Play wrap(x)' : id === 'prvalue' ? 'Play wrap(42)' : 'Play wrap(move(x))'

  const leftLink = deduced ? 'fx-link--on' : ''
  const rightLink = forwarded ? (steal ? 'fx-link--on' : 'fx-link--weld') : collapsed ? 'fx-link--on' : ''

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
      sig={id === 'lval' ? 'wrap(x)' : id === 'prvalue' ? 'wrap(42)' : 'wrap(std::move(x))'}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-own">
        <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">call</span>
          <div className={`fx-slot${deduced ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{callName}</span>
            <span className="fx-value">{id === 'prvalue' ? '42' : 'x'}</span>
            <span className="fx-note">{cat}</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">T&& t</span>
          <div className={`fx-slot${collapsed ? (steal ? ' fx-slot--focus' : ' fx-slot--weld') : deduced ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">T = {deduced ? t : '?'}</span>
            <span className="fx-value">{collapsed ? collapsedTy : 'T&&'}</span>
            <span className="fx-note">{collapsed ? 'named → still an lvalue' : 'collapses'}</span>
            {steal && <span className="fx-badge fx-badge--owner">may steal</span>}
            {id === 'lval' && collapsed && <span className="fx-badge">no steal</span>}
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${forwarded ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">sink</span>
          <div className={`fx-slot${forwarded ? (steal ? ' fx-slot--focus' : ' fx-slot--ok') : ' fx-slot--dim'}`}>
            <span className="fx-kicker">sink(…)</span>
            <span className="fx-value">{forwarded ? (steal ? 'steal' : 'bind') : '—'}</span>
            <span className="fx-note">{forwarded ? fwdCast : 'waiting'}</span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          steal && forwarded ? 'fx-verdict--warn' : forwarded || collapsed ? 'fx-verdict--ok' : ''
        }`}
      >
        {id === 'lval' && collapsed
          ? forwarded
            ? 'forward lvalue · no steal'
            : 'T = int& · int& && → int&'
          : id === 'prvalue' && collapsed
            ? forwarded
              ? 'forward rvalue · sink may steal'
              : 'T = int · int&&'
            : id === 'xvalue' && collapsed
              ? forwarded
                ? 'xvalue · forward, do not move'
                : 'T = int · int&&'
              : deduced
                ? `T = ${t}`
                : ''}
      </div>
    </SceneShell>
  )
}
