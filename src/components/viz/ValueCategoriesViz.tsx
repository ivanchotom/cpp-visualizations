import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Cat = 'lvalue' | 'xvalue' | 'prvalue'

interface Frame {
  expr: string
  cat: Cat
  hint: string
  code: string
  sig: string
}

const FRAMES: Frame[] = [
  {
    expr: 'x',
    cat: 'lvalue',
    hint: 'A named variable has identity. You can take &x. You do not steal from it — you copy.',
    code: `int x = 1;\nx;          // lvalue`,
    sig: 'x',
  },
  {
    expr: '++x',
    cat: 'lvalue',
    hint: 'Prefix increment returns the object itself. Still an lvalue — identity, no steal.',
    code: `++x;        // lvalue, the object x`,
    sig: '++x',
  },
  {
    expr: '42',
    cat: 'prvalue',
    hint: 'A literal has no identity. It is a pure incoming value (prvalue). In C++14 it initializes or is moved from.',
    code: `42;         // prvalue`,
    sig: '42',
  },
  {
    expr: 'x++',
    cat: 'prvalue',
    hint: 'Postfix yields a temporary copy of the old value. That copy is a prvalue.',
    code: `x++;        // prvalue (old value)`,
    sig: 'x++',
  },
  {
    expr: 'std::move(x)',
    cat: 'xvalue',
    hint: 'std::move is static_cast<T&&>(x). Same object, now expiring — you may steal. It does not move by itself.',
    code: `std::move(x);  // xvalue`,
    sig: 'std::move(x)',
  },
  {
    expr: 't',
    cat: 'lvalue',
    hint: 'A named T&& is still an lvalue. wrap must call std::move (or std::forward) — the name killed the xvalue.',
    code: `void wrap(std::string&& t) {\n  // take(t);          // error: t is an lvalue\n  take(std::move(t));  // xvalue\n}`,
    sig: 'named T&&',
  },
]

const TAXONOMY: { cat: Cat; aka: string; steal: string; identity: string }[] = [
  { cat: 'lvalue', aka: 'glvalue', steal: 'no (copy)', identity: 'yes' },
  { cat: 'xvalue', aka: 'glvalue + rvalue', steal: 'yes (move)', identity: 'yes (expiring)' },
  { cat: 'prvalue', aka: 'rvalue', steal: 'yes (init / move)', identity: 'no' },
]

export function ValueCategoriesViz() {
  const { i, playing, play, reset, jump } = useBeats(FRAMES.length)
  const f = FRAMES[i]

  const tone = f.cat === 'xvalue' ? 'warn' : f.cat === 'prvalue' ? 'ok' : 'idle'

  return (
    <SceneShell
      playing={playing}
      onPlay={play}
      onReset={reset}
      playLabel="Play x then 42 then move(x)"
      step={i}
      stepCount={FRAMES.length}
      sig={f.sig}
      caption={f.hint}
      code={f.code}
      tone={tone}
      footer={
        <div className="stepper">
          <button className="chip" onClick={() => jump(i - 1)} disabled={playing || i === 0}>
            ◂ prev
          </button>
          <button
            className="chip"
            onClick={() => jump(i + 1)}
            disabled={playing || i === FRAMES.length - 1}
          >
            next ▸
          </button>
        </div>
      }
    >
      <div className={`fx-tok fx-tok--hot fx-cat-expr`}>
        <span className="fx-kicker">expression</span>
        <code>{f.expr}</code>
      </div>
      <div className="fx-cat-row">
        {TAXONOMY.map((t) => (
          <button
            key={t.cat}
            type="button"
            className={`fx-slot${f.cat === t.cat ? ' fx-slot--focus' : ' fx-slot--dim'}${
              f.cat === t.cat && t.cat === 'prvalue' ? ' fx-slot--ok' : ''
            }${f.cat === t.cat && t.cat === 'xvalue' ? ' fx-slot--weld' : ''}`}
            onClick={() => {
              const n = FRAMES.findIndex((fr) => fr.cat === t.cat)
              if (n >= 0) jump(n)
            }}
            disabled={playing}
          >
            <span className="fx-kicker">{t.cat}</span>
            <span className="fx-note">{t.aka}</span>
            <span className="fx-note">identity: {t.identity}</span>
            <span className="fx-note">move from: {t.steal}</span>
          </button>
        ))}
      </div>
      <div
        className={`fx-verdict fx-verdict--show ${
          f.cat === 'xvalue' ? 'fx-verdict--warn' : f.cat === 'prvalue' ? 'fx-verdict--ok' : 'fx-verdict--ok'
        }`}
      >
        {f.cat === 'lvalue'
          ? `${f.expr} · has identity · copy, do not steal`
          : f.cat === 'xvalue'
            ? `${f.expr} · identity, expiring · may steal`
            : `${f.expr} · no identity · initializes`}
      </div>
    </SceneShell>
  )
}
