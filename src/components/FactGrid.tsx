import type { Fact } from '../curriculum/schema.ts'

export function FactGrid({ facts }: { facts: Fact[] }) {
  return (
    <div className="fact-grid">
      {facts.map((f) => (
        <article key={f.label} className="fact-card">
          <h3>{f.label}</h3>
          <p>{f.body}</p>
        </article>
      ))}
    </div>
  )
}
