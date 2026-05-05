import * as faceapi from 'face-api.js'

// Charge les deux modèles depuis public/models/
export async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  await faceapi.nets.faceExpressionNet.loadFromUri('/models')
}

// Analyse le visage visible dans la <video> et retourne l'émotion dominante
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

  return topEmotion // ex: "happy"
}
