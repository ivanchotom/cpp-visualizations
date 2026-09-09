import { tracks, topicsInTrack, topicCount, vizCount } from '../curriculum/index.ts'
import { topicHash } from '../lib/hashRoute.ts'

export function Overview() {
  return (
    <section className="view">
      <header className="view-head">
        <p className="kicker">Interactive C++14 cheatsheet</p>
        <h1>Rehash the whole language, not just the types.</h1>
        <p>
          The original three views — sizes, padding, a handful of idioms — are still here.
          Around them is a full curriculum: compilation, memory, functions, classes,
          templates, the standard library, and the pitfalls that actually bite. Every
          topic is a compact cheatsheet. Dots in the sidebar mark a live visualization.
        </p>
      </header>

      <div className="hero-stats">
        <div className="stat">
          <span className="stat-value">{topicCount}</span>
          <span className="stat-label">topics</span>
        </div>
        <div className="stat">
          <span className="stat-value">{vizCount}</span>
          <span className="stat-label">visualizations</span>
        </div>
        <div className="stat">
          <span className="stat-value">{tracks.length}</span>
          <span className="stat-label">tracks</span>
        </div>
        <div className="stat">
          <span className="stat-value">14</span>
          <span className="stat-label">language standard</span>
        </div>
      </div>

      <div className="track-grid">
        {tracks.map((track) => {
          const topics = topicsInTrack(track)
          const vis = topics.filter((t) => t.viz).length
          return (
            <article key={track.id} className="track-card">
              <div className="track-card-head">
                <span className="nav-icon">{track.icon}</span>
                <div>
                  <h2>{track.title}</h2>
                  <p>{track.blurb}</p>
                </div>
              </div>
              <p className="track-meta">
                {topics.length} topics
                {vis > 0 ? ` · ${vis} visual` : ''}
              </p>
              <div className="track-chips">
                {topics.map((t) => (
                  <a key={t.id} className="chip chip--link" href={topicHash(t.id)}>
                    {t.title}
                    {t.viz ? ' ◈' : ''}
                  </a>
                ))}
              </div>
            </article>
          )
        })}
      </div>

      <p className="overview-foot">
        Later-standard notes appear on a topic when C++17/20/23 changed the picture —
        examples stay C++14.
      </p>
    </section>
  )
}
