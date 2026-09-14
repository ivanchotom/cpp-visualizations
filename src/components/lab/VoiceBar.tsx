import { useEffect, useState } from 'react'
import { canSpeak, speak, stopSpeech } from '../../lib/speech.ts'

export function VoiceBar({
  title,
  text,
  onCopy,
}: {
  title: string
  text: string
  onCopy?: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const supported = canSpeak()

  useEffect(() => {
    return () => stopSpeech()
  }, [])

  async function play() {
    if (playing) {
      stopSpeech()
      setPlaying(false)
      return
    }
    setPlaying(true)
    await speak(text)
    setPlaying(false)
  }

  return (
    <div className="voice-bar">
      <div className="voice-bar-head">
        <span className="voice-kicker">Voice</span>
        <strong>{title}</strong>
      </div>
      <p className="voice-script">{text}</p>
      <div className="voice-actions">
        <button className={`chip${playing ? ' chip--active' : ''}`} type="button" onClick={() => void play()}>
          {playing ? 'Stop' : supported ? 'Play voice' : 'Voice unavailable — read the script'}
        </button>
        <button
          className="chip chip--ghost"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text)
            onCopy?.()
          }}
        >
          Copy script
        </button>
      </div>
    </div>
  )
}
