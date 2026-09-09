import { tracks } from './tracks.ts'
import { moreTopics } from './topics.more.ts'
import { topics as coreTopics } from './topics.ts'
import type { Topic, Track, TrackId } from './schema.ts'

export type { Topic, Track, TrackId, VizKind, Fact, CodeSample, LaterNote } from './schema.ts'
export { tracks } from './tracks.ts'

export const topics: Topic[] = [...coreTopics, ...moreTopics]

const topicById = new Map(topics.map((t) => [t.id, t]))
const trackById = new Map(tracks.map((t) => [t.id, t]))

export function getTopic(id: string): Topic | undefined {
  return topicById.get(id)
}

export function getTrack(id: TrackId): Track | undefined {
  return trackById.get(id)
}

export function topicsInTrack(track: Track): Topic[] {
  return track.topicIds.map((id) => {
    const topic = topicById.get(id)
    if (!topic) {
      throw new Error(`Track "${track.id}" references unknown topic "${id}"`)
    }
    return topic
  })
}

export function searchTopics(query: string): Topic[] {
  const q = query.trim().toLowerCase()
  if (!q) return topics
  return topics.filter((t) => {
    if (t.title.toLowerCase().includes(q)) return true
    if (t.blurb.toLowerCase().includes(q)) return true
    if (t.id.toLowerCase().includes(q)) return true
    return t.keywords.some((k) => k.toLowerCase().includes(q))
  })
}

export const topicCount = topics.length
export const vizCount = topics.filter((t) => t.viz).length

for (const track of tracks) {
  for (const id of track.topicIds) {
    if (!topicById.has(id)) {
      throw new Error(`Track "${track.id}" references unknown topic "${id}"`)
    }
  }
}

for (const topic of topics) {
  if (!trackById.has(topic.track)) {
    throw new Error(`Topic "${topic.id}" has unknown track "${topic.track}"`)
  }
  const home = trackById.get(topic.track)
  if (home && !home.topicIds.includes(topic.id)) {
    throw new Error(`Topic "${topic.id}" is not listed on track "${topic.track}"`)
  }
  for (const id of topic.related) {
    if (!topicById.has(id)) {
      throw new Error(`Topic "${topic.id}" relates to unknown "${id}"`)
    }
  }
}
