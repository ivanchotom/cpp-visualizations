export function Ahead() {
  return (
    <section className="view">
      <header className="view-head">
        <p className="kicker">Plans ahead</p>
        <h1>What this lab becomes next</h1>
        <p>
          This site is not Compiler Explorer, C++ Insights, cxxfilt, NothingLeaves, or
          Python Tutor. Those tools already own source-to-assembly, desugaring, accurate
          ABI dumps, padding sandboxes, and stepping real code. We keep them as references
          and refuse to clone them. The job here is the whiteboard: identity versus steal,
          lifetime and unwind, ownership contracts, and why a pointer’s bits move.
        </p>
      </header>

      <h2 className="section-title">Now</h2>
      <ul className="later-list">
        <li>
          <span className="later-tag">Lab</span>
          Every topic has a visualization, a voice script, and a try-it control — buttons
          or a C++14 snippet the lab interprets as a teaching pattern, not as a compiler.
        </li>
        <li>
          <span className="later-tag">Voice</span>
          Browser speech for instant playback. Copy each script and replace it with your
          own recording when you want a human voice. No MCP hook is required.
        </li>
      </ul>

      <h2 className="section-title">Next</h2>
      <ul className="later-list">
        <li>
          <span className="later-tag">1</span>
          Deepen inheritance this-adjustment with a byte ruler you can drag, and show
          virtual-base vbptrs as a second hop — still labeled “typical Itanium-style,”
          never “Clang said so.”
        </li>
        <li>
          <span className="later-tag">2</span>
          Merge lifetime and exceptions into one playable throw-during-ctor story with
          a recorded voice beat per step.
        </li>
        <li>
          <span className="later-tag">3</span>
          Ownership: draw the cycle, then break it, then show lock() failing after death.
        </li>
        <li>
          <span className="later-tag">4</span>
          Optional recorded narration files per topic (you generate them). The lab will
          play an audio element when present and fall back to speech synthesis.
        </li>
        <li>
          <span className="later-tag">5</span>
          Shareable scene URLs so a hiring conversation can open `#/t/inheritance?try=baseb`.
        </li>
      </ul>

      <h2 className="section-title">Later, only if the lab stays the product</h2>
      <ul className="later-list">
        <li>
          <span className="later-tag">No</span>
          A WASM compiler, a C++ interpreter, or an ABI-accurate layout engine. Link out
          to Godbolt, Insights, and cxxfilt instead.
        </li>
        <li>
          <span className="later-tag">Maybe</span>
          A small companion C++ program this lab explains — a layout dumper or a tiny
          lifetime demo — so the portfolio is not TypeScript alone.
        </li>
      </ul>
    </section>
  )
}
