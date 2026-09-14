import { useState } from 'react'
import { getLab } from '../../lab/index.ts'
import type { Topic } from '../../curriculum/schema.ts'
import { VoiceBar } from './VoiceBar.tsx'
import { TryPanel } from './TryPanel.tsx'
import { VizSlot } from '../viz/VizSlot.tsx'

export function TopicLab({ topic }: { topic: Topic }) {
  const lab = getLab(topic.id)
  const [sceneI, setSceneI] = useState(0)
  const [spoken, setSpoken] = useState<string | null>(null)

  const scene = lab.scenes[Math.min(sceneI, lab.scenes.length - 1)] ?? lab.scenes[0]
  const voiceText = spoken ?? scene.voice

  return (
    <div className="topic-lab">
      <p className="lab-hook">{lab.hook}</p>

      {lab.scenes.length > 1 && (
        <div className="stepper">
          {lab.scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`chip${i === sceneI ? ' chip--active' : ''}`}
              onClick={() => {
                setSceneI(i)
                setSpoken(null)
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      <VoiceBar title={scene.title} text={voiceText} />

      {lab.customViz && (
        <div className="viz-slot lab-embed">
          <VizSlot kind={lab.customViz} />
        </div>
      )}

      {scene.code && !lab.customViz && (
        <pre className="try-code try-code--scene">
          <code>{scene.code}</code>
        </pre>
      )}

      <TryPanel spec={scene.try} baseStage={scene.stage} onVoice={setSpoken} />
    </div>
  )
}
