// face-api.js reconnaît 7 émotions, mais notre app n'en gère que 5
// Ce mapping réduit les cas non supportés aux plus proches :
// - fearful (peur)   → sad  (triste)
// - disgusted (dégoût) → angry (en colère)
const MAPPING = {
  happy: 'happy',
  sad: 'sad',
  neutral: 'neutral',
  angry: 'angry',
  surprised: 'surprised',
  fearful: 'sad',
  disgusted: 'angry',
}

// Convertit une émotion brute de face-api.js vers une émotion de notre app
// Si l'émotion est inconnue, on retourne 'neutral' par défaut
export function normalizeEmotion(faceApiEmotion) {
  return MAPPING[faceApiEmotion] ?? 'neutral'
}
