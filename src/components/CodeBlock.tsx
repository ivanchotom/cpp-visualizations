import { useCopied } from '../lib/useCopied.ts'

export function CodeBlock({
  title,
  snippet,
  notes,
}: {
  title?: string
  snippet: string
  notes?: string
}) {
  const { copied, copy } = useCopied()
  const key = title ?? snippet.slice(0, 24)

  return (
    <div className="code-panel">
      <div className="code-panel-bar">
        <span className="code-panel-title">{title ?? 'C++14'}</span>
        <button
          className="copy-btn"
          onClick={() => copy(key, snippet)}
          aria-label="copy snippet"
        >
          {copied === key ? 'copied!' : 'copy'}
        </button>
      </div>
      <pre className="code-block">
        <code>{snippet}</code>
      </pre>
      {notes && <p className="code-panel-notes">{notes}</p>}
    </div>
  )
}
