import { useState } from 'react'
import { cppPatterns } from '../data/patterns.ts'

export function PatternsView() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(title: string, code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(title)
      window.setTimeout(() => setCopied((c) => (c === title ? null : c)), 1500)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="viz-root">
      <div className="pattern-grid">
        {cppPatterns.map((p) => (
          <article key={p.title} className="pattern-card">
            <div className="pattern-head">
              <div>
                <h2>{p.title}</h2>
                <span className="pattern-tag">{p.tagline}</span>
              </div>
              <button
                className="copy-btn"
                onClick={() => copy(p.title, p.code)}
                aria-label={`copy ${p.title} snippet`}
              >
                {copied === p.title ? 'copied!' : 'copy'}
              </button>
            </div>
            <pre className="code-block">
              <code>{p.code}</code>
            </pre>
            <p className="pattern-explain">{p.explanation}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
