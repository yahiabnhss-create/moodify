import { useRef, useEffect, useState } from 'react'
import { loadModels, detectEmotion } from '../../services/faceApi'
import { normalizeEmotion } from '../../utils/emotionMapping'
import './EmotionDetector.css'

const CONFIDENCE_THRESHOLD = 0.5

// 🎯 BUT : Affiche la caméra et détecte l'émotion au clic sur un bouton
// @param onDetect {function({ emotion, confidence })} - appelée quand une émotion est trouvée
function EmotionDetector({ onDetect }) {
  const videoRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState(null)

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

    return () => stream?.getTracks().forEach(t => t.stop())
  }, [])

  // 🎯 BUT : Déclenche UNE seule analyse à la demande de l'utilisateur
  async function handleDetect() {
    setDetecting(true)
    setError(null)

    const raw = await detectEmotion(videoRef.current)

    if (!raw) {
      setError('Aucun visage détecté. Place-toi face à la caméra et réessaie.')
      setDetecting(false)
      return
    }

    if (raw.confidence < CONFIDENCE_THRESHOLD) {
      setError(`Confiance trop faible (${Math.round(raw.confidence * 100)}%). Réessaie.`)
      setDetecting(false)
      return
    }

    // On remonte l'émotion normalisée au composant parent
    onDetect({ emotion: normalizeEmotion(raw.emotion), confidence: raw.confidence })
    setDetecting(false)
  }

  if (error && !ready) {
    return <p className="error">Caméra inaccessible : {error}</p>
  }

  return (
    <div className="emotion-detector">
      <video ref={videoRef} autoPlay muted playsInline className="camera-video" />

      <button onClick={handleDetect} disabled={!ready || detecting}>
        {detecting ? 'Analyse en cours...' : 'Détecter mon humeur'}
      </button>

      {error && ready && <p className="error">{error}</p>}
    </div>
  )
}

export default EmotionDetector
