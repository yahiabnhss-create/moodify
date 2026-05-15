// Couche d'abstraction autour de face-api.js.
// Deux responsabilités :
//   1. loadModels() — télécharge les fichiers IA depuis /public/models (fait une seule fois)
//   2. detectEmotion(videoEl) — analyse une frame vidéo et retourne l'émotion dominante

// Singleton : on importe face-api.js une seule fois même si plusieurs modules l'appellent.
// Le module est lourd (~6 Mo), on évite de le charger plusieurs fois avec ce pattern.
let faceApiPromise = null
let modelsPromise  = null

function getFaceApi() {
  if (!faceApiPromise) {
    // Import dynamique : face-api.js ne se charge que la première fois qu'on en a besoin
    faceApiPromise = import('face-api.js')
  }
  return faceApiPromise
}

// Charge les deux modèles nécessaires depuis /public/models :
//   - tinyFaceDetector : détecte les visages (rapide, léger)
//   - faceExpressionNet : classe l'expression du visage détecté
// Les fichiers .json et .bin correspondants doivent être dans public/models/.
export async function loadModels() {
  if (!modelsPromise) {
    modelsPromise = getFaceApi()
      .then((faceapi) => Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      ]))
      .catch((error) => {
        // En cas d'échec, on remet modelsPromise à null pour permettre un nouvel essai
        modelsPromise = null
        throw error
      })
  }
  await modelsPromise
}

// Analyse une frame du flux vidéo et retourne { emotion, confidence } ou null si aucun visage.
// - videoEl : l'élément <video> contenant le flux webcam
// - TinyFaceDetectorOptions : détecteur rapide adapté au temps réel (vs SSD Mobilenet plus précis)
// - withFaceExpressions() : ajoute l'étape de classification des expressions
export async function detectEmotion(videoEl) {
  const faceapi = await getFaceApi()

  // detectSingleFace : cherche UN seul visage (plus rapide que detectAllFaces)
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions()

  // null = pas de visage dans le flux vidéo à ce moment
  if (!result) return null

  // result.expressions = { happy: 0.92, sad: 0.03, neutral: 0.02, … }
  // On cherche l'émotion avec le score le plus élevé
  let topEmotion = 'neutral'
  let topScore   = 0

  for (const [emotion, score] of Object.entries(result.expressions)) {
    if (score > topScore) {
      topScore   = score
      topEmotion = emotion
    }
  }

  return { emotion: topEmotion, confidence: topScore }
}
