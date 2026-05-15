// Badge qui affiche une émotion sous forme d'icône Lucide + label coloré.
// Utilisé partout dans l'UI : historique, filtres, cartes, graphique.
//
// Props :
//   emotionKey : clé d'émotion correspondant à une entrée de EMOTIONS (ex: 'happy')
//   size       : taille de l'icône en pixels (défaut 13)
//
// Si emotionKey ne correspond à aucune entrée connue, affiche le texte brut comme fallback.

import { EMOTIONS } from '../constants/emotions'
import './EmotionTag.css'

export default function EmotionTag({ emotionKey, size = 13 }) {
  const e = EMOTIONS[emotionKey]

  // Fallback si l'émotion est inconnue (ex: 'inconnu' pour les favoris sans émotion)
  if (!e) return <span className="emotion-tag">{emotionKey}</span>

  const Icon = e.icon // composant Lucide React

  return (
    // La couleur de l'émotion est appliquée via style inline pour éviter des classes dynamiques
    <span className="emotion-tag" style={{ color: e.color }}>
      <Icon size={size} strokeWidth={2.5} />
      {e.label}
    </span>
  )
}
