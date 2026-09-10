import { useState } from 'react'
import { matchCodeRun } from '../../lab/runCode.ts'
import type { Stage, TryIt } from '../../lab/schema.ts'
import { SceneStage } from './SceneStage.tsx'

export function TryPanel({
  spec,
  baseStage,
  onVoice,
}: {
  spec: TryIt
  baseStage: Stage
  onVoice: (text: string) => void
}) {
  const [pick, setPick] = useState(0)
  const [code, setCode] = useState(spec.type === 'code' ? spec.starter : '')
  const [ran, setRan] = useState<null | { voice: string; verdict: string; stage: Stage }>(null)

  if (spec.type === 'none') {
    return (
      <div className="try-panel">
        <p className="try-prompt">Drive the visualization above — every control changes what you see.</p>
        <SceneStage stage={baseStage} />
      </div>
    )
  }

  if (spec.type === 'pick') {
    const opt = spec.options[pick] ?? spec.options[0]
    return (
      <div className="try-panel">
        <p className="try-prompt">{spec.prompt}</p>
        <div className="stepper">
          {spec.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              className={`chip${i === pick ? ' chip--active' : ''}`}
              onClick={() => {
                setPick(i)
                onVoice(o.voice)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        {opt.code && (
          <pre className="try-code">
            <code>{opt.code}</code>
          </pre>
        )}
        <SceneStage stage={opt.stage} />
        <p className="try-verdict">{opt.verdict}</p>
      </div>
    )
  }

  const result = ran ?? matchCodeRun(spec, code)

  return (
    <div className="try-panel">
      <p className="try-prompt">{spec.prompt}</p>
      <label className="try-editor">
        <span>Edit the C++14 snippet, then run the visualizer</span>
        <textarea
          value={code}
          spellCheck={false}
          onChange={(e) => {
            setCode(e.target.value)
            setRan(null)
          }}
        />
      </label>
      <div className="stepper">
        <button
          type="button"
          className="chip chip--active"
          onClick={() => {
            const next = matchCodeRun(spec, code)
            setRan(next)
            onVoice(next.voice)
          }}
        >
          Visualize this code
        </button>
        <button
          type="button"
          className="chip chip--ghost"
          onClick={() => {
            setCode(spec.starter)
            setRan(null)
            onVoice(spec.fallback.voice)
          }}
        >
          Reset snippet
        </button>
      </div>
      <SceneStage stage={result.stage} />
      <p className="try-verdict">{result.verdict}</p>
    </div>
  )
}
