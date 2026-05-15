// Convertit les étiquettes brutes de face-api.js vers les 5 émotions gérées par l'app.
//
// face-api.js peut retourner : happy, sad, neutral, angry, surprised, fearful, disgusted
// L'app ne gère que : happy, sad, neutral, angry, surprised
//
// Règles de rapprochement :
//   fearful   → neutral  (la peur ressemble à un état figé/neutre)
//   disgusted → angry    (le dégoût est proche de la colère visuellement)

const MAPPING = {
  happy:     'happy',
  sad:       'sad',
  neutral:   'neutral',
  angry:     'angry',
  surprised: 'surprised',
  fearful:   'neutral',   // pas de catégorie "peur" → on replie sur neutre
  disgusted: 'angry',     // pas de catégorie "dégoût" → on replie sur colère
}

// Retourne l'émotion normalisée. Si face-api renvoie un label inconnu, on retombe sur 'neutral'.
export function normalizeEmotion(faceApiEmotion) {
  return MAPPING[faceApiEmotion] ?? 'neutral'
}
