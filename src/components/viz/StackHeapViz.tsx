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

  const inFrame = i === 1 || i === 2
  const showX = (mode === 'leak' && inFrame) || (mode === 'dangle' && inFrame) || (mode === 'stat' && i >= 1)
  const showPtr = mode === 'leak' ? i === 2 : mode === 'raii' ? i >= 1 && i < 3 : mode === 'dangle' && i >= 2
  const hasHeap = mode === 'leak' ? i >= 2 : mode === 'raii' ? i === 1 || i === 2 : false
  const leaked = mode === 'leak' && i === 3
  const deleted = mode === 'raii' && i === 3
  const dangling = mode === 'dangle' && i === 3
  const staticLive = mode === 'stat' && i === 3
  const weld = (mode === 'leak' && i === 2) || (mode === 'raii' && i === 2)
  const trap = leaked || dangling
  const ok = deleted || staticLive

  const code =
    mode === 'leak'
      ? i < 2
        ? `void f() {
  int x = 7;          // automatic
}`
        : i === 2
          ? `void f() {
  int x = 7;
  int* p = new int{42}; // p on stack, 42 on heap
}`
          : `void f() {
  int* p = new int{42};
} // p dies, *p does not  ← leak`
      : mode === 'raii'
        ? i < 3
          ? `void f() {
  auto p = std::make_unique<int>(42);
}`
          : `void f() {
  auto p = std::make_unique<int>(42);
} // ~unique_ptr deletes`
        : mode === 'dangle'
          ? i < 3
            ? `int* f() {
  int x = 7;
  return &x;           // address of automatic
}`
            : `int* p = f();
*p;                    // dangling — UB`
          : recapCode(i)

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
          ? 'p is just an address on the stack. The 42 is a separate heap object. The cyan bar is not ownership.'
          : mode === 'leak'
            ? 'The frame is gone. The heap object has no pointer left. Still allocated, reachable from nowhere — a leak.'
            : mode === 'raii' && i === 1
              ? 'make_unique puts the unique_ptr on the stack and the int on the heap. The owner is automatic; the int is not.'
              : mode === 'raii' && i === 2
                ? 'Green weld: the stack owner is bound to the heap int. Returning will run the destructor.'
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

  const linkKind = leaked || dangling ? 'dead' : mode === 'raii' && weld ? 'weld' : showPtr && hasHeap ? 'on' : mode === 'dangle' && i >= 2 ? (dangling ? 'dead' : 'on') : ''

  const xVal = mode === 'stat' ? (i >= 2 ? '1' : '0') : '7'
  const xNote = mode === 'stat' ? (staticLive ? 'still alive' : inFrame || i >= 1 ? 'static storage' : '') : dangling ? 'destroyed' : 'automatic'

  const verdict =
    mode === 'leak' && i === 2
      ? 'p stores an address · not an owner'
      : leaked
        ? 'p gone · 42 still allocated · leak'
        : mode === 'raii' && i === 2
          ? 'owner on the stack · int on the heap'
          : deleted
            ? '~unique_ptr ran delete · heap empty'
            : mode === 'dangle' && i === 2
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
      <div className="fx-sh">
        <div className={`fx-pane${inFrame || (mode === 'stat' && i >= 1) ? ' fx-pane--focus' : ''}${i === 3 && mode !== 'stat' ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">{mode === 'stat' ? 'static storage' : 'stack · automatic'}</span>
          <span className="fx-note">{inFrame ? 'f()' : i === 3 && mode !== 'stat' ? 'frame destroyed' : mode === 'stat' && i >= 1 ? 'program lifetime' : 'no frame yet'}</span>
          {showX && (
            <div className={`fx-slot${dangling && i === 3 ? ' fx-slot--dim' : ' fx-slot--ok'}${staticLive ? ' fx-slot--weld' : ''}`}>
              <span className="fx-kicker">{mode === 'stat' ? 'static int n' : 'int x'}</span>
              <span className="fx-value">{dangling && i === 3 ? '—' : xVal}</span>
              <span className="fx-note">{xNote}</span>
            </div>
          )}
          {showPtr && (
            <div className={`fx-slot${weld ? (mode === 'raii' ? ' fx-slot--weld' : ' fx-slot--focus') : dangling ? ' fx-slot--trap' : ''}`}>
              <span className="fx-kicker">{mode === 'leak' ? 'int* p' : mode === 'raii' ? 'unique_ptr p' : 'int* p'}</span>
              <span className="fx-value">{mode === 'raii' ? 'owns' : dangling ? 'dangling' : '0xH0'}</span>
              {mode === 'raii' && <span className="fx-badge fx-badge--open">dtor will delete</span>}
            </div>
          )}
        </div>
        <div
          className={`fx-link${linkKind === 'on' ? ' fx-link--on' : ''}${linkKind === 'weld' ? ' fx-link--weld' : ''}${
            linkKind === 'dead' ? ' fx-link--dead' : ''
          }`}
        />
        <div
          className={`fx-pane${hasHeap || dangling ? ' fx-pane--focus' : ''}${leaked || dangling ? ' fx-pane--trap' : ''}${
            deleted ? ' fx-pane--gone' : ''
          }`}
        >
          <span className="fx-kicker">{mode === 'dangle' ? 'caller' : 'heap · free store'}</span>
          {hasHeap && (
            <div className={`fx-slot${leaked ? ' fx-slot--trap' : ''}${mode === 'raii' && i === 2 ? ' fx-slot--weld' : ''}`}>
              <span className="fx-kicker">int</span>
              <span className="fx-value">42</span>
              <span className="fx-note">{leaked ? 'orphaned — leaked' : 'new int{42}'}</span>
            </div>
          )}
          {deleted && (
            <div className="fx-slot fx-slot--ok">
              <span className="fx-kicker">deleted</span>
              <span className="fx-value">~p</span>
              <span className="fx-note">destructor ran delete</span>
            </div>
          )}
          {mode === 'dangle' && i >= 2 && (
            <div className={`fx-slot${dangling ? ' fx-slot--trap' : ' fx-slot--focus'}`}>
              <span className="fx-kicker">returned p</span>
              <span className="fx-value">{dangling ? 'UB' : '&x'}</span>
              <span className="fx-note">{dangling ? 'object is gone' : 'address copy'}</span>
            </div>
          )}
          {!hasHeap && !deleted && mode !== 'dangle' && <p className="fx-note">no allocations</p>}
        </div>
      </div>
      {showX ? (
        <div className="fx-buf-row" style={{ justifyContent: 'center' }}>
          <span className={`fx-letter${dangling ? ' fx-letter--dead' : ' fx-letter--on'}`}>{dangling ? '·' : xVal}</span>
        </div>
      ) : null}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : weld && mode === 'raii' ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}

function recapCode(i: number): string {
  if (i >= 3) {
    return `void f() {
  static int n = 0;
  ++n;                 // still 1, then 2
}`
  }
  return `void f() {
  static int n = 0;    // first call
}`
}
