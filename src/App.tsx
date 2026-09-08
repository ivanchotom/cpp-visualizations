import { useState } from 'react'
import { DataTypesView } from './components/DataTypesView.tsx'
import { MemoryLayoutView } from './components/MemoryLayoutView.tsx'
import { PatternsView } from './components/PatternsView.tsx'

type Section = 'types' | 'memory' | 'patterns'

interface NavItem {
  id: Section
  label: string
  blurb: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'types', label: 'Data Types', blurb: 'Sizes & ranges', icon: '{ }' },
  { id: 'memory', label: 'Memory Layout', blurb: 'Alignment & padding', icon: '[#]' },
  { id: 'patterns', label: 'Common Patterns', blurb: 'Idioms & snippets', icon: '</>' },
]

export default function App() {
  const [section, setSection] = useState<Section>('types')

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">C++</span>
          <div>
            <div className="brand-title">Visualizations</div>
            <div className="brand-sub">interactive cheat sheet</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item${section === item.id ? ' nav-item--active' : ''}`}
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-blurb">{item.blurb}</span>
              </span>
            </button>
          ))}
        </nav>

        <footer className="sidebar-foot">
          Sizes reflect a typical 64-bit
          <br /> LP64 platform (Linux x86-64).
        </footer>
      </aside>

      <main className="content">
        {section === 'types' && <DataTypesView />}
        {section === 'memory' && <MemoryLayoutView />}
        {section === 'patterns' && <PatternsView />}
      </main>
    </div>
  )
}
