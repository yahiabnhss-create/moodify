import { useRef, useEffect, useState, useCallback } from 'react'
import { loadModels, detectEmotion } from '../../services/faceApi'
import { normalizeEmotion } from '../../utils/emotionMapping'
import './EmotionDetector.css'

const CONFIDENCE_THRESHOLD = 0.5

function EmotionDetector({ onDetect }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = useCallback(async () => {
    setError(null)
    setReady(false)
    try {
      loadModels()
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [startCamera])

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

    onDetect({ emotion: normalizeEmotion(raw.emotion), confidence: raw.confidence })
    setDetecting(false)
  }

  if (error && !ready) {
    return (
      <div className="emotion-detector">
        <p className="error">
          Caméra inaccessible — autorise l'accès dans les paramètres du navigateur.
        </p>
        <button onClick={startCamera}>Réessayer</button>
      </div>
    )
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
