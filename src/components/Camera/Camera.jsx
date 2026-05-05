import { forwardRef } from 'react'
import './Camera.css'

// forwardRef permet au composant parent (EmotionDetector) de passer une ref
// directement sur l'élément <video> du DOM, pour pouvoir l'analyser avec face-api.js
const Camera = forwardRef(function Camera(_, ref) {
  return (
    <video
      ref={ref}        // la ref vient du parent (useCamera)
      autoPlay         // démarre automatiquement quand le flux est connecté
      muted            // obligatoire pour autoPlay sur certains navigateurs
      playsInline      // empêche le mode plein écran automatique sur iOS
      className="camera-video"
    />
  )
})

export default Camera
