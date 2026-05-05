import { useRef, useEffect, useState, useCallback } from 'react'
import { loadModels, detectEmotion } from '../../services/faceApi'
import {
  EMOTION_CONFIDENCE_THRESHOLD,
  useEmotionStability,
} from '../../hooks/useEmotionStability'
import { normalizeEmotion } from '../../utils/emotionMapping'
import './EmotionDetector.css'

const DETECTION_INTERVAL = 800
const MAX_DETECTION_DURATION = 10000

function getCameraErrorMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "L'accès à la caméra a été refusé. Autorise la webcam dans le navigateur et réessaie."
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return "Aucune webcam n'a été détectée sur cet appareil."
    case 'NotReadableError':
    case 'TrackStartError':
      return "La webcam est déjà utilisée par une autre application."
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return "Les paramètres demandés pour la webcam ne sont pas supportés par ce navigateur."
    case 'SecurityError':
      return 'La webcam nécessite une page sécurisée en https:// ou une ouverture en localhost.'
    default:
      return error?.message || "Impossible d'ouvrir la webcam pour le moment."
  }
}

async function waitForVideoReady(videoEl) {
  if (!videoEl || videoEl.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return
  }

  await new Promise((resolve, reject) => {
    function cleanup() {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoEl.removeEventListener('error', handleVideoError)
    }

    function handleLoadedMetadata() {
      cleanup()
      resolve()
    }

    function handleVideoError() {
      cleanup()
      reject(new Error("Le flux vidéo n'a pas pu être chargé."))
    }

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    videoEl.addEventListener('error', handleVideoError, { once: true })
  })
}

function EmotionDetector({ onDetect }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startAttemptRef = useRef(0)
  const detectionTimerRef = useRef(null)
  const detectionTimeoutRef = useRef(null)
  const detectionInFlightRef = useRef(false)
  const detectionRunIdRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState(null)

  const { secondsLeft, reportEmotion, resetEmotion } = useEmotionStability()

  const stopMoodDetection = useCallback((updateState = true) => {
    detectionRunIdRef.current += 1
    window.clearInterval(detectionTimerRef.current)
    window.clearTimeout(detectionTimeoutRef.current)
    detectionTimerRef.current = null
    detectionTimeoutRef.current = null
    detectionInFlightRef.current = false

    if (updateState) {
      setDetecting(false)
    }
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.pause?.()
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    const attemptId = startAttemptRef.current + 1
    startAttemptRef.current = attemptId

    stopMoodDetection()
    resetEmotion()
    setError(null)
    setReady(false)
    releaseStream()

    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    if (!window.isSecureContext) {
      setError("La webcam du navigateur ne fonctionne que sur une page sécurisée en https:// ou en localhost.")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne prend pas en charge l'accès webcam via getUserMedia.")
      return
    }

    try {
      await loadModels()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      if (startAttemptRef.current !== attemptId) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream

      const videoEl = videoRef.current
      if (!videoEl) {
        releaseStream()
        return
      }

      videoEl.srcObject = stream
      await waitForVideoReady(videoEl)

      const playPromise = videoEl.play?.()
      if (playPromise instanceof Promise) {
        await playPromise
      }

      if (startAttemptRef.current === attemptId) {
        setReady(true)
      }
    } catch (err) {
      releaseStream()
      setError(getCameraErrorMessage(err))
    }
  }, [releaseStream, resetEmotion, stopMoodDetection])

  const runDetectionFrame = useCallback(async (runId) => {
    if (!videoRef.current || detectionInFlightRef.current) return

    detectionInFlightRef.current = true

    try {
      const raw = await detectEmotion(videoRef.current)
      if (runId !== detectionRunIdRef.current) return

      if (!raw) {
        resetEmotion()
        setError("Aucun visage détecté. Place-toi face à la caméra et réessaie.")
        return
      }

      const emotion = normalizeEmotion(raw.emotion)
      const stable = reportEmotion(emotion, raw.confidence)

      if (raw.confidence < EMOTION_CONFIDENCE_THRESHOLD) {
        setError(`Confiance trop faible (${Math.round(raw.confidence * 100)}%). Réessaie.`)
        return
      }

      setError(null)

      if (stable) {
        stopMoodDetection()
        onDetect(stable)
      }
    } catch (err) {
      if (runId !== detectionRunIdRef.current) return
      stopMoodDetection()
      setError(err?.message || "L'analyse de l'humeur a échoué.")
    } finally {
      detectionInFlightRef.current = false
    }
  }, [onDetect, reportEmotion, resetEmotion, stopMoodDetection])

  const startMoodDetection = useCallback(() => {
    if (!ready || detectionTimerRef.current) return

    resetEmotion()
    setError(null)
    setDetecting(true)
    const runId = detectionRunIdRef.current + 1
    detectionRunIdRef.current = runId
    void runDetectionFrame(runId)

    detectionTimerRef.current = window.setInterval(() => {
      void runDetectionFrame(runId)
    }, DETECTION_INTERVAL)

    detectionTimeoutRef.current = window.setTimeout(() => {
      stopMoodDetection()
      resetEmotion()
      setError("Je n'ai pas réussi à stabiliser l'humeur. Réessaie en regardant bien la caméra.")
    }, MAX_DETECTION_DURATION)
  }, [ready, resetEmotion, runDetectionFrame, stopMoodDetection])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void startCamera()
    }, 0)

    return () => {
      startAttemptRef.current += 1
      window.clearTimeout(timerId)
      stopMoodDetection(false)
      releaseStream()
    }
  }, [releaseStream, startCamera, stopMoodDetection])

  if (error && !ready) {
    return (
      <div className="emotion-detector">
        <p className="error">{error}</p>
        <button onClick={() => void startCamera()}>Réessayer</button>
      </div>
    )
  }

  return (
    <div className="emotion-detector">
      <video ref={videoRef} autoPlay muted playsInline className="camera-video" />
      <button onClick={startMoodDetection} disabled={!ready || detecting}>
        {detecting ? 'Analyse en cours...' : 'Détecter mon humeur'}
      </button>
      {detecting && (
        <button type="button" className="secondary-btn" onClick={() => {
          stopMoodDetection()
          resetEmotion()
          setError(null)
        }}>
          Arrêter
        </button>
      )}
      {detecting && secondsLeft > 0 && (
        <div className="stability-countdown" aria-live="polite">
          <span>Stabilisation de l'humeur: {secondsLeft}s</span>
          <div className="countdown-bar" />
        </div>
      )}
      {error && ready && <p className="error">{error}</p>}
    </div>
  )
}

export default EmotionDetector
