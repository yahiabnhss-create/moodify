let faceApiPromise = null
let modelsPromise = null

function getFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = import('face-api.js')
  }

  return faceApiPromise
}

export async function loadModels() {
  if (!modelsPromise) {
    modelsPromise = getFaceApi()
      .then((faceapi) => Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      ]))
      .catch((error) => {
        modelsPromise = null
        throw error
      })
  }

  await modelsPromise
}

export async function detectEmotion(videoEl) {
  const faceapi = await getFaceApi()
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions()

  if (!result) return null

  let topEmotion = 'neutral'
  let topScore = 0

  for (const [emotion, score] of Object.entries(result.expressions)) {
    if (score > topScore) {
      topScore = score
      topEmotion = emotion
    }
  }

  return { emotion: topEmotion, confidence: topScore }
}
