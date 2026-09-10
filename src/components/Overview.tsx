import { labCount } from '../lab/index.ts'
import { tracks, topicsInTrack, topicCount } from '../curriculum/index.ts'
import { aheadHash, topicHash, voiceHash } from '../lib/hashRoute.ts'

export function Overview() {
  return (
    <section className="view">
      <header className="view-head">
        <p className="kicker">C++ object-model lab</p>
        <h1>I made the C++ object model visible.</h1>
        <p>
          A public visual lab for the pictures seniors still draw badly on a whiteboard:
          identity versus steal, constructor order and unwind, ownership contracts, and
          why <code>static_cast&lt;BaseB*&gt;(p)</code> moves the address. Not a personal
          vault. Not a textbook. Not Compiler Explorer, C++ Insights, cxxfilt, or Python
          Tutor — those remain the references. Every topic is a cheatsheet plus a lab you
          can click, type into, and hear.
        </p>
      </header>

      <div className="hero-stats">
        <div className="stat">
          <span className="stat-value">{topicCount}</span>
          <span className="stat-label">topics</span>
        </div>
        <div className="stat">
          <span className="stat-value">{labCount}</span>
          <span className="stat-label">labs with voice</span>
        </div>
        <div className="stat">
          <span className="stat-value">{tracks.length}</span>
          <span className="stat-label">guided tracks</span>
        </div>
        <div className="stat">
          <span className="stat-value">14</span>
          <span className="stat-label">language standard</span>
        </div>
      </div>

      <p className="lab-refs">
        <a className="chip chip--link" href={aheadHash()}>
          Plans ahead
        </a>
        <a className="chip chip--link" href={voiceHash()}>
          Voice scripts to record
        </a>
      </p>

      <div className="track-grid">
        {tracks.map((track) => {
          const topics = topicsInTrack(track)
          return (
            <article key={track.id} className="track-card">
              <div className="track-card-head">
                <span className="nav-icon">{track.icon}</span>
                <div>
                  <h2>{track.title}</h2>
                  <p>{track.blurb}</p>
                </div>
              </div>
              <p className="track-meta">{topics.length} labs · visualize + voice + try</p>
              <div className="track-chips">
                {topics.map((t) => (
                  <a key={t.id} className="chip chip--link" href={topicHash(t.id)}>
                    {t.title}
                  </a>
                ))}
              </div>
            </article>
          )
        })}
      </div>

      <p className="overview-foot">
        Snippets stay C++14. Later-standard notes appear when 17/20/23 changed the picture.
        Sizes assume typical 64-bit LP64 — not a compiler dump.
      </p>
    </section>
  )
}
