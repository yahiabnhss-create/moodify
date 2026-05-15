// Composant webcam + boucle de détection d'émotion.
//
// Responsabilités :
//   1. Ouvrir le flux webcam (getUserMedia)
//   2. Lancer une boucle de détection toutes les 800 ms (setInterval)
//   3. Passer chaque résultat brut à useEmotionStability pour validation (3 secondes stables)
//   4. Quand une émotion est validée → appeler onDetect(emotion) et arrêter la boucle
//   5. Timeout à 10 secondes si aucune émotion n'est stabilisée
//
// Gestion de la concurrence :
//   - startAttemptRef : chaque appel à startCamera() incrémente ce compteur.
//     Si un nouvel appel démarre avant que le précédent soit terminé, l'ancien est ignoré.
//   - detectionRunIdRef : même logique pour la boucle de détection.

import { useRef, useEffect, useState, useCallback } from 'react'
import { loadModels, detectEmotion } from '../../services/faceApi'
import {
  EMOTION_CONFIDENCE_THRESHOLD,
  useEmotionStability,
} from '../../hooks/useEmotionStability'
import { normalizeEmotion } from '../../utils/emotionMapping'
import './EmotionDetector.css'

// Intervalle entre chaque analyse de frame (ms)
const DETECTION_INTERVAL = 800

// Durée maximale d'une session de détection avant d'afficher une erreur de timeout
const MAX_DETECTION_DURATION = 10000

// Traduit les erreurs getUserMedia en messages lisibles par l'utilisateur
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

// Attend que l'élément vidéo ait chargé ses métadonnées (dimensions du flux) avant de continuer.
// Sans cela, face-api peut planter car la vidéo n'a pas encore de taille définie.
async function waitForVideoReady(videoEl) {
  if (!videoEl || videoEl.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return // Déjà prêt
  }

  await new Promise((resolve, reject) => {
    function cleanup() {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoEl.removeEventListener('error', handleVideoError)
    }
    function handleLoadedMetadata() { cleanup(); resolve() }
    function handleVideoError()     { cleanup(); reject(new Error("Le flux vidéo n'a pas pu être chargé.")) }

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    videoEl.addEventListener('error', handleVideoError, { once: true })
  })
}

