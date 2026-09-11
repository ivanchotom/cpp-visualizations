import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'fp' | 'mem' | 'fun' | 'cap'

const MODES: { id: Mode; title: string }[] = [
  { id: 'fp', title: 'function ptr' },
  { id: 'mem', title: 'member ptr' },
  { id: 'fun', title: 'std::function' },
  { id: 'cap', title: 'stored [&]' },
]

export function FnPtrViz() {
  const [id, setId] = useState<Mode>('fp')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stored = i >= 1
  const called = i >= 2
  const recovered = i >= 3
  const bounce = id === 'mem' && i === 2
  const emptyThrow = id === 'fun' && i === 2
  const dangled = id === 'cap' && i >= 2
  const won = id === 'fp' && called
  const memOk = id === 'mem' && recovered
  const funOk = id === 'fun' && recovered

  const code =
    id === 'fp'
      ? i < 2
        ? `int add(int a, int b) { return a + b; }
int (*fp)(int, int) = add;   // & optional`
        : `int s = fp(1, 2);   // 3
// a captureless lambda also converts
// to a function pointer`
      : id === 'mem'
        ? i < 2
          ? `struct W { int n; int get() const { return n; } };
int (W::*pm)() const = &W::get;`
          : i === 2
            ? `pm();                 // ill-formed
// there is no this`
            : `W w{7};
int g = (w.*pm)();    // 7
int h = ((&w)->*pm)();`
        : id === 'fun'
          ? i < 2
            ? `std::function<int(int, int)> f;
// empty — no target`
            : i === 2
              ? `f();   // throws std::bad_function_call`
              : `f = add;
int s = f(1, 2);  // 3
if (f) { /* has a target */ }`
          : i < 2
            ? `std::function<int()> f;
{
  int n = 7;
  f = [&] { return n; };
}`
            : `f();   // n is gone — dangling capture
// capture [n] by value, or do not
// store a lambda that outlives the frame`

  const caption =
    i === 0
      ? id === 'fp'
        ? 'Play fp. A function pointer stores the address of a function with that signature. Functions decay to pointers; & is optional. Captureless lambdas convert too.'
        : id === 'mem'
          ? 'Play member. Pointers to members are a different, fat type. They need an object: (obj.*pm)() or (ptr->*pm)(). They do not convert to free function pointers.'
          : id === 'fun'
            ? 'Play empty f(). std::function<Sig> type-erases any callable matching Sig. Empty function throws std::bad_function_call. Prefer a template parameter when you can inline.'
            : 'Play stored [&]. Storing a lambda that captured locals into a std::function that outlives them is a dangling reference. Same class of bug as returning [&] from a function.'
      : id === 'fp' && i === 1
        ? 'fp holds &add. The pointer is just an address. No object, no captures. The call is an indirect jump. C++14 has no std::invoke — the syntax is fp(1, 2).'
        : id === 'fp' && i === 2
          ? 'fp(1, 2) returns 3. A captureless lambda converts to this same pointer type. Mixed lambdas with state need std::function (or a hand-rolled vtable).'
          : id === 'fp'
            ? 'Use a function pointer when the set of targets is known and you must store one type. A template Callable parameter would have inlined add.'
            : id === 'mem' && i === 1
              ? 'pm holds &W::get. This is not a void* and not a free function pointer. It still needs a W to apply to.'
              : id === 'mem' && i === 2
                ? 'pm() is ill-formed. There is no this. (w.*pm)() is the call. std::mem_fn(pm) makes a callable that takes W& as the first argument.'
                : id === 'mem'
                  ? '(w.*pm)() is 7. A pointer-to-member cannot be assigned to a free function pointer. The types do not convert.'
                  : id === 'fun' && i === 1
                    ? 'std::function f; starts empty. operator bool is false. The type can later hold add, a lambda, or a bind-expression — possibly on the heap.'
                    : id === 'fun' && i === 2
                      ? 'f() throws std::bad_function_call. Assign a target first. Check if (f) when the empty state is part of your protocol.'
                      : id === 'fun'
                        ? 'f = add, then f(1, 2) is 3. A template <class F> void call(F f) inlines. std::function is for when you must store mixed callables in one type.'
                        : i === 1
                          ? '[&] captures n by reference. The std::function now holds a callable that refers to a stack slot.'
                          : i === 2
                            ? 'The frame is gone. f() reads a dangling n. UB. Capture [n] by value, or keep the std::function inside the same scope as n.'
                            : 'This is the same lesson as a lambda returned from a function with [&]. std::function does not extend the lifetime of captures.'

  const tone = bounce || emptyThrow || dangled ? 'trap' : won || memOk || funOk ? 'ok' : 'idle'
  const playLabel =
    id === 'fp'
      ? 'Play fp(1, 2)'
      : id === 'mem'
        ? 'Play pm() then .*'
        : id === 'fun'
          ? 'Play empty f()'
          : 'Play stored [&]'

  const verdict =
    id === 'fp' && won
      ? 'fp(1, 2) · 3'
      : bounce
        ? 'pm() ill-formed · needs W'
        : memOk
          ? '(w.*pm)() · 7'
          : emptyThrow
            ? 'empty · bad_function_call'
            : funOk
              ? 'f = add · f(1, 2) is 3'
              : dangled
                ? 'stored [&] · UB'
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
      {id === 'fp' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stored ? ' fx-rank--on' : ''}${won ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">store</span>
            <code>fp = add</code>
            <span className="fx-note">{stored ? '&add' : '—'}</span>
          </div>
          <div className={`fx-rank${won ? ' fx-rank--on' : ''}`}>
            <span className="fx-note">call</span>
            <code>fp(1, 2)</code>
            <span className="fx-note">{won ? '3' : '—'}</span>
          </div>
          <div className="fx-buf-row">
            <span className={`fx-letter${won ? ' fx-letter--on' : ' fx-letter--empty'}`}>{won ? '3' : '·'}</span>
          </div>
        </div>
      )}
      {id === 'mem' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stored ? ' fx-rank--on' : ''}${bounce ? ' fx-rank--trap' : memOk ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">pm()</span>
            <code>no this</code>
            <span className="fx-note">{bounce || memOk ? 'ill' : stored ? 'pm' : '—'}</span>
          </div>
          <div className={`fx-rank${memOk ? ' fx-rank--on' : bounce ? ' fx-rank--trap' : ''}`}>
            <span className="fx-note">w.*pm</span>
            <code>(w.*pm)()</code>
            <span className="fx-note">{memOk ? '7' : bounce ? 'need W' : '—'}</span>
          </div>
          <div className="fx-buf-row">
            <span className={`fx-letter${memOk ? ' fx-letter--on' : bounce ? ' fx-letter--junk' : ' fx-letter--empty'}`}>
              {memOk ? '7' : bounce ? '?' : '·'}
            </span>
          </div>
        </div>
      )}
      {id === 'fun' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stored ? ' fx-rank--on' : ''}${emptyThrow ? ' fx-rank--trap' : funOk ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">empty</span>
            <code>f()</code>
            <span className="fx-note">{emptyThrow || funOk ? 'throw' : stored ? 'no tgt' : '—'}</span>
          </div>
          <div className={`fx-rank${funOk ? ' fx-rank--on' : emptyThrow ? ' fx-rank--trap' : ''}`}>
            <span className="fx-note">assign</span>
            <code>f = add</code>
            <span className="fx-note">{funOk ? '3' : '—'}</span>
          </div>
          <div className="fx-buf-row">
            <span className={`fx-letter${funOk ? ' fx-letter--on' : emptyThrow ? ' fx-letter--junk' : ' fx-letter--empty'}`}>
              {funOk ? '3' : emptyThrow ? '?' : '·'}
            </span>
          </div>
        </div>
      )}
      {id === 'cap' && (
        <div className="fx-sh">
          <div className={`fx-pane${stored && !dangled ? ' fx-pane--focus' : ''}${dangled ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">frame</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${dangled ? ' fx-letter--dead' : stored ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                {dangled ? '·' : stored ? '7' : '·'}
              </span>
            </div>
            <span className="fx-note">{dangled ? 'n destroyed' : 'int n'}</span>
          </div>
          <div className={`fx-link${dangled ? ' fx-link--dead' : stored ? ' fx-link--weld' : ''}`} />
          <div className={`fx-pane${called ? ' fx-pane--focus' : ''}${dangled ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">f</span>
            <div className={`fx-slot${dangled ? ' fx-slot--trap' : stored ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">[&]</span>
              <span className="fx-value">{dangled ? 'UB' : stored ? 'ref' : '—'}</span>
              <span className="fx-note">{dangled ? 'capture outlived n' : 'std::function holds it'}</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          bounce || emptyThrow || dangled ? 'fx-verdict--trap' : won || memOk || funOk ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
