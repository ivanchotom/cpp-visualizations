import type { ReactNode } from 'react'
import { getTopic, getTrack, type Topic } from '../curriculum/index.ts'
import { topicHash } from '../lib/hashRoute.ts'
import { CodeBlock } from './CodeBlock.tsx'
import { FactGrid } from './FactGrid.tsx'
import { VizSlot } from './viz/VizSlot.tsx'

export function TopicPage({ topic }: { topic: Topic }) {
  const track = getTrack(topic.track)
  const viz = topic.viz ? <VizSlot kind={topic.viz} /> : null

  return (
    <section className="view">
      <header className="view-head">
        {track && <p className="kicker">{track.title}</p>}
        <h1>{topic.title}</h1>
        <p>{topic.summary}</p>
      </header>

      {viz && <div className="viz-slot">{viz}</div>}

      <h2 className="section-title">Key facts</h2>
      <FactGrid facts={topic.facts} />

      {topic.code.length > 0 && (
        <>
          <h2 className="section-title">C++14</h2>
          <div className="code-stack">
            {topic.code.map((c) => (
              <CodeBlock
                key={c.title}
                title={c.title}
                snippet={c.snippet}
                notes={c.notes}
              />
            ))}
          </div>
        </>
      )}

      {topic.pitfalls.length > 0 && (
        <>
          <h2 className="section-title">Watch out</h2>
          <ul className="pitfall-list">
            {topic.pitfalls.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}

      {topic.later && topic.later.length > 0 && (
        <>
          <h2 className="section-title">Looking ahead</h2>
          <ul className="later-list">
            {topic.later.map((n) => (
              <li key={n.standard}>
                <span className="later-tag">{n.standard}</span>
                {n.note}
              </li>
            ))}
          </ul>
        </>
      )}

      {topic.related.length > 0 && (
        <>
          <h2 className="section-title">Related</h2>
          <div className="related-row">
            {topic.related.map((id) => (
              <RelatedChip key={id} id={id} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function RelatedChip({ id }: { id: string }) {
  const topic = getTopic(id)
  return (
    <a className="chip chip--link" href={topicHash(id)}>
      {topic?.title ?? id}
    </a>
  )
}

export function TopicMissing({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <section className="view">
      <header className="view-head">
        <h1>Unknown topic</h1>
        <p>
          No page named <code>{id}</code>. Use the sidebar or go back to the overview.
        </p>
      </header>
      {children}
    </section>
  )
}
