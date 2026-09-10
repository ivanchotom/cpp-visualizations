import { topics } from '../curriculum/index.ts'
import type { Lab } from './schema.ts'
import { foundationsLabs } from './labs/foundations.ts'
import { memoryLabs } from './labs/memory.ts'
import { functionsLabs } from './labs/functions.ts'
import { classesLabs } from './labs/classes.ts'
import { templatesLabs } from './labs/templates.ts'
import { errorsLabs } from './labs/errors.ts'
import { stdlibLabs } from './labs/stdlib.ts'
import { idiomsLabs } from './labs/idioms.ts'

export type { Lab, Scene, Stage } from './schema.ts'

const allLabs: Lab[] = [
  ...foundationsLabs,
  ...memoryLabs,
  ...functionsLabs,
  ...classesLabs,
  ...templatesLabs,
  ...errorsLabs,
  ...stdlibLabs,
  ...idiomsLabs,
]

const byId = new Map(allLabs.map((l) => [l.topicId, l]))

for (const topic of topics) {
  if (!byId.has(topic.id)) {
    throw new Error(`Topic "${topic.id}" has no lab`)
  }
}

for (const lab of allLabs) {
  if (lab.scenes.length === 0) {
    throw new Error(`Lab "${lab.topicId}" has no scenes`)
  }
}

export function getLab(topicId: string): Lab {
  const lab = byId.get(topicId)
  if (!lab) {
    throw new Error(`No lab for topic "${topicId}"`)
  }
  return lab
}

export function allVoiceScripts(): { topicId: string; title: string; text: string }[] {
  const out: { topicId: string; title: string; text: string }[] = []
  for (const lab of allLabs) {
    out.push({ topicId: lab.topicId, title: `${lab.topicId} · hook`, text: lab.hook })
    for (const scene of lab.scenes) {
      out.push({ topicId: lab.topicId, title: `${lab.topicId} · ${scene.title}`, text: scene.voice })
      if (scene.try.type === 'pick') {
        for (const opt of scene.try.options) {
          out.push({
            topicId: lab.topicId,
            title: `${lab.topicId} · ${scene.title} · ${opt.label}`,
            text: opt.voice,
          })
        }
      }
      if (scene.try.type === 'code') {
        for (const run of scene.try.runs) {
          out.push({
            topicId: lab.topicId,
            title: `${lab.topicId} · ${scene.title} · run`,
            text: run.voice,
          })
        }
        out.push({
          topicId: lab.topicId,
          title: `${lab.topicId} · ${scene.title} · fallback`,
          text: scene.try.fallback.voice,
        })
      }
    }
  }
  return out
}

export const labCount = allLabs.length
