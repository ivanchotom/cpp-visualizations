import { useEffect, useState } from 'react'
import { waitNextBeat } from '../motion.ts'

/** Play a scene one beat at a time. No flyers, no hop() — the canvas owns motion. */
export function useBeats(stepCount: number, stepMs = 1500) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    return waitNextBeat(stepMs, () => {
      if (i >= stepCount - 1) {
        setPlaying(false)
        return
      }
      setI((n) => n + 1)
    })
  }, [playing, i, stepCount, stepMs])

  function play() {
    setI(0)
    setPlaying(true)
  }

  function reset() {
    setPlaying(false)
    setI(0)
  }

  function jump(n: number) {
    if (playing) return
    setI(Math.max(0, Math.min(stepCount - 1, n)))
  }

  return { i, playing, play, reset, jump }
}
