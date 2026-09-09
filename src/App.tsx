import { useEffect, useState } from 'react'
import { Overview } from './components/Overview.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { TopicMissing, TopicPage } from './components/TopicPage.tsx'
import { getTopic } from './curriculum/index.ts'
import { homeHash, navigate, readRoute, type Route } from './lib/hashRoute.ts'

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const topic = route.page === 'topic' ? getTopic(route.id) : undefined
  const activeId = route.page === 'topic' ? route.id : null

  return (
    <div className="app">
      <Sidebar activeId={activeId} onGoHome={() => navigate(homeHash())} />
      <main className="content">
        {route.page === 'home' && <Overview />}
        {route.page === 'topic' && topic && <TopicPage topic={topic} />}
        {route.page === 'topic' && !topic && <TopicMissing id={route.id} />}
      </main>
    </div>
  )
}
