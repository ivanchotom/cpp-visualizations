# C++ object-model lab

A public visual lab that makes the C++ object model visible: identity versus
steal, constructor order and unwind, ownership contracts, and why a
`static_cast<BaseB*>(p)` moves the address.

It is a single-page app (React + TypeScript + Vite) with hash routes
(`#/` overview, `#/t/<topic>`, `#/ahead` plans, `#/voice` narration scripts).
Every topic keeps the C++14 cheatsheet and adds a **lab**: a visualization,
a voice script you can play or record, and a try-it control (buttons or a
snippet the lab interprets as a teaching pattern — not a compiler).

## What this is not

These tools already exist. We keep them as references and do not clone them:

| Tool | Job it owns |
| --- | --- |
| Compiler Explorer | Source → assembly |
| C++ Insights | Source → desugared C++ |
| cxxfilt layout | Clang-accurate ABI offsets |
| NothingLeaves layout | Padding sandbox / ABI compare |
| Python Tutor C++ | Step *your* code (Valgrind-backed) |
| codevisualizer.app | Generic RAII stepper |

This site’s job is **concept theater with a voice**: the whiteboard pictures,
driven by you.

## Curriculum

Eight tracks. Snippets are C++14. Topics that changed later carry a short
“Looking ahead” note. Sizes assume typical **64-bit LP64**.

## Getting started

Requires Node.js 20+.

```bash
npm ci
npm run dev    # http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Serve `dist/` |
| `npm run typecheck` | `tsc --noEmit` |

## Voice

Open `#/voice` for every clip. Play uses the browser synthesizer. Copy a
script and record it yourself if you want a human voice. Drop files later as
`public/voice/<topic>--<scene>.wav` — the lab will learn to prefer those
(see `#/ahead`).

## Cloud Agent environment

`.cursor/environment.json` runs `npm ci`, git attribution hooks, and
`npm run dev` on port 5173. Commits must not list Cursor as author; see
`AGENTS.md`.
