// Hook qui valide qu'une émotion est stable avant de la considérer comme définitive.
//
// Problème résolu : face-api.js détecte une émotion toutes les 800 ms, mais les résultats
// peuvent fluctuer rapidement (on peut passer de "happy" à "neutral" entre deux frames).
// On ne veut pas lancer une playlist sur une émotion fugace.
//
// Solution : une émotion doit être détectée en continu pendant EMOTION_STABILITY_DELAY (3s)
// avant d'être retournée comme "stable". Si l'émotion change entre deux frames, le compteur repart à zéro.

import { useCallback, useState, useRef } from 'react'

// Seuil de confiance minimum : en dessous de 60%, l'émotion est ignorée.
// Exporté car EmotionDetector.jsx l'utilise aussi pour afficher un message d'erreur.
export const EMOTION_CONFIDENCE_THRESHOLD = 0.6

// Durée pendant laquelle une même émotion doit rester détectée pour être validée (ms)
export const EMOTION_STABILITY_DELAY = 3000

export function useEmotionStability() {
  const [stableEmotion, setStableEmotion] = useState(null) // émotion validée (stable)
  const [confidence, setConfidence]       = useState(0)    // confiance de l'émotion stable
  const [secondsLeft, setSecondsLeft]     = useState(0)    // compte à rebours affiché dans l'UI

  // candidateRef stocke l'émotion candidate (pas encore stable) et l'heure de première détection.
  // On utilise un ref et pas un state car on ne veut pas provoquer de re-render lors de la mise à jour.
  const candidateRef = useRef(null) // { emotion, confidence, since }

  // Appelé à chaque frame de détection. Retourne l'émotion stable ou null.
  const reportEmotion = useCallback((emotion, conf) => {
    // Confidence insuffisante → réinitialise le candidat et ne valide rien
    if (conf < EMOTION_CONFIDENCE_THRESHOLD) {
      candidateRef.current = null
      setSecondsLeft(0)
      return null
    }

    const now       = Date.now()
    const candidate = candidateRef.current

    // Nouvelle émotion (ou première détection) → démarre un nouveau candidat avec le timer
    if (!candidate || candidate.emotion !== emotion) {
      candidateRef.current = { emotion, confidence: conf, since: now }
      setSecondsLeft(Math.ceil(EMOTION_STABILITY_DELAY / 1000)) // ex: 3
      return null
    }

    // Même émotion → on vérifie si la durée de stabilité est atteinte
    const elapsed   = now - candidate.since
    const remaining = Math.max(0, EMOTION_STABILITY_DELAY - elapsed)
    setSecondsLeft(Math.ceil(remaining / 1000))

    if (elapsed >= EMOTION_STABILITY_DELAY) {
      // L'émotion est stable depuis assez longtemps → on la valide
      setStableEmotion(emotion)
      setConfidence(conf)
      // On remet le candidat à "now" pour permettre de détecter à nouveau si besoin
      candidateRef.current = { emotion, confidence: conf, since: now }
      return { emotion, confidence: conf }
    }

    // Pas encore stable → on attend
    return null
  }, [])

  // Remet tout à zéro (appelé quand l'utilisateur relance la détection ou quitte)
  const resetEmotion = useCallback(() => {
    setStableEmotion(null)
    setConfidence(0)
    setSecondsLeft(0)
    candidateRef.current = null
  }, [])

  return { stableEmotion, confidence, secondsLeft, reportEmotion, resetEmotion }
}
