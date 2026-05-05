import { useCallback, useState, useRef } from 'react'

export const EMOTION_CONFIDENCE_THRESHOLD = 0.6
export const EMOTION_STABILITY_DELAY = 3000

export function useEmotionStability() {
  const [stableEmotion, setStableEmotion] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const candidateRef = useRef(null)

  const reportEmotion = useCallback((emotion, conf) => {
    if (conf < EMOTION_CONFIDENCE_THRESHOLD) {
      candidateRef.current = null
      setSecondsLeft(0)
      return null
    }

    const now = Date.now()
    const candidate = candidateRef.current

    if (!candidate || candidate.emotion !== emotion) {
      candidateRef.current = { emotion, confidence: conf, since: now }
      setSecondsLeft(Math.ceil(EMOTION_STABILITY_DELAY / 1000))
      return null
    }

    const elapsed = now - candidate.since
    const remaining = Math.max(0, EMOTION_STABILITY_DELAY - elapsed)
    setSecondsLeft(Math.ceil(remaining / 1000))

    if (elapsed >= EMOTION_STABILITY_DELAY) {
      setStableEmotion(emotion)
      setConfidence(conf)
      candidateRef.current = { emotion, confidence: conf, since: now }
      return { emotion, confidence: conf }
    }

    return null
  }, [])

  const resetEmotion = useCallback(() => {
    setStableEmotion(null)
    setConfidence(0)
    setSecondsLeft(0)
    candidateRef.current = null
  }, [])

  return { stableEmotion, confidence, secondsLeft, reportEmotion, resetEmotion }
}
