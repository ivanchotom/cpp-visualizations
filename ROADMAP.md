# Plans ahead

Product: a public C++ object-model lab. Not a vault, not a textbook, not a
clone of Godbolt / Insights / cxxfilt / Python Tutor.

## Now

- Every topic has visualization + voice + a try-it control.
- Browser speech + copyable scripts (`#/voice`).
- Whiteboard labs: value categories, lifetime + throw, ownership cycle,
  this-adjustment.

## Next

1. Drag-able this-adjustment ruler; virtual-base vbptr hop (still labeled typical, not Clang).
2. One playable throw-during-ctor story with a voice beat per step.
3. Ownership: cycle → weak back-edge → `lock()` fails.
4. Optional recorded files in `public/voice/` (you generate them).
5. Shareable scene URLs (`#/t/inheritance?try=baseb`).

## Later

- Do **not** add a WASM compiler or C++ interpreter. Link out instead.
- Maybe a small companion C++ program this lab explains, so the portfolio is not TypeScript alone.

In-app copy: `#/ahead`.
