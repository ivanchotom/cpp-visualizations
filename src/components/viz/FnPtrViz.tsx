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

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const bounce = id === 'mem' && decided
  const emptyThrow = id === 'fun' && decided
  const dangled = id === 'cap' && decided
  const trap = bounce || emptyThrow || dangled
  const ok = (id === 'fp' && recap) || (id === 'mem' && recap) || (id === 'fun' && recap)

  const code =
    id === 'fp'
      ? recap
        ? `int s = fp(1, 2);   // 3
// a captureless lambda also converts
// C++14: no std::invoke — write fp(1, 2)`
        : `int add(int a, int b) { return a + b; }
int (*fp)(int, int) = add;   // & optional`
      : id === 'mem'
        ? recap
          ? `W w{7};
int g = (w.*pm)();    // 7
// pm();              // ill-formed`
          : `struct W { int n; int get() const { return n; } };
int (W::*pm)() const = &W::get;
pm();                 // ill-formed`
        : id === 'fun'
          ? recap
            ? `f = add;
int s = f(1, 2);  // 3
if (f) { /* has a target */ }`
            : `std::function<int(int, int)> f;
// empty — no target
f();   // throws std::bad_function_call`
          : recap
            ? `f();   // n is gone — dangling capture
// capture [n] by value, or do not
// store a lambda that outlives the frame`
            : `std::function<int()> f;
{
  int n = 7;
  f = [&] { return n; };
}`

  const caption =
    i === 0
      ? id === 'fp'
        ? 'Play fp(1, 2). A function pointer stores the address of a function with that signature. Functions decay to pointers; & is optional. Captureless lambdas convert too.'
        : id === 'mem'
          ? 'Play pm() then .*. Pointers to members are a different, fat type. They need an object: (obj.*pm)() or (ptr->*pm)(). They do not convert to free function pointers.'
          : id === 'fun'
            ? 'Play empty f(). std::function<Sig> type-erases any callable matching Sig. Empty function throws std::bad_function_call. Prefer a template parameter when you can inline.'
            : 'Play stored [&]. Storing a lambda that captured locals into a std::function that outlives them is a dangling reference. Same class of bug as returning [&] from a function.'
      : id === 'fp' && i === 1
        ? 'fp holds &add. The pointer is just an address. No object, no captures. The call is an indirect jump. C++14 has no std::invoke — the syntax is fp(1, 2). Stations light in place.'
        : id === 'fp' && i === 2
          ? 'fp(1, 2) returns 3. A captureless lambda converts to this same pointer type. Mixed lambdas with state need std::function (or a hand-rolled vtable).'
          : id === 'fp'
            ? 'Use a function pointer when the set of targets is known and you must store one type. A template Callable parameter would have inlined add.'
            : id === 'mem' && i === 1
              ? 'pm holds &W::get. This is not a void* and not a free function pointer. It still needs a W to apply to.'
              : id === 'mem' && i === 2
                ? 'pm() is ill-formed. There is no this. (w.*pm)() is the call. std::mem_fn(pm) makes a callable that takes W& as the first argument.'
                : id === 'mem'
                  ? '(w.*pm)() is 7. A pointer-to-member cannot be assigned to a free function pointer. The types do not convert. Recap keeps pm() ill.'
                  : id === 'fun' && i === 1
                    ? 'std::function f; starts empty. operator bool is false. The type can later hold add, a lambda, or a bind-expression — possibly on the heap.'
                    : id === 'fun' && i === 2
                      ? 'f() throws std::bad_function_call. Assign a target first. Check if (f) when the empty state is part of your protocol.'
                      : id === 'fun'
                        ? 'f = add, then f(1, 2) is 3. A template <class F> void call(F f) inlines. std::function is for when you must store mixed callables in one type.'
                        : i === 1
                          ? '[&] captures n by reference. The std::function now holds a callable that refers to a stack slot. n is 7 while the frame lives.'
                          : i === 2
                            ? 'The frame is gone. f() reads a dangling n. UB. Capture [n] by value, or keep the std::function inside the same scope as n.'
                            : 'This is the same lesson as a lambda returned from a function with [&]. std::function does not extend the lifetime of captures.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'fp'
      ? 'Play fp(1, 2)'
      : id === 'mem'
        ? 'Play pm() then .*'
        : id === 'fun'
          ? 'Play empty f()'
          : 'Play stored [&]'

  const verdict =
    id === 'fp' && recap
      ? 'fp(1, 2) · 3'
      : id === 'fp' && decided
        ? 'call · 3'
        : id === 'fp' && stepped
          ? 'fp · &add'
          : id === 'mem' && recap
            ? '(w.*pm)() · 7'
            : bounce
              ? 'pm() · ill'
              : id === 'mem' && stepped
                ? 'pm · &W::get'
                : id === 'fun' && recap
                  ? 'f = add · 3'
                  : emptyThrow
                    ? 'empty · throw'
                    : id === 'fun' && stepped
                      ? 'f · no tgt'
                      : dangled && recap
                        ? 'stored [&] · UB'
                        : dangled
                          ? 'n gone · UB'
                          : id === 'cap' && stepped
                            ? 'n · 7'
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
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>fp</code>
            <span className="fx-note">store</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>s</code>
            <span className="fx-note">call</span>
            <span className="fx-note">{decided ? '3' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'mem' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${bounce ? ' fx-rank--trap' : ''}`}>
            <code>pm</code>
            <span className="fx-note">pm()</span>
            <span className="fx-note">{bounce ? 'ill' : stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : bounce ? ' fx-rank--on' : ''}`}>
            <code>w</code>
            <span className="fx-note">w.*pm</span>
            <span className="fx-note">{recap ? '7' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'fun' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${emptyThrow ? ' fx-rank--trap' : ''}`}>
            <code>f</code>
            <span className="fx-note">empty</span>
            <span className="fx-note">{emptyThrow ? 'throw' : stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : emptyThrow ? ' fx-rank--on' : ''}`}>
            <code>s</code>
            <span className="fx-note">f = add</span>
            <span className="fx-note">{recap ? '3' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cap' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${dangled ? ' fx-rank--trap' : ''}`}>
            <code>n</code>
            <span className="fx-note">frame</span>
            <span className="fx-note">{dangled ? 'gone' : stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${dangled ? ' fx-rank--trap' : stepped ? ' fx-rank--on' : ''}`}>
            <code>f</code>
            <span className="fx-note">[&]</span>
            <span className="fx-note">{dangled ? 'ub' : stepped ? 'ref' : '—'}</span>
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
