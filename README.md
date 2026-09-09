# cpp-visualizations

An interactive C++14 cheatsheet: eight tracks, forty topics, and live visualizations for the parts of the language that are easier to *see* than to recite.

It is a single-page app (React 19 + TypeScript + Vite) with hash routes (`#/` overview, `#/t/<topic>`). Search the sidebar, open a topic, and — where a cyan dot appears — play with a visualization.

## What’s here

- **Foundations** — compilation pipeline, preprocessor, types, cv-qualifiers, literals, operators, control flow, scope, casts
- **Memory & values** — stack vs heap, pointers/references, arrays, struct layout & padding, value categories, copy/move, new/delete
- **Functions** — overloading, pass-by, lambdas, constexpr
- **Classes** — special members, lifetime/ctor order, inheritance layouts, virtual dispatch, operator overloading
- **Templates** — instantiation, specialization / SFINAE, type traits
- **Errors** — exceptions & unwind, noexcept
- **Standard library** — string, containers, iterators, algorithms, smart pointers, iostreams, chrono, threads
- **Idioms** — RAII patterns, Rule of Zero, undefined behavior, const-correctness, classic pitfalls

Snippets are C++14. Topics that changed later carry a short “Looking ahead” note for C++17/20/23 — they are not the examples.

Sizes in the type and layout views assume a typical **64-bit LP64** platform (Linux x86-64).

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
`npm ci` on setup and launches `npm run dev` in a persistent terminal, exposing
port 5173.
