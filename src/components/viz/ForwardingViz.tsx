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
        ? 'wrap(x) with x an lvalue. T is deduced as int&. The parameter is not “rvalue only.” void f(Widget&&); would not bind x. Stations light in place.'
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
      {id === 'lval' && (
        <div className="fx-ladder">
          <div className={`fx-rank${deduced ? ' fx-rank--on' : ''}${forwarded ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">lv</span>
            <span className="fx-note">{deduced ? 'T&' : '—'}</span>
          </div>
          <div className={`fx-rank${collapsed ? ' fx-rank--on' : ''}${forwarded ? ' fx-rank--done' : ''}`}>
            <code>fw</code>
            <span className="fx-note">cl</span>
            <span className="fx-note">{forwarded ? 'ok' : collapsed ? 'T&' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'prvalue' && (
        <div className="fx-ladder">
          <div className={`fx-rank${deduced ? ' fx-rank--on' : ''}${forwarded ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">42</span>
            <span className="fx-note">{deduced ? 'in' : '—'}</span>
          </div>
          <div className={`fx-rank${collapsed ? ' fx-rank--on' : ''}${forwarded ? ' fx-rank--done' : ''}`}>
            <code>sk</code>
            <span className="fx-note">fw</span>
            <span className="fx-note">{forwarded ? 'ok' : collapsed ? '&&' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'xvalue' && (
        <div className="fx-ladder">
          <div className={`fx-rank${deduced ? ' fx-rank--on' : ''}${forwarded ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{deduced ? 'in' : '—'}</span>
          </div>
          <div className={`fx-rank${collapsed ? ' fx-rank--on' : ''}${forwarded ? ' fx-rank--done' : ''}`}>
            <code>fw</code>
            <span className="fx-note">xv</span>
            <span className="fx-note">{forwarded ? 'ow' : collapsed ? '&&' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'move' && (
        <div className="fx-ladder">
          <div className={`fx-rank${deduced ? ' fx-rank--on' : ''}${trap ? ' fx-rank--trap' : ''}`}>
            <code>x</code>
            <span className="fx-note">lv</span>
            <span className="fx-note">{trap ? 'gn' : deduced ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${collapsed ? ' fx-rank--on' : ''}${trap ? ' fx-rank--trap' : ''}`}>
            <code>sk</code>
            <span className="fx-note">mv</span>
            <span className="fx-note">{trap ? 'ow' : collapsed ? '&&' : '—'}</span>
          </div>
        </div>
      )}
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
