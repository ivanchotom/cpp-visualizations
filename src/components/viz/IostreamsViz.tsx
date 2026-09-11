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

  const eofA = i >= 1
  const eofB = i >= 2
  const eofJunk = eofTrap

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
      {id === 'eof' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${eofTrap ? ' fx-rank--done' : ''}`}>
            <span className="fx-note">eofbit</span>
            <code>!in.eof()</code>
            <span className="fx-note">{eofTrap ? 'fail' : stepped ? 'false' : '—'}</span>
          </div>
          <div className={`fx-rank${eofTrap ? ' fx-rank--on fx-rank--trap' : ''}`}>
            <span className="fx-note">use(x)</span>
            <code>x</code>
            <span className="fx-note">{eofTrap ? 'stale' : decided ? 'b' : stepped ? 'a' : '—'}</span>
          </div>
          <div className="fx-buf-row">
            <span className={`fx-letter${eofA ? ' fx-letter--read' : ' fx-letter--empty'}`}>{eofA ? 'a' : '·'}</span>
            <span className={`fx-letter${eofB ? ' fx-letter--read' : ' fx-letter--empty'}`}>{eofB ? 'b' : '·'}</span>
            <span className={`fx-letter${eofJunk ? ' fx-letter--junk' : ' fx-letter--empty'}`}>
              {eofJunk ? '?' : '·'}
            </span>
          </div>
        </div>
      )}
      {id === 'setw' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">setw(4)</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${stepped ? ' fx-letter--pad' : ' fx-letter--empty'}`}>·</span>
              <span className={`fx-letter${stepped ? ' fx-letter--pad' : ' fx-letter--empty'}`}>·</span>
              <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>{stepped ? '4' : '·'}</span>
              <span className={`fx-letter${stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>{stepped ? '2' : '·'}</span>
            </div>
            <span className="fx-note">consumed by this field</span>
          </div>
          <div className={`fx-link${setwOk ? ' fx-link--on' : setwSpent ? ' fx-link--dead' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}${setwSpent ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">next</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${decided ? ' fx-letter--it' : ' fx-letter--empty'}`}>
                {decided ? '7' : '·'}
              </span>
            </div>
            <span className="fx-note">{setwOk ? 'precision would stick' : 'no pad'}</span>
          </div>
        </div>
      )}
      {id === 'tie' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">cout</span>
            <div className={`fx-slot${stepped ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">prompt</span>
              <span className="fx-value">{stepped ? 'n?' : '—'}</span>
              <span className="fx-note">flush before cin</span>
            </div>
          </div>
          <div className={`fx-link${tieOk ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">cin</span>
            <div className={`fx-slot${tieOk ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
              <span className="fx-kicker">x</span>
              <span className="fx-value">{tieOk ? 'in' : '—'}</span>
              <span className="fx-note">{tieOk ? 'extract after flush' : 'waiting'}</span>
            </div>
          </div>
        </div>
      )}
      {id === 'file' && (
        <div className="fx-sh">
          <div className={`fx-pane${stepped && !fileClosed ? ' fx-pane--focus' : ''}${fileClosed ? ' fx-pane--gone' : ''}`}>
            <span className="fx-kicker">ifstream</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${fileClosed ? ' fx-letter--empty' : stepped ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                {fileClosed ? '·' : stepped ? 'f' : '·'}
              </span>
            </div>
            <span className="fx-note">{fileClosed ? 'destroyed' : 'if (!in) check open'}</span>
          </div>
          <div className={`fx-link${fileClosed ? ' fx-link--dead' : decided ? ' fx-link--weld' : stepped ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${decided ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">handle</span>
            <div className="fx-buf-row">
              <span className={`fx-letter${fileClosed ? ' fx-letter--dead' : decided ? ' fx-letter--on' : ' fx-letter--empty'}`}>
                {fileClosed ? '·' : decided ? 'h' : '·'}
              </span>
            </div>
            <span className="fx-note">{fileClosed ? '~ifstream closed it' : 'RAII owns the FILE'}</span>
          </div>
        </div>
      )}
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
