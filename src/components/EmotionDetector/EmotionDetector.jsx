import { useRef, useEffect, useState, useCallback } from 'react'
import { loadModels, detectEmotion } from '../../services/faceApi'
import { normalizeEmotion } from '../../utils/emotionMapping'
import './EmotionDetector.css'

// Intervalle entre chaque analyse (en ms)
// 💡 1500ms = assez rapide pour capter les changements, assez lent pour ne pas surcharger le CPU
const DETECTION_INTERVAL = 1500

// 🎯 BUT : Affiche la caméra et détecte les émotions en continu
// @param onDetect {function({ emotion, confidence })} - appelée à chaque détection valide
// @param paused   {boolean} - si true, met la détection en pause (sans arrêter la caméra)
function EmotionDetector({ onDetect, paused = false }) {
  const videoRef = useRef(null)
  const intervalRef = useRef(null) // 💡 useRef pour stocker le timer sans déclencher de re-render

  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState(null) // { emotion, confidence } de la dernière frame
  const [error, setError] = useState(null)

  // 💡 Quand paused passe à true (émotion stable détectée), on arrête l'interval
  useEffect(() => {
    if (paused) {
      clearInterval(intervalRef.current)
      setRunning(false)
      setLastResult(null)
    }
  }, [paused])

  // Démarre la caméra et charge les modèles IA au montage du composant
  useEffect(() => {
    let stream

    loadModels()

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(s => {
        stream = s
        videoRef.current.srcObject = s
        videoRef.current.onloadedmetadata = () => setReady(true)
      })
      .catch(err => setError(err.message))

    // Nettoyage : on coupe la caméra quand on quitte la page
    return () => {
      stream?.getTracks().forEach(t => t.stop())
      clearInterval(intervalRef.current)
    }
  }, [])

  // 🎯 BUT : Lance une analyse toutes les DETECTION_INTERVAL ms
  // 💡 CONCEPT : useCallback évite de recréer cette fonction à chaque render
  //    ce qui est important car elle est utilisée dans un setInterval
  const startDetection = useCallback(() => {
    setRunning(true)
    setError(null)

    intervalRef.current = setInterval(async () => {
      const raw = await detectEmotion(videoRef.current)

      if (!raw) {
        setLastResult(null)
        return
      }

      const emotion = normalizeEmotion(raw.emotion)
      const result = { emotion, confidence: raw.confidence }

      setLastResult(result)
      // On remonte le résultat brut au parent (useEmotionStability filtrera ensuite)
      onDetect(result)
    }, DETECTION_INTERVAL)
  }, [onDetect])

  // 🎯 BUT : Arrête la détection continue
  function stopDetection() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setLastResult(null)
  }

  if (error && !ready) {
    return <p className="error">Caméra inaccessible : {error}</p>
  }

  return (
    <div className="emotion-detector">
      <video ref={videoRef} autoPlay muted playsInline className="camera-video" />

      <div className="detector-controls">
        {!running ? (
          <button onClick={startDetection} disabled={!ready}>
            Démarrer la détection
          </button>
        ) : (
          <button onClick={stopDetection} className="stop-btn">
            Arrêter
          </button>
        )}
      </div>

      {/* Affichage temps réel de la dernière détection */}
      {running && lastResult && (
        <p className="detection-live">
          Détecté : <strong>{lastResult.emotion}</strong> — confiance : <strong>{Math.round(lastResult.confidence * 100)}%</strong>
        </p>
      )}

      {running && !lastResult && (
        <p className="detection-live">Recherche d'un visage...</p>
      )}

      {error && ready && <p className="error">{error}</p>}
    </div>
  )
}

export default EmotionDetector
