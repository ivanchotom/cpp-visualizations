import { useEffect, useMemo, useState } from 'react'
import { searchTopics, tracks, topicsInTrack, type Topic } from '../curriculum/index.ts'
import { topicHash } from '../lib/hashRoute.ts'

export function Sidebar({
  activeId,
  onGoHome,
}: {
  activeId: string | null
  onGoHome: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tracks.map((t) => [t.id, true])),
  )

  const filtered = useMemo(() => searchTopics(query), [query])
  const filteredIds = useMemo(() => new Set(filtered.map((t) => t.id)), [filtered])
  const searching = query.trim().length > 0

  useEffect(() => {
    if (!searching) return
    setOpen((prev) => {
      const next = { ...prev }
      for (const track of tracks) {
        next[track.id] = track.topicIds.some((id) => filteredIds.has(id))
      }
      return next
    })
  }, [searching, filteredIds])

  return (
    <aside className="sidebar">
      <button className="brand brand--link" onClick={onGoHome}>
        <span className="brand-badge">C++</span>
        <div>
          <div className="brand-title">Object model</div>
          <div className="brand-sub">visual lab · C++14</div>
        </div>
      </button>

      <label className="search">
        <span className="search-label">Search</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="templates, vtable, UB…"
          type="search"
        />
      </label>

      <nav className="nav" aria-label="Curriculum">
        {tracks.map((track) => {
          const visible = topicsInTrack(track).filter((t) => filteredIds.has(t.id))
          if (searching && visible.length === 0) return null
          const isOpen = open[track.id] ?? true
          return (
            <div key={track.id} className="nav-group">
              <button
                className="nav-group-toggle"
                onClick={() => setOpen((s) => ({ ...s, [track.id]: !isOpen }))}
                aria-expanded={isOpen}
              >
                <span className="nav-icon">{track.icon}</span>
                <span className="nav-text">
                  <span className="nav-label">{track.title}</span>
                  <span className="nav-blurb">{track.blurb}</span>
                </span>
                <span className="nav-caret">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="nav-sub">
                  {visible.map((topic) => (
                    <TopicLink
                      key={topic.id}
                      topic={topic}
                      active={activeId === topic.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {searching && filtered.length === 0 && (
          <p className="nav-empty">No topics match “{query.trim()}”.</p>
        )}
      </nav>

      <footer className="sidebar-foot">
        {filtered.length} lab{filtered.length === 1 ? '' : 's'} · visualize + voice
        <br />
        <a href="#/ahead">Plans</a>
        {' · '}
        <a href="#/voice">Scripts</a>
      </footer>
    </aside>
  )
}

function TopicLink({ topic, active }: { topic: Topic; active: boolean }) {
  return (
    <a
      className={`nav-item nav-item--sub${active ? ' nav-item--active' : ''}`}
      href={topicHash(topic.id)}
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-label">{topic.title}</span>
      <span className="nav-viz-dot" title="Interactive lab with voice" />
    </a>
  )
}
