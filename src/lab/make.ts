import type { Lab, Scene } from './schema.ts'
import type { VizKind } from '../curriculum/schema.ts'

export function lab(topicId: string, hook: string, scenes: Scene[], customViz?: VizKind): Lab {
  return { topicId, hook, customViz, scenes }
}
