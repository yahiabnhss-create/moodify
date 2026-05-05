import * as faceapi from 'face-api.js'

// Charge les deux modèles depuis public/models/
export async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  await faceapi.nets.faceExpressionNet.loadFromUri('/models')
}

// 🎯 BUT : Analyse le visage visible dans la <video>
// @param videoEl {HTMLVideoElement} - l'élément vidéo de la caméra
// @returns {{ emotion: string, confidence: number } | null}
//   - emotion    : l'émotion dominante ex: "happy"
//   - confidence : score entre 0 et 1 ex: 0.94
//   - null si aucun visage détecté
export async function detectEmotion(videoEl) {
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions()

  if (!result) return null

  // result.expressions = { happy: 0.97, sad: 0.01, neutral: 0.02 ... }
  // On cherche l'émotion avec le score le plus haut
  let topEmotion = 'neutral'
  let topScore = 0

  for (const [emotion, score] of Object.entries(result.expressions)) {
    if (score > topScore) {
      topScore = score
      topEmotion = emotion
    }
  }

  // 💡 CONCEPT : On retourne maintenant un objet { emotion, confidence }
  // au lieu d'une simple string, pour que le hook de stabilité puisse
  // filtrer les détections peu fiables (confidence < 0.6)
  return { emotion: topEmotion, confidence: topScore }
}
