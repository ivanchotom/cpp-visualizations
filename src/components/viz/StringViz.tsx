import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'plus' | 'sso' | 'cstr' | 'reserve'

const MODES: { id: Mode; title: string }[] = [
  { id: 'plus', title: 's + x' },
  { id: 'sso', title: 'SSO' },
  { id: 'cstr', title: 'c_str' },
  { id: 'reserve', title: 'reserve' },
]

function Letters({ chars, cls }: { chars: readonly string[]; cls: (n: number, ch: string) => string }) {
  return (
    <div className="fx-buf-row">
      {chars.map((ch, n) => (
        <span key={n} className={`fx-letter ${cls(n, ch)}`}>
          {ch}
        </span>
      ))}
    </div>
  )
}

export function StringViz() {
  const [id, setId] = useState<Mode>('plus')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3
  const plusCopy = id === 'plus' && stepped && !recap
  const plusFix = id === 'plus' && recap
  const ssoInline = id === 'sso' && i === 1
  const ssoHeap = id === 'sso' && decided
  const cstrLive = id === 'cstr' && i === 1
  const cstrDangle = id === 'cstr' && decided
  const reserved = id === 'reserve' && stepped
  const appendOk = id === 'reserve' && decided

  const code =
    id === 'plus'
      ? recap
        ? `s += "c";
s.append("d");
// or reserve, then += in a loop`
        : `std::string s = "ab";
s = s + "c";   // new string, copy all
s = s + "d";   // again`
      : id === 'sso'
        ? `std::string a = "hi";      // often inline
std::string b = "a long string…";
// SSO size is implementation-defined`
        : id === 'cstr'
          ? decided
            ? `s += "........";  // may realloc
// p dangles. Hold a string, not a pointer.`
            : `const char* p = s.c_str();
// p points at s’s buffer, always \\0`
          : recap
            ? `s += "id=";
s += std::to_string(42);
// size grew; capacity already paid`
            : `std::string s;
s.reserve(64);
// size still 0; capacity is 64 (or more)`

  const caption =
    i === 0
      ? id === 'plus'
        ? 'Play s = s + x. Each + builds a new string and copies every old character. In a loop that is quadratic. Prefer += / append / reserve.'
        : id === 'sso'
          ? 'Play SSO. Short strings often live inside the object — no heap. The threshold is implementation-defined. Do not write code that depends on the exact size.'
          : id === 'cstr'
            ? 'Play c_str(). It is cheap because std::string already keeps a terminating \\0. The pointer is into s — a later mutation that reallocates dangles it.'
            : 'Play reserve. size() is length; capacity() is allocated. reserve() is how you avoid repeated growth when you know the bound.'
      : id === 'plus' && i === 1
        ? '"ab" is copied into a brand-new string, then "c" is appended there. The old s is then replaced. Cells light in the result — they do not hop.'
        : id === 'plus' && i === 2
          ? 'Do it again and you copy "abc". n appends via + copy ~ n² characters. That is the loop bug.'
          : id === 'plus'
            ? '+= / append write into the existing buffer when capacity allows. The spare slot fills in place. reserve first if you know the final size.'
            : id === 'sso' && i === 1
              ? '"hi" stays in the object. Small-string optimization. c_str() still works — the \\0 is in that inline buffer.'
              : id === 'sso' && i === 2
                ? 'A long string does not fit. Inline slots empty; the heap buffer lights. SSO did not fail; the string just outgrew it.'
                : id === 'sso'
                  ? 'std::string is bytes, not glyphs. length() is char count, not UTF-8 code points. Encoding is a convention in C++14.'
                  : id === 'cstr' && i === 1
                    ? 'p = s.c_str(). Valid until s dies or mutates in a way that reallocates. The green weld is an alias into the buffer, not a copy.'
                    : id === 'cstr' && i === 2
                      ? 's += more. If capacity was tight, the buffer moves. p still holds the old address. The weld dies.'
                      : id === 'cstr'
                        ? 'Dangling. Keep the std::string (or copy). string_view in C++17 has the same lifetime trap — the view does not own.'
                        : i === 1
                          ? 'reserve(64) allocates once. size is still 0. Empty slots are capacity — paid up front, not characters yet.'
                          : i === 2
                            ? '+= now writes in place. No new buffer, no iterator invalidation from growth.'
                            : 'to_string(42) is C++11. Build text with reserve + +=, not a chain of + in a loop.'

  const tone = plusCopy && i === 2 ? 'warn' : cstrDangle ? 'trap' : plusFix || ssoInline || appendOk ? 'ok' : 'idle'
  const playLabel =
    id === 'plus' ? 'Play s = s + x' : id === 'sso' ? 'Play SSO' : id === 'cstr' ? 'Play c_str()' : 'Play reserve(64)'

  const sPlus = plusFix ? ['a', 'b', 'c', '·'] : ['a', 'b', '·', '·']
  const plusResult =
    i === 1 ? ['a', 'b', 'c', '·'] : i === 2 ? ['a', 'b', 'c', 'd'] : ['·', '·', '·', '·']
  const ssoObj = ssoInline ? ['h', 'i', '\\0'] : ['·', '·', '·']
  const ssoHeapChars = ssoHeap ? ['a', ' ', 'l', 'o', 'n', 'g', '…', '\\0'] : ['·', '·', '·', '·', '·', '·', '·', '·']
  const cstrS = cstrDangle ? ['h', 'e', 'l', 'l', 'o', '!', '!', '\\0'] : ['h', 'e', 'l', 'l', 'o', '\\0']
  const reserveSlots = reserved
    ? appendOk
      ? recap
        ? ['i', 'd', '=', '4', '2', '·', '·', '·']
        : ['i', 'd', '=', '·', '·', '·', '·', '·']
      : ['·', '·', '·', '·', '·', '·', '·', '·']
    : []

  const leftLink = stepped ? (cstrLive ? 'fx-link--weld' : cstrDangle ? 'fx-link--dead' : ssoHeap ? 'fx-link--on' : 'fx-link--on') : ''
  const rightLink = plusFix ? 'fx-link--weld' : plusCopy ? 'fx-link--on' : appendOk ? 'fx-link--weld' : ''

  const verdict =
    id === 'plus' && i === 2
      ? 's + x · copies n² chars'
      : plusFix
        ? '+= · one buffer'
        : ssoInline
          ? 'SSO · lives in the object'
          : ssoHeap
            ? 'too big · heap buffer'
            : cstrLive
              ? 'c_str() · alias into s'
              : cstrDangle
                ? 'realloc · p dangling'
                : id === 'reserve' && i === 1
                  ? 'reserve · capacity paid'
                  : appendOk
                    ? '+= · no realloc'
                    : ''

  const showVerdict = Boolean(verdict)

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
      {id === 'sso' || id === 'cstr' ? (
        <div className="fx-sh">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{id === 'sso' ? 'std::string object' : 'std::string s'}</span>
            <Letters
              chars={id === 'sso' ? ssoObj : cstrS}
              cls={(_n, ch) =>
                id === 'sso'
                  ? ssoInline && ch !== '·'
                    ? ch === '\\0'
                      ? 'fx-letter--pad'
                      : 'fx-letter--on'
                    : 'fx-letter--empty'
                  : ch === '\\0'
                    ? 'fx-letter--pad'
                    : 'fx-letter--on'
              }
            />
            {ssoHeap && <span className="fx-badge">ptr + size</span>}
            <span className="fx-note">
              {id === 'sso'
                ? ssoHeap
                  ? 'now a pointer + size'
                  : 'inline SSO buffer'
                : 'owns the buffer · always \\0'}
            </span>
          </div>
          <div className={`fx-link${leftLink ? ` ${leftLink}` : ''}`} />
          <div
            className={`fx-pane${ssoHeap || cstrLive || cstrDangle ? ' fx-pane--focus' : ''}${
              cstrDangle ? ' fx-pane--trap' : ''
            }${id === 'sso' && !ssoHeap ? ' fx-pane--gone' : ''}`}
          >
            <span className="fx-kicker">{id === 'sso' ? 'heap buffer' : 'const char* p'}</span>
            {id === 'sso' ? (
              <>
                <Letters
                  chars={ssoHeapChars}
                  cls={(_n, ch) => (ssoHeap && ch !== '·' ? 'fx-letter--move' : 'fx-letter--empty')}
                />
                <span className="fx-note">{ssoHeap ? 'too big for SSO' : 'no allocation yet'}</span>
              </>
            ) : (
              <div className={`fx-slot${cstrDangle ? ' fx-slot--trap' : cstrLive ? ' fx-slot--weld' : ' fx-slot--dim'}`}>
                <span className="fx-kicker">p</span>
                <span className="fx-value">{cstrLive ? '&s[0]' : cstrDangle ? 'stale' : '—'}</span>
                <span className="fx-note">{cstrDangle ? 'old address' : cstrLive ? 'alias, not a copy' : 'not yet'}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="fx-own">
          <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">std::string s</span>
            <Letters
              chars={id === 'plus' ? sPlus : reserveSlots.length ? reserveSlots : ['·']}
              cls={(n, ch) =>
                ch === '·'
                  ? 'fx-letter--empty'
                  : id === 'plus' && plusFix && n === 2
                    ? 'fx-letter--on'
                    : id === 'reserve' && appendOk
                      ? 'fx-letter--on'
                      : 'fx-letter--on'
              }
            />
            <span className="fx-note">
              {id === 'plus'
                ? plusFix
                  ? 'append in place'
                  : 'owns "ab"'
                : reserved
                  ? appendOk
                    ? recap
                      ? 'size 5 · cap 8'
                      : 'size 3 · cap 8'
                    : 'size 0 · cap 8'
                  : 'size 0 · cap 0'}
            </span>
          </div>
          <div className={`fx-link${leftLink && id === 'plus' && plusCopy ? ` ${leftLink}` : reserved ? ' fx-link--on' : ''}`} />
          <div className={`fx-pane${plusCopy || reserved ? ' fx-pane--focus' : ''}${id === 'plus' && i === 2 ? ' fx-pane--trap' : ''}`}>
            <span className="fx-kicker">{id === 'plus' ? 's + x' : 'capacity'}</span>
            {id === 'plus' ? (
              <>
                <Letters
                  chars={plusResult}
                  cls={(_n, ch) => (plusCopy && ch !== '·' ? 'fx-letter--on' : 'fx-letter--empty')}
                />
                <span className="fx-note">{plusCopy ? 'always a new string' : 'waiting'}</span>
              </>
            ) : (
              <>
                <span className="fx-value">{reserved ? '64' : '0'}</span>
                <span className="fx-note">{reserved ? 'paid up front' : 'no allocation'}</span>
              </>
            )}
          </div>
          <div className={`fx-link${rightLink ? ` ${rightLink}` : ''}`} />
          <div className={`fx-pane${plusFix || appendOk ? ' fx-pane--focus' : ''}`}>
            <span className="fx-kicker">{id === 'plus' ? 's += x' : 'append'}</span>
            {id === 'plus' ? (
              <>
                <Letters
                  chars={plusFix ? ['a', 'b', 'c', '·'] : ['·', '·', '·', '·']}
                  cls={(_n, ch) => (plusFix && ch !== '·' ? 'fx-letter--on' : 'fx-letter--empty')}
                />
                <span className="fx-note">{plusFix ? 'one buffer' : 'loops go quadratic'}</span>
              </>
            ) : (
              <div className={`fx-slot${appendOk ? ' fx-slot--ok' : ' fx-slot--dim'}`}>
                <span className="fx-kicker">+=</span>
                <span className="fx-value">{appendOk ? 'in place' : '—'}</span>
                <span className="fx-note">{appendOk ? 'no realloc' : 'not yet'}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${showVerdict ? ' fx-verdict--show' : ''} ${
          cstrDangle
            ? 'fx-verdict--trap'
            : plusCopy && i === 2
              ? 'fx-verdict--warn'
              : plusFix || ssoInline || appendOk
                ? 'fx-verdict--ok'
                : ssoHeap || (id === 'reserve' && i === 1)
                  ? 'fx-verdict--ok'
                  : cstrLive
                    ? 'fx-verdict--ok'
                    : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