// Props :
//   onDetect(result) : appelé avec { emotion, confidence } quand une émotion est stabilisée
function EmotionDetector({ onDetect }) {
  const videoRef            = useRef(null) // référence au <video> DOM
  const streamRef           = useRef(null) // flux MediaStream (pour pouvoir le libérer)
  const startAttemptRef     = useRef(0)    // version de la tentative d'ouverture caméra
  const detectionTimerRef   = useRef(null) // référence au setInterval de détection
  const detectionTimeoutRef = useRef(null) // référence au setTimeout de timeout global
  const detectionInFlightRef = useRef(false) // empêche deux analyses simultanées
  const detectionRunIdRef   = useRef(0)    // version de la boucle de détection en cours

  const [ready, setReady]       = useState(false) // true = caméra ouverte et prête
  const [detecting, setDetecting] = useState(false) // true = boucle de détection active
  const [error, setError]       = useState(null)  // message d'erreur affiché dans l'UI

  const { secondsLeft, reportEmotion, resetEmotion } = useEmotionStability()

  // Arrête la boucle de détection (interval + timeout) sans libérer la caméra.
  // updateState=false permet d'arrêter sans changer l'état React (utile dans le cleanup)
  const stopMoodDetection = useCallback((updateState = true) => {
    detectionRunIdRef.current += 1         // invalide la boucle courante
    window.clearInterval(detectionTimerRef.current)
    window.clearTimeout(detectionTimeoutRef.current)
    detectionTimerRef.current   = null
    detectionTimeoutRef.current = null
    detectionInFlightRef.current = false
    if (updateState) setDetecting(false)
  }, [])

  // Libère le flux webcam et vide la source du <video>
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.pause?.()
      videoRef.current.srcObject = null
    }
  }, [])

  // Ouvre la caméra et charge les modèles face-api.
  // Chaque appel incrémente startAttemptRef.current pour annuler les appels précédents.
  const startCamera = useCallback(async () => {
    const attemptId = startAttemptRef.current + 1
    startAttemptRef.current = attemptId

    // Réinitialise tout avant d'ouvrir une nouvelle caméra
    stopMoodDetection()
    resetEmotion()
    setError(null)
    setReady(false)
    releaseStream()

    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    // La webcam n'est disponible qu'en HTTPS ou localhost (contrainte des navigateurs modernes)
    if (!window.isSecureContext) {
      setError("La webcam du navigateur ne fonctionne que sur une page sécurisée en https:// ou en localhost.")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne prend pas en charge l'accès webcam via getUserMedia.")
      return
    }

    try {
      // Charge les modèles face-api (idempotent : ne charge qu'une fois même si appelé plusieurs fois)
      await loadModels()

      // Demande l'accès à la caméra frontale (facingMode: 'user')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      // Si startCamera a été rappelé entre temps, on abandonne et on libère ce flux
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

      // Connecte le flux au <video>
      videoEl.srcObject = stream
      await waitForVideoReady(videoEl) // attend que la vidéo soit dimensionnée

      // Démarre la lecture (autoPlay ne suffit pas toujours sur mobile)
      const playPromise = videoEl.play?.()
      if (playPromise instanceof Promise) await playPromise

      if (startAttemptRef.current === attemptId) {
        setReady(true) // caméra prête → on peut activer le bouton "Détecter"
      }
    } catch (err) {
      releaseStream()
      setError(getCameraErrorMessage(err))
    }
  }, [releaseStream, resetEmotion, stopMoodDetection])

  // Analyse une seule frame vidéo.
  // runId permet de vérifier que la boucle est toujours celle qui est active.
  const runDetectionFrame = useCallback(async (runId) => {
    if (!videoRef.current || detectionInFlightRef.current) return
    detectionInFlightRef.current = true

    try {
      // Appelle face-api sur la frame courante du <video>
      const raw = await detectEmotion(videoRef.current)

      // Si une nouvelle boucle a été lancée entre temps, on ignore ce résultat
      if (runId !== detectionRunIdRef.current) return

      if (!raw) {
        // Pas de visage détecté dans cette frame
        resetEmotion()
        setError("Aucun visage détecté. Place-toi face à la caméra et réessaie.")
        return
      }

      // Convertit l'émotion brute face-api → émotion normalisée de l'app
      const emotion = normalizeEmotion(raw.emotion)
      // Passe l'émotion à useEmotionStability → retourne l'émotion si stable 3s, null sinon
      const stable  = reportEmotion(emotion, raw.confidence)

      // Confiance trop faible → on affiche un avertissement mais on continue d'analyser
      if (raw.confidence < EMOTION_CONFIDENCE_THRESHOLD) {
        setError(`Confiance trop faible (${Math.round(raw.confidence * 100)}%). Réessaie.`)
        return
      }

      setError(null)

      if (stable) {
        // Émotion validée → on arrête la boucle et on notifie le parent
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

  // Lance la boucle de détection :
  //   - une première frame immédiatement
  //   - puis toutes les DETECTION_INTERVAL ms via setInterval
  //   - timeout à MAX_DETECTION_DURATION si aucune émotion n'est validée
  const startMoodDetection = useCallback(() => {
    if (!ready || detectionTimerRef.current) return // déjà en cours ou caméra non prête

    resetEmotion()
    setError(null)
    setDetecting(true)

    const runId = detectionRunIdRef.current + 1
    detectionRunIdRef.current = runId

    void runDetectionFrame(runId) // première frame immédiate

    detectionTimerRef.current = window.setInterval(() => {
      void runDetectionFrame(runId)
    }, DETECTION_INTERVAL)

    // Si après 10s aucune émotion n'est stable → timeout et message d'erreur
    detectionTimeoutRef.current = window.setTimeout(() => {
      stopMoodDetection()
      resetEmotion()
      setError("Je n'ai pas réussi à stabiliser l'humeur. Réessaie en regardant bien la caméra.")
    }, MAX_DETECTION_DURATION)
  }, [ready, resetEmotion, runDetectionFrame, stopMoodDetection])

  // Lance la caméra automatiquement au montage du composant.
  // Le setTimeout(0) laisse le DOM se stabiliser avant d'appeler getUserMedia.
  // Cleanup : libère la caméra quand le composant est démonté (navigation vers une autre page).
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void startCamera()
    }, 0)

    return () => {
      startAttemptRef.current += 1    // annule toute tentative d'ouverture en cours
      window.clearTimeout(timerId)
      stopMoodDetection(false)        // arrête la boucle sans mettre à jour le state
      releaseStream()                 // libère le flux webcam
    }
  }, [releaseStream, startCamera, stopMoodDetection])

  // ── Affichage erreur (avant que la caméra soit prête) ──
  if (error && !ready) {
    return (
      <div className="emotion-detector">
        <p className="error">{error}</p>
        <button onClick={() => void startCamera()}>Réessayer</button>
      </div>
    )
  }

  // ── Affichage principal : vidéo + boutons ──
  return (
    <div className="emotion-detector">
      {/* Le flux webcam s'affiche ici. autoPlay+muted requis par les navigateurs modernes. */}
      <video ref={videoRef} autoPlay muted playsInline className="camera-video" />

      {/* Bouton désactivé pendant la détection ou si la caméra n'est pas encore prête */}
      <button onClick={startMoodDetection} disabled={!ready || detecting}>
        {detecting ? 'Analyse en cours...' : 'Détecter mon humeur'}
      </button>

      {/* Bouton "Arrêter" visible seulement pendant une détection en cours */}
      {detecting && (
        <button type="button" className="secondary-btn" onClick={() => {
          stopMoodDetection()
          resetEmotion()
          setError(null)
        }}>
          Arrêter
        </button>
      )}

      {/* Compte à rebours de stabilisation (affiché seulement quand un visage est détecté) */}
      {detecting && secondsLeft > 0 && (
        <div className="stability-countdown" aria-live="polite">
          <span>Stabilisation de l'humeur: {secondsLeft}s</span>
          <div className="countdown-bar" />
        </div>
      )}

      {/* Erreur affichée sous la vidéo quand la caméra est déjà ouverte (ex: visage non détecté) */}
      {error && ready && <p className="error">{error}</p>}
    </div>
  )
}

export default EmotionDetector
