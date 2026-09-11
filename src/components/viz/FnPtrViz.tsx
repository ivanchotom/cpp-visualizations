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
  const frameGone = id === 'cap' && i >= 2
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

  const leftLink = !stored
    ? ''
    : dangled || (id === 'mem' && called && !memOk)
      ? 'fx-link--dead'
      : 'fx-link--on'
  const rightLink = dangled
    ? 'fx-link--dead'
    : bounce || emptyThrow
      ? 'fx-link--dead'
      : won || memOk || funOk
        ? 'fx-link--weld'
        : called
          ? 'fx-link--on'
          : ''

  const playLabel =
    id === 'fp'
      ? 'Play fp(1, 2)'
      : id === 'mem'
        ? 'Play pm() then .*'
        : id === 'fun'
          ? 'Play empty f()'
          : 'Play stored [&]'

  const inName = id === 'fp' ? 'add' : id === 'mem' ? 'W::get' : id === 'fun' ? 'no target' : 'n'
  const inVal =
    id === 'fp'
      ? '(int,int)'
      : id === 'mem'
        ? 'needs W'
        : id === 'fun'
          ? '—'
          : frameGone
            ? 'gone'
            : '7'
  const storeName = id === 'fp' ? 'fp' : id === 'mem' ? 'pm' : 'f'
  const storeVal =
    id === 'fp' && stored
      ? '&add'
      : id === 'mem' && stored
        ? '&W::get'
        : id === 'fun' && funOk
          ? 'add'
          : id === 'fun' && stored
            ? 'empty'
            : id === 'cap' && stored
              ? 'holds [&]'
              : '—'
  const outName = id === 'fp' ? 'fp(1, 2)' : id === 'mem' ? (memOk ? '(w.*pm)()' : 'pm()') : 'f()'
  const outVal =
    won || funOk
      ? '3'
      : bounce
        ? 'ill-formed'
        : emptyThrow
          ? 'throw'
          : dangled
            ? 'UB'
            : memOk
              ? '7'
              : '—'

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
        <div className={`fx-pane${stored && !frameGone ? ' fx-pane--focus' : ''}${frameGone ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">{id === 'cap' ? 'frame' : 'callable'}</span>
          <div className={`fx-slot${stored && !frameGone ? ' fx-slot--focus' : ' fx-slot--dim'}${frameGone ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">{frameGone ? 'destroyed' : id === 'fun' ? 'assign first' : 'source'}</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stored ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">store</span>
          <div
            className={`fx-slot${
              dangled || emptyThrow
                ? ' fx-slot--trap'
                : stored
                  ? id === 'fp' || memOk || funOk
                    ? ' fx-slot--focus'
                    : ' fx-slot--focus'
                  : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{storeName}</span>
            <span className="fx-value">{storeVal}</span>
            <span className="fx-note">
              {id === 'fp'
                ? '& optional'
                : id === 'mem'
                  ? 'not a fp'
                  : id === 'fun'
                    ? funOk
                      ? 'has a target'
                      : 'type erasure'
                    : stored
                      ? 'outlives n?'
                      : '—'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${called ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">call</span>
          <div
            className={`fx-slot${
              bounce || emptyThrow || dangled
                ? ' fx-slot--trap'
                : won || memOk || funOk
                  ? ' fx-slot--ok'
                  : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {won
                ? 'indirect jump'
                : bounce
                  ? 'needs an object'
                  : memOk
                    ? 'w has this'
                    : emptyThrow
                      ? 'bad_function_call'
                      : funOk
                        ? 'target assigned'
                        : dangled
                          ? 'dangling capture'
                          : 'not called'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          bounce || emptyThrow || dangled
            ? 'fx-verdict--trap'
            : won || memOk || funOk
              ? 'fx-verdict--ok'
              : ''
        }`}
      >
        {id === 'fp' && won
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
                    : ''}
      </div>
    </SceneShell>
  )
}
