import { useState, useRef } from 'react'

// Seuil de confiance minimum pour valider une détection (60%)
const CONFIDENCE_THRESHOLD = 0.6

// Durée pendant laquelle la même émotion doit être détectée pour être validée
const STABILITY_DELAY = 3000 // 3 secondes

// 🎯 BUT : Stabilise la détection d'émotion pour éviter les changements intempestifs
//
// 💡 CONCEPT : Pourquoi ce hook ?
//   face-api.js détecte une émotion toutes les 1.5s. Sans filtre, la playlist
//   changerait constamment (flickering). Ce hook implémente un "debounce temporel" :
//   une émotion doit être STABLE (identique) pendant 3s avant d'être validée.
//
// 💡 useRef vs useState pour le candidat :
//   Le candidat (émotion en cours d'évaluation + timestamp) change à chaque frame
//   mais ne doit PAS déclencher de re-render. useRef est parfait pour ça :
//   il persiste entre les renders sans en provoquer de nouveaux.
//
// @returns {{
//   stableEmotion: string | null,   — l'émotion validée (stable depuis 3s)
//   confidence: number,             — confiance de la dernière détection stable
//   secondsLeft: number,            — secondes restantes avant validation
//   reportEmotion: function         — à appeler à chaque frame de détection
// }}
export function useEmotionStability() {
  const [stableEmotion, setStableEmotion] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)

  // Stocke le candidat courant : { emotion, confidence, since }
  // ⚠️ useRef car on ne veut pas de re-render à chaque frame caméra
  const candidateRef = useRef(null)

  // 🎯 BUT : Reçoit une détection brute et décide si l'émotion est stable
  // @param emotion    {string} - émotion normalisée ex: "happy"
  // @param confidence {number} - score entre 0 et 1
  function reportEmotion(emotion, conf) {
    // Filtre 1 : confiance trop faible → on ignore
    if (conf < CONFIDENCE_THRESHOLD) {
      candidateRef.current = null
      setSecondsLeft(0)
      return
    }

    const now = Date.now()
    const candidate = candidateRef.current

    // Filtre 2 : l'émotion a changé → on repart de zéro
    if (!candidate || candidate.emotion !== emotion) {
      candidateRef.current = { emotion, confidence: conf, since: now }
      setSecondsLeft(Math.ceil(STABILITY_DELAY / 1000))
      return
    }

    // Même émotion : on calcule le temps écoulé
    const elapsed = now - candidate.since
    const remaining = Math.max(0, STABILITY_DELAY - elapsed)
    setSecondsLeft(Math.ceil(remaining / 1000))

    // ✅ Émotion stable depuis assez longtemps → on la valide
    if (elapsed >= STABILITY_DELAY) {
      setStableEmotion(emotion)
      setConfidence(conf)
      // Reset du timestamp pour éviter de valider en boucle
      candidateRef.current = { emotion, confidence: conf, since: now }
    }
  }

  return { stableEmotion, confidence, secondsLeft, reportEmotion }
}
