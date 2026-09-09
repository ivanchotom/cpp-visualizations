# cpp-visualizations

An interactive, web-based C++ visual cheat sheet explaining data types, memory layouts, and common patterns.

It is a single-page app built with **React 19 + TypeScript + Vite**. Three interactive views:

- **Data Types** — fundamental C++ types with their sizes, ranges, and a per-byte width visualization (based on a typical 64-bit LP64 platform).
- **Memory Layout** — build a `struct` from a palette of members and watch alignment padding, `sizeof`, and `alignof` update live.
- **Common Patterns** — copy-ready, C++14-valid snippets for RAII, smart pointers, range-based `for`, `auto`, lambdas, and move semantics.

## Getting started

Requires Node.js 20+ (developed against Node 22).

```bash
npm ci        # install exact locked dependencies
npm run dev   # start the Vite dev server at http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload. |
| `npm run build` | Type-check (`tsc --noEmit`) and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Run the TypeScript type checker only. |

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment: it runs
`npm ci` on setup, then `scripts/setup-git-attribution.sh` (git hooks + Ivan as
the only commit author), and launches `npm run dev` in a persistent terminal,
exposing port 5173. Commits must not list Cursor as author or co-author; see
`AGENTS.md`.
