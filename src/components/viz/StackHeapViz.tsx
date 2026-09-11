import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'leak' | 'raii'

const MODES: { id: Mode; title: string }[] = [
  { id: 'leak', title: 'bare new' },
  { id: 'raii', title: 'unique_ptr' },
]

export function StackHeapViz() {
  const [mode, setMode] = useState<Mode>('leak')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setMode(next as Mode)
  }

  const inFrame = i === 1 || i === 2
  const showX = mode === 'leak' && inFrame
  const showPtr = mode === 'leak' ? i === 2 : i >= 1 && i < 3
  const hasHeap = mode === 'leak' ? i >= 2 : i === 1 || i === 2
  const leaked = mode === 'leak' && i === 3
  const deleted = mode === 'raii' && i === 3
  const weld = (mode === 'leak' && i === 2) || (mode === 'raii' && i === 2)
  const linkKind = leaked ? 'dead' : mode === 'raii' && weld ? 'weld' : showPtr && hasHeap ? 'on' : ''

  const code =
    mode === 'leak'
      ? i === 0
        ? `void f() {\n  // not yet entered\n}`
        : i === 1
          ? `void f() {\n  int x = 7;          // automatic\n}`
          : i === 2
            ? `void f() {\n  int x = 7;\n  int* p = new int{42}; // p on stack, 42 on heap\n}`
            : `void f() {\n  int* p = new int{42};\n} // p dies, *p does not  ← leak`
      : i === 0
        ? `void f() {\n  // not yet entered\n}`
        : i === 1 || i === 2
          ? `void f() {\n  auto p = std::make_unique<int>(42);\n}`
          : `void f() {\n  auto p = std::make_unique<int>(42);\n} // ~unique_ptr deletes`

  const caption =
    i === 0
      ? 'Play a call to f(). The stack frame does not exist until the function is entered. Heap is a separate region.'
      : i === 1
        ? mode === 'leak'
          ? 'x is automatic. It will vanish when f returns — no delete, no leak. Still no heap object.'
          : 'make_unique puts the unique_ptr on the stack and the int on the heap. The owner is automatic; the int is not.'
        : i === 2
          ? mode === 'leak'
            ? 'p is just an address on the stack. The 42 is a separate heap object. The cyan bar is not ownership.'
            : 'Green weld: the stack owner is bound to the heap int. Returning will run the destructor.'
          : mode === 'leak'
            ? 'The frame is gone. The heap object has no pointer left. Still allocated, reachable from nowhere — a leak.'
            : 'Destructor ran. Heap int is gone. RAII made the cleanup the same path as the return — even if f threw.'

  const tone = leaked ? 'trap' : deleted ? 'ok' : 'idle'

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
      playLabel="Play f()"
      step={i}
      stepCount={4}
      sig={mode === 'leak' ? 'bare new' : 'unique_ptr'}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className="fx-sh">
        <div className={`fx-pane${inFrame ? ' fx-pane--focus' : ''}${i === 3 ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">stack · automatic</span>
          <span className="fx-note">{inFrame ? 'f()' : i === 3 ? 'frame destroyed' : 'no frame yet'}</span>
          {showX && (
            <div className="fx-slot fx-slot--ok">
              <span className="fx-kicker">int x</span>
              <span className="fx-value">7</span>
            </div>
          )}
          {showPtr && (
            <div className={`fx-slot${weld ? (mode === 'raii' ? ' fx-slot--weld' : ' fx-slot--focus') : ''}`}>
              <span className="fx-kicker">{mode === 'leak' ? 'int* p' : 'unique_ptr p'}</span>
              <span className="fx-value">{mode === 'leak' ? '0xH0' : 'owns'}</span>
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
          className={`fx-pane${hasHeap ? ' fx-pane--focus' : ''}${leaked ? ' fx-pane--trap' : ''}${
            deleted ? ' fx-pane--gone' : ''
          }`}
        >
          <span className="fx-kicker">heap · free store</span>
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
          {!hasHeap && !deleted && <p className="fx-note">no allocations</p>}
        </div>
      </div>
      <div
        className={`fx-verdict${i >= 2 ? ' fx-verdict--show' : ''} ${
          leaked ? 'fx-verdict--trap' : deleted ? 'fx-verdict--ok' : weld && mode === 'raii' ? 'fx-verdict--ok' : ''
        }`}
      >
        {leaked
          ? 'p gone · 42 still allocated · leak'
          : deleted
            ? '~unique_ptr ran delete · heap empty'
            : mode === 'raii' && i === 2
              ? 'owner on the stack · int on the heap'
              : mode === 'leak' && i === 2
                ? 'p stores an address · not an owner'
                : ''}
      </div>
    </SceneShell>
  )
}
