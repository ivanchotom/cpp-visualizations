import { allVoiceScripts } from '../lab/index.ts'
import { VoiceBar } from './lab/VoiceBar.tsx'

export function VoiceBook() {
  const scripts = allVoiceScripts()
  return (
    <section className="view">
      <header className="view-head">
        <p className="kicker">Voice scripts</p>
        <h1>What to record</h1>
        <p>
          Each block is one clip. Record them in a quiet room, British or whatever voice
          you want, slightly slower than conversation. Name files{' '}
          <code>topic--scene.wav</code> if you later drop them into{' '}
          <code>public/voice/</code>. Until then, Play voice uses the browser synthesizer
          and Copy script puts the text on the clipboard.
        </p>
      </header>
      <p className="overview-foot">{scripts.length} clips · read as if you are at a whiteboard</p>
      {scripts.map((s) => (
        <VoiceBar key={s.title} title={s.title} text={s.text} />
      ))}
    </section>
  )
}
