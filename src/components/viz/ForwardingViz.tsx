import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'lval' | 'prvalue' | 'xvalue' | 'move'

const MODES: { id: Mode; title: string }[] = [
  { id: 'lval', title: 'wrap(x)' },
  { id: 'prvalue', title: 'wrap(42)' },
  { id: 'xvalue', title: 'wrap(move(x))' },
  { id: 'move', title: 'std::move(t)' },
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
  const stealFwd = (id === 'prvalue' || id === 'xvalue') && collapsed
  const stealMove = id === 'move' && collapsed
  const steal = stealFwd || stealMove
  const trap = id === 'move' && forwarded

  const t = id === 'lval' || id === 'move' ? 'int&' : 'int'
  const collapsedTy = id === 'lval' || id === 'move' ? 'int&' : 'int&&'
  const fwdCast =
    id === 'move'
      ? 'static_cast<int&&>(t)'
      : id === 'lval'
        ? 'static_cast<int&>(t)'
        : 'static_cast<int&&>(t)'
  const callName = id === 'prvalue' ? '42' : id === 'xvalue' ? 'std::move(x)' : 'x'
  const cat = id === 'prvalue' ? 'prvalue' : id === 'xvalue' ? 'xvalue' : 'lvalue'

  const code =
    i === 0
      ? id === 'move'
        ? `template <typename T>
void wrap(T&& t) {
  sink(std::move(t));  // always rvalue
}`
        : `template <typename T>
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
          : id === 'xvalue'
            ? deduced && !forwarded
              ? `wrap(std::move(x));  // T = int
// xvalue matches the prvalue case`
              : `sink(std::forward<T>(t));  // xvalue, steal
// std::move(t) would also steal lvalues`
            : deduced && !forwarded
              ? `wrap(x);  // T = int&  (lvalue)
sink(std::move(t));`
              : `sink(std::move(t));  // steals x
// forward would have bound`

  const caption =
    i === 0
      ? id === 'lval'
        ? 'Play wrap(x). A deduced T&& is a forwarding reference. It is not “rvalue only.” Collapsing, then std::forward, is the whole lesson.'
        : id === 'prvalue'
          ? 'Play wrap(42). T is int. Without forward, named t is an lvalue and sink copies. Forward restores the rvalue.'
          : id === 'xvalue'
            ? 'Play wrap(move(x)). An xvalue deduces like a prvalue: T = int, parameter int&&. Forward, do not move, if you must pass through.'
            : 'Play move(t). std::move is always an rvalue cast. On a forwarding reference it steals even when the caller passed an lvalue.'
      : id === 'lval' && i === 1
        ? 'wrap(x) with x an lvalue. T is deduced as int&. The parameter is not “rvalue only.” void f(Widget&&); would not bind x.'
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
                  : id === 'xvalue' && i === 1
                    ? 'wrap(std::move(x)) is an xvalue. Deduction matches the prvalue case: T = int, parameter int&&.'
                    : id === 'xvalue' && i === 2
                      ? 'Same collapse as wrap(42). The name of t would still copy unless you restore the xvalue.'
                      : id === 'xvalue'
                        ? 'Forward again so the callee can steal. std::move(t) would also steal — even if the caller had passed an lvalue.'
                        : i === 1
                          ? 'Same deduction as wrap(x): T = int&. The wrapper still received an lvalue. move does not look at T.'
                          : i === 2
                            ? 'std::move(t) is static_cast<int&&>(t) regardless of T. The lvalue is now an xvalue. sink may steal.'
                            : 'x is empty. The caller did not ask to give it away. On a forwarding reference, write std::forward<T>(t).'

  const tone = trap ? 'trap' : steal && forwarded ? 'warn' : forwarded ? 'ok' : 'idle'
  const playLabel =
    id === 'lval'
      ? 'Play wrap(x)'
      : id === 'prvalue'
        ? 'Play wrap(42)'
        : id === 'xvalue'
          ? 'Play wrap(move(x))'
          : 'Play move(t)'

  const leftLink = deduced ? (trap ? 'fx-link--dead' : 'fx-link--on') : ''
  const rightLink = forwarded ? (trap ? 'fx-link--dead' : steal ? 'fx-link--on' : 'fx-link--weld') : collapsed ? 'fx-link--on' : ''

  const xVal = trap ? 'stolen' : id === 'prvalue' ? '42' : 'x'
  const sinkVal = forwarded ? (steal ? 'steal' : 'bind') : '—'

  const verdict =
    id === 'move' && forwarded
      ? 'move(t) stole the lvalue'
      : id === 'move' && collapsed
        ? 'move · always an rvalue cast'
        : id === 'lval' && collapsed
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
      <div className="fx-own">
        <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">call</span>
          <div className={`fx-slot${trap ? ' fx-slot--trap' : deduced ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{callName}</span>
            <span className="fx-value">{xVal}</span>
            <span className="fx-note">{trap ? 'caller did not give it away' : cat}</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${deduced ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">T&& t</span>
          <div
            className={`fx-slot${
              stealMove
                ? ' fx-slot--trap'
                : collapsed
                  ? steal
                    ? ' fx-slot--focus'
                    : ' fx-slot--weld'
                  : deduced
                    ? ' fx-slot--focus'
                    : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">T = {deduced ? t : '?'}</span>
            <span className="fx-value">{collapsed ? collapsedTy : 'T&&'}</span>
            <span className="fx-note">
              {id === 'move' && collapsed ? 'move ignores T' : collapsed ? 'named → still an lvalue' : 'collapses'}
            </span>
            {stealFwd && <span className="fx-badge fx-badge--owner">may steal</span>}
            {id === 'lval' && collapsed && <span className="fx-badge">no steal</span>}
            {stealMove && <span className="fx-badge fx-badge--owner">move always steals</span>}
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${forwarded ? ' fx-pane--focus' : ''}${trap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">sink</span>
          <div className={`fx-slot${trap ? ' fx-slot--trap' : forwarded ? (steal ? ' fx-slot--focus' : ' fx-slot--ok') : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{id === 'move' ? 'sink(move(t))' : 'sink(…)'}</span>
            <span className="fx-value">{sinkVal}</span>
            <span className="fx-note">{forwarded ? fwdCast : 'waiting'}</span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : steal && forwarded ? 'fx-verdict--warn' : forwarded || collapsed ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
