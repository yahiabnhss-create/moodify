import { useRef, useEffect, useState } from 'react'
import { loadModels, detectEmotion } from '../../services/faceApi'
import { normalizeEmotion } from '../../utils/emotionMapping'
import './EmotionDetector.css'

// Affiche la caméra et un bouton pour détecter l'émotion
// Appelle onDetect(emotion) quand une émotion est trouvée
function EmotionDetector({ onDetect }) {
  const videoRef = useRef(null)          // référence vers l'élément <video>
  const [ready, setReady] = useState(false)      // la caméra est prête ?
  const [detecting, setDetecting] = useState(false) // analyse en cours ?
  const [error, setError] = useState(null)

  // Au chargement : démarre la caméra et charge les modèles IA
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

    // Quand on quitte la page, on coupe la caméra
    return () => stream?.getTracks().forEach(t => t.stop())
  }, [])

  // Appelée quand l'utilisateur clique sur "Détecter"
  async function handleDetect() {
    setDetecting(true)
    setError(null)

    const raw = await detectEmotion(videoRef.current)

    if (!raw) {
      setError('Aucun visage détecté. Place-toi face à la caméra et réessaie.')
    } else {
      onDetect(normalizeEmotion(raw)) // ex: "fearful" → "sad"
    }

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
