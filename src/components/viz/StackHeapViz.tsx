import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'leak' | 'raii' | 'dangle' | 'stat'

const MODES: { id: Mode; title: string }[] = [
  { id: 'leak', title: 'bare new' },
  { id: 'raii', title: 'unique_ptr' },
  { id: 'dangle', title: 'return &x' },
  { id: 'stat', title: 'static' },
]

export function StackHeapViz() {
  const [mode, setMode] = useState<Mode>('leak')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setMode(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const leaked = mode === 'leak' && recap
  const deleted = mode === 'raii' && recap
  const dangling = mode === 'dangle' && decided
  const staticLive = mode === 'stat' && recap
  const trap = leaked || dangling
  const ok = deleted || staticLive

  const code =
    mode === 'leak'
      ? recap
        ? `void f() {
  int* p = new int{42};
} // p dies, *p does not  ← leak`
        : decided
          ? `void f() {
  int x = 7;
  int* p = new int{42}; // p on stack, 42 on heap
}`
          : `void f() {
  int x = 7;          // automatic
}`
      : mode === 'raii'
        ? recap
          ? `void f() {
  auto p = std::make_unique<int>(42);
} // ~unique_ptr deletes`
          : `void f() {
  auto p = std::make_unique<int>(42);
}`
        : mode === 'dangle'
          ? recap
            ? `int* p = f();
*p;                    // dangling — UB`
            : `int* f() {
  int x = 7;
  return &x;           // address of automatic
}`
          : recap
            ? `void f() {
  static int n = 0;
  ++n;                 // still 1, then 2
}`
            : `void f() {
  static int n = 0;    // first call
}`

  const caption =
    i === 0
      ? mode === 'leak'
        ? 'Play bare new. The stack frame does not exist until f is entered. Heap is a separate region. Default to the stack.'
        : mode === 'raii'
          ? 'Play unique_ptr. Put heap ownership inside a stack object so cleanup is the same path as the return — even if f threw.'
          : mode === 'dangle'
            ? 'Play return &x. Returning a pointer to a local automatic object is undefined behavior. The address does not keep the object alive.'
            : 'Play static. A static local lives for the program — neither stack nor heap. It is initialized once, on first pass.'
      : mode === 'leak' && i === 1
        ? 'x is automatic. It will vanish when f returns — no delete, no leak. Still no heap object.'
        : mode === 'leak' && i === 2
          ? 'p is just an address on the stack. The 42 is a separate heap object. The pointer is not ownership.'
          : mode === 'leak'
            ? 'The frame is gone. The heap object has no pointer left. Still allocated, reachable from nowhere — a leak.'
            : mode === 'raii' && i === 1
              ? 'make_unique puts the unique_ptr on the stack and the int on the heap. The owner is automatic; the int is not.'
              : mode === 'raii' && i === 2
                ? 'The stack owner is bound to the heap int. Returning will run the destructor.'
                : mode === 'raii'
                  ? 'Destructor ran. Heap int is gone. RAII made the cleanup the same path as the return.'
                  : mode === 'dangle' && i === 1
                    ? 'x lives in f’s frame. &x is an address. The object is still alive while f is running.'
                    : mode === 'dangle' && i === 2
                      ? 'return &x copies the address. The automatic object is about to die. The pointer does not extend its life.'
                      : mode === 'dangle'
                        ? 'f returned. x is gone. p still holds the old address. Reading *p is UB, not “whatever was on the stack.”'
                        : i === 1
                          ? 'static int n is initialized on first entry. It does not sit in this call’s frame. It outlives f.'
                          : i === 2
                            ? 'f returns. The frame is gone. n is still 1. Next call sees the same object, not a new 0.'
                            : 'Second call. n is still there. Static storage is neither stack nor heap — it is the program.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    mode === 'leak' ? 'Play bare new' : mode === 'raii' ? 'Play unique_ptr' : mode === 'dangle' ? 'Play return &x' : 'Play static'

  const verdict =
    mode === 'leak' && decided && !recap
      ? 'p stores an address · not an owner'
      : leaked
        ? 'p gone · 42 still allocated · leak'
        : mode === 'raii' && decided && !recap
          ? 'owner on the stack · int on the heap'
          : deleted
            ? '~unique_ptr ran delete · heap empty'
            : mode === 'dangle' && decided && !recap
              ? '&x copied · object about to die'
              : dangling
                ? 'frame gone · p dangling · UB'
                : mode === 'stat' && i === 1
                  ? 'static n · not in this frame'
                  : mode === 'stat' && i === 2
                    ? 'frame gone · n remains'
                    : staticLive
                      ? 'next call · same n'
                      : ''

  return (
    <SceneShell
      modes={MODES}
      mode={mode}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setMode(mode)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === mode)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      {mode === 'leak' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${leaked ? ' fx-rank--done' : ''}`}>
            <code>x</code>
            <span className="fx-note">sk</span>
            <span className="fx-note">{leaked ? 'gn' : stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${leaked ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">hp</span>
            <span className="fx-note">{leaked ? 'lk' : decided ? '42' : '—'}</span>
          </div>
        </div>
      )}
      {mode === 'raii' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${deleted ? ' fx-rank--done' : ''}`}>
            <code>p</code>
            <span className="fx-note">ow</span>
            <span className="fx-note">{deleted ? 'gn' : stepped ? 'ow' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${deleted ? ' fx-rank--done' : ''}`}>
            <code>T</code>
            <span className="fx-note">hp</span>
            <span className="fx-note">{deleted ? 'ok' : decided ? '42' : '—'}</span>
          </div>
        </div>
      )}
      {mode === 'dangle' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${dangling ? ' fx-rank--trap' : ''}`}>
            <code>x</code>
            <span className="fx-note">sk</span>
            <span className="fx-note">{dangling ? 'gn' : stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${dangling ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">rt</span>
            <span className="fx-note">{dangling ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      {mode === 'stat' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${staticLive ? ' fx-rank--done' : ''}`}>
            <code>n</code>
            <span className="fx-note">sc</span>
            <span className="fx-note">{staticLive ? '2' : decided ? '1' : stepped ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>f</code>
            <span className="fx-note">fr</span>
            <span className="fx-note">{decided ? 'gn' : '—'}</span>
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
