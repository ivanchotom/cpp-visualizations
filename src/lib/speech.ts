let speaking = false
let cancelled = false

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeech(): void {
  cancelled = true
  speaking = false
  if (canSpeak()) window.speechSynthesis.cancel()
}

export function speak(text: string): Promise<void> {
  stopSpeech()
  cancelled = false
  if (!canSpeak() || !text.trim()) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1
    u.lang = 'en-GB'
    u.onend = () => {
      speaking = false
      resolve()
    }
    u.onerror = () => {
      speaking = false
      resolve()
    }
    speaking = true
    window.speechSynthesis.speak(u)
  }).then(() => {
    if (cancelled) return
  })
}

export function isSpeaking(): boolean {
  return speaking
}

export async function speakQueue(
  parts: string[],
  onIndex: (i: number) => void,
): Promise<void> {
  cancelled = false
  for (let i = 0; i < parts.length; i++) {
    if (cancelled) return
    onIndex(i)
    await speak(parts[i])
  }
}
