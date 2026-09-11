import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'eof' | 'setw' | 'tie' | 'file'

const MODES: { id: Mode; title: string }[] = [
  { id: 'eof', title: 'eof' },
  { id: 'setw', title: 'setw' },
  { id: 'tie', title: 'tie' },
  { id: 'file', title: 'fstream' },
]

export function IostreamsViz() {
  const [id, setId] = useState<Mode>('eof')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const eofTrap = id === 'eof' && recap
  const setwSpent = id === 'setw' && i === 2
  const setwOk = id === 'setw' && recap
  const tieOk = id === 'tie' && decided
  const fileClosed = id === 'file' && recap

  const code =
    id === 'eof'
      ? recap
        ? `while (std::getline(in, line)) {
  use(line);
}  // the read IS the loop test`
        : `while (!in.eof()) {  // WRONG
  in >> x;
  use(x);
}`
      : id === 'setw'
        ? decided
          ? `// "  42|7"  — setw only once
// setprecision sticks until changed`
          : `std::cout << std::setw(4) << 42
          << '|' << 7;`
        : id === 'tie'
          ? `std::cout << "n? ";
std::cin >> x;  // cout flushes first
// cout is tied to cin by default`
          : recap
            ? `}  // ~in closes the file
// even if use() threw`
            : `std::ifstream in("data.txt");
if (!in) throw std::runtime_error("open");`

  const caption =
    i === 0
      ? id === 'eof'
        ? 'Play while (!in.eof()). eofbit is set after a failed read, not before. The loop body runs once on garbage. Test the extraction itself.'
        : id === 'setw'
          ? 'Play setw. Manipulators look like they all persist. setw applies to the next field only. setprecision sticks until you change it.'
          : id === 'tie'
            ? 'Play cin. cout is tied to cin: the prompt flushes before you extract. cerr is the unbuffered-ish diagnostic stream.'
            : 'Play fstream. The file handle is RAII: the destructor closes it on every exit path, including exceptions.'
      : id === 'eof' && i === 1
        ? 'First >> succeeds. x is "a". eofbit is still false — you have not failed yet, even if this was the last token.'
        : id === 'eof' && i === 2
          ? 'Second >> succeeds. x is "b". The file is empty now, but eofbit still waits for the next failed attempt.'
          : id === 'eof'
            ? 'Loop checks !eof(), still true, reads again, fails, and you still called use(x) on the stale value. while (in >> x) would have stopped.'
            : id === 'setw' && i === 1
              ? 'setw(4) pads 42 to width 4. That flag is consumed by this insertion. The field lights in place — nothing hops.'
              : id === 'setw' && i === 2
                ? 'The next << 7 is unpadded. People expect the width to stick. It does not.'
                : id === 'setw'
                  ? 'setprecision, hex, boolalpha stick. setw is the odd one. Reset flags when you are done, or you format the next log line as hex.'
                  : id === 'tie' && i === 1
                    ? 'cin >> waits. Tied cout flushes so the prompt actually appears before the user types. The weld is that tie, not a copy.'
                    : id === 'tie' && i === 2
                      ? 'Then the extract runs. unitbuf / cerr exist so diagnostics still show if cout is fully buffered.'
                      : id === 'tie'
                        ? 'sync_with_stdio(false) speeds mixed C++/C I/O but you must then not mix FILE* and streams carelessly.'
                        : i === 1
                          ? 'open. if (!in) is the check. Failures set failbit — they do not throw unless you enable exceptions on the stream.'
                          : i === 2
                            ? 'getline succeeds while it can. The file is still open; the object owns the handle.'
                            : '~ifstream. Close is the destructor. Do not fclose a FILE* you did not fopen, and do not leak an fstream you new’d.'

  const tone = eofTrap ? 'trap' : setwSpent ? 'warn' : tieOk || fileClosed || setwOk ? 'ok' : 'idle'
  const playLabel =
    id === 'eof'
      ? 'Play while (!eof())'
      : id === 'setw'
        ? 'Play setw(4)'
        : id === 'tie'
          ? 'Play cin >> x'
          : 'Play ifstream'

  const inName = id === 'eof' ? 'ifstream in' : id === 'setw' ? 'cout' : id === 'tie' ? 'cin' : 'ifstream in'
  const inVal =
    id === 'eof'
      ? eofTrap
        ? 'failbit'
        : i === 2
          ? 'empty'
          : i === 1
            ? '"b"'
            : '"a\\nb"'
      : id === 'setw'
        ? 'stream'
        : id === 'tie'
          ? 'waiting'
          : recap
            ? 'closed'
            : '"data.txt"'
  const midName = id === 'eof' ? 'in >> x' : id === 'setw' ? 'setw(4)' : id === 'tie' ? 'cout (tied)' : 'getline'
  const midVal =
    id === 'eof' && i === 1
      ? 'x="a"'
      : id === 'eof' && i >= 2
        ? 'x="b"'
        : id === 'setw' && i === 1
          ? 'next field only'
          : id === 'setw' && decided
            ? 'spent'
            : id === 'tie' && stepped
              ? 'flushed'
              : id === 'file' && stepped
                ? 'line'
                : '—'
  const outName = id === 'eof' ? 'eofbit' : id === 'setw' ? 'next << 7' : id === 'tie' ? 'prompt' : '~ifstream'
  const outVal =
    eofTrap
      ? 'after fail'
      : id === 'setw' && i === 1
        ? '"  42"'
        : id === 'setw' && decided
          ? '7  (no pad)'
          : id === 'tie' && decided
            ? 'then extract'
            : fileClosed
              ? 'closed'
              : '—'

  const leftLink = stepped ? (id === 'tie' ? 'fx-link--weld' : 'fx-link--on') : ''
  const rightLink = eofTrap || setwSpent ? 'fx-link--dead' : tieOk || fileClosed || setwOk ? 'fx-link--weld' : decided ? 'fx-link--on' : ''

  const verdict =
    eofTrap
      ? 'eof after fail · used garbage'
      : id === 'eof' && i === 2
        ? 'eofbit still false'
        : setwSpent
          ? 'setw · next field only'
          : setwOk
            ? 'precision sticks · setw does not'
            : id === 'tie' && i === 1
              ? 'cout flushes before cin'
              : tieOk
                ? 'prompt then extract'
                : id === 'file' && i === 1
                  ? 'if (!in) · check open'
                  : fileClosed
                    ? '~ifstream · handle closed'
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
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${fileClosed ? ' fx-pane--gone' : ''}`}>
          <span className="fx-kicker">stream</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{inName}</span>
            <span className="fx-value">{inVal}</span>
            <span className="fx-note">state</span>
          </div>
        </div>
        <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
        <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
          <span className="fx-kicker">op</span>
          <div className={`fx-slot${stepped ? ' fx-slot--focus' : ' fx-slot--dim'}`}>
            <span className="fx-kicker">{midName}</span>
            <span className="fx-value">{midVal}</span>
            <span className="fx-note">
              {id === 'eof'
                ? eofTrap
                  ? 'failed read'
                  : 'eof not set yet'
                : id === 'setw'
                  ? 'does not stick'
                  : id === 'tie'
                    ? 'flush before cin'
                    : 'RAII owns the handle'}
            </span>
          </div>
        </div>
        <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
        <div className={`fx-pane${decided || (id === 'setw' && i === 1) ? ' fx-pane--focus' : ''}${eofTrap ? ' fx-pane--trap' : ''}`}>
          <span className="fx-kicker">out</span>
          <div
            className={`fx-slot${
              eofTrap ? ' fx-slot--trap' : setwSpent ? ' fx-slot--trap' : tieOk || fileClosed || setwOk ? ' fx-slot--ok' : ' fx-slot--dim'
            }`}
          >
            <span className="fx-kicker">{outName}</span>
            <span className="fx-value">{outVal}</span>
            <span className="fx-note">
              {eofTrap
                ? 'you already used garbage'
                : id === 'setw' && recap
                  ? 'precision would stick'
                  : id === 'setw'
                    ? 'setw is the exception'
                    : id === 'tie'
                      ? 'cerr is unbuffered-ish'
                      : fileClosed
                        ? 'dtor always runs'
                        : 'waiting'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          eofTrap ? 'fx-verdict--trap' : setwSpent ? 'fx-verdict--warn' : verdict ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
