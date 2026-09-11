import type { ReactNode } from 'react'

export interface SceneMode {
  id: string
  title: string
}

export function SceneShell({
  modes,
  mode,
  onSelect,
  playing,
  onPlay,
  onReset,
  playLabel,
  step,
  stepCount,
  sig,
  caption,
  code,
  tone = 'idle',
  footer,
  children,
}: {
  modes?: SceneMode[]
  mode?: string
  onSelect?: (id: string) => void
  playing: boolean
  onPlay: () => void
  onReset: () => void
  playLabel: string
  step: number
  stepCount: number
  sig?: string
  caption: string
  code?: string
  tone?: 'idle' | 'ok' | 'warn' | 'trap'
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="viz viz--col">
      <div className="stepper">
        {modes?.map((m) => (
          <button
            key={m.id}
            className={`chip${mode === m.id ? ' chip--active' : ''}`}
            onClick={() => onSelect?.(m.id)}
            disabled={playing}
          >
            {m.title}
          </button>
        ))}
        <button className="chip chip--play" onClick={onPlay} disabled={playing}>
          {playLabel}
        </button>
        <button className="chip chip--ghost" onClick={onReset}>
          reset
        </button>
      </div>

      <div className={`fx-stage fx-stage--${tone}`}>
        <div className="fx-hud">
          <p className="fx-step">
            Step {step + 1}/{stepCount}
            {sig ? (
              <>
                {' · '}
                <code>{sig}</code>
              </>
            ) : null}
          </p>
          <div className="fx-beats" aria-hidden>
            {Array.from({ length: stepCount }, (_, n) => (
              <span
                key={n}
                className={`fx-beat${n === step ? ' fx-beat--on' : ''}${n < step ? ' fx-beat--done' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="fx-canvas">{children}</div>
      </div>

      {code ? (
        <pre className="code-block sh-code">
          <code>{code}</code>
        </pre>
      ) : null}
      <p className="layout-hint">{caption}</p>
      {footer}
    </div>
  )
}
