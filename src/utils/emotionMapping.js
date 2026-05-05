// 🎯 BUT : Convertit les 7 émotions de face-api.js vers les 5 émotions de notre app
// face-api reconnaît : happy, sad, neutral, angry, surprised, fearful, disgusted
// Notre app gère  : happy, sad, neutral, angry, surprised

// 💡 CONCEPT : Table de correspondance (lookup table)
// Plutôt qu'une série de if/else, un objet clé-valeur est plus lisible et extensible
const MAPPING = {
  happy:     'happy',
  sad:       'sad',
  neutral:   'neutral',
  angry:     'angry',
  surprised: 'surprised',
  // ⚠️ ATTENTION : fearful → angry (pas sad) car la playlist calmante convient mieux à la peur
  fearful:   'angry',
  // disgusted → angry car même registre émotionnel (tension) → playlist détente
  disgusted: 'angry',
}

// Convertit une émotion brute de face-api.js vers une émotion de notre app
// @param faceApiEmotion {string} - émotion brute ex: "fearful"
// @returns {string} - émotion normalisée ex: "angry"
export function normalizeEmotion(faceApiEmotion) {
  return MAPPING[faceApiEmotion] ?? 'neutral'
}
