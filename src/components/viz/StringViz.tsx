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
  const plusCopy = id === 'plus' && decided
  const plusFix = id === 'plus' && recap
  const ssoInline = id === 'sso' && i === 1
  const ssoHeap = id === 'sso' && decided
  const cstrLive = id === 'cstr' && i === 1
  const cstrDangle = id === 'cstr' && decided
  const reserved = id === 'reserve' && stepped
  const appendOk = id === 'reserve' && decided
  const trap = Boolean(cstrDangle)
  const warn = plusCopy

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
        ? '"ab" is copied into a brand-new string, then "c" is appended there. The old s is then replaced. Stations light in place — characters do not hop.'
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
                    ? 'p = s.c_str(). Valid until s dies or mutates in a way that reallocates. p is an alias into the buffer, not a copy.'
                    : id === 'cstr' && i === 2
                      ? 's += more. If capacity was tight, the buffer moves. p still holds the old address. The alias is dead.'
                      : id === 'cstr'
                        ? 'Dangling. Keep the std::string (or copy). string_view in C++17 has the same lifetime trap — the view does not own.'
                        : i === 1
                          ? 'reserve(64) allocates once. size is still 0. Empty slots are capacity — paid up front, not characters yet.'
                          : i === 2
                            ? '+= now writes in place. No new buffer, no iterator invalidation from growth.'
                            : 'to_string(42) is C++11. Build text with reserve + +=, not a chain of + in a loop.'

  const tone = trap ? 'trap' : warn ? 'warn' : plusFix || ssoInline || appendOk ? 'ok' : 'idle'
  const playLabel =
    id === 'plus' ? 'Play s = s + x' : id === 'sso' ? 'Play SSO' : id === 'cstr' ? 'Play c_str()' : 'Play reserve(64)'

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
              : cstrDangle && !recap
                ? 'realloc · p dangling'
                : cstrDangle && recap
                  ? 'keep the string, not p'
                  : id === 'reserve' && i === 1
                    ? 'reserve · capacity paid'
                    : appendOk && !recap
                      ? '+= · no realloc'
                      : appendOk
                        ? 'size grew · cap already paid'
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
      {id === 'plus' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>s</code>
            <span className="fx-note">buf</span>
            <span className="fx-note">{stepped ? '2' : '—'}</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${plusCopy ? ' fx-rank--trap' : ''}`}>
            <code>+x</code>
            <span className="fx-note">cpy</span>
            <span className="fx-note">{plusCopy ? 'n²' : stepped ? '3' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'sso' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>a</code>
            <span className="fx-note">sso</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${ssoHeap ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>b</code>
            <span className="fx-note">hp</span>
            <span className="fx-note">{ssoHeap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'cstr' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>s</code>
            <span className="fx-note">buf</span>
            <span className="fx-note">{stepped ? 'ok' : '—'}</span>
          </div>
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${cstrDangle ? ' fx-rank--trap' : ''}`}>
            <code>p</code>
            <span className="fx-note">ptr</span>
            <span className="fx-note">{cstrDangle ? 'ub' : cstrLive ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'reserve' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>s</code>
            <span className="fx-note">sz</span>
            <span className="fx-note">{recap ? '5' : appendOk ? '3' : reserved ? '0' : '—'}</span>
          </div>
          <div className={`fx-rank${reserved ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>cp</code>
            <span className="fx-note">cap</span>
            <span className="fx-note">{reserved ? '64' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap
            ? 'fx-verdict--trap'
            : plusCopy
              ? 'fx-verdict--warn'
              : plusFix || ssoInline || ssoHeap || cstrLive || appendOk
                ? 'fx-verdict--ok'
                : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
