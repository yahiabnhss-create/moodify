import { useLocalStorage } from './useLocalStorage'

// 🎯 BUT : Gère la liste des morceaux favoris avec persistance localStorage
//
// 💡 CONCEPT : Pourquoi un hook dédié plutôt que useLocalStorage directement ?
//   useFavorites encapsule la LOGIQUE métier (ajouter, retirer, vérifier)
//   useLocalStorage s'occupe uniquement de la PERSISTANCE
//   → Séparation des responsabilités : chaque hook a un seul rôle
//
// @returns {{
//   favorites: array,           — liste des favoris
//   addFavorite: function,      — ajoute un morceau
//   removeFavorite: function,   — retire un morceau par id
//   isFavorite: function,       — vérifie si un morceau est favori
// }}
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage('moodify_favorites', [])

  // 🎯 BUT : Ajoute un morceau aux favoris
  // @param track   {object} - données du morceau (id, name, artist, image, url)
  // @param emotion {string} - émotion détectée au moment du like ex: "happy"
  function addFavorite(track, emotion) {
    // Évite les doublons
    if (favorites.some(f => f.id === track.id)) return

    setFavorites(prev => [
      ...prev,
      {
        ...track,
        emotionAtLike: emotion,
        // 💡 toISOString() donne un format standard : "2026-05-05T14:30:00.000Z"
        //    facile à trier et à afficher avec Intl.DateTimeFormat
        dateLike: new Date().toISOString(),
      },
    ])
  }

  // 🎯 BUT : Retire un morceau des favoris
  // @param trackId {string} - id Spotify du morceau
  function removeFavorite(trackId) {
    // 💡 filter crée un NOUVEAU tableau sans l'élément → React détecte le changement
    //    Ne jamais muter directement le tableau (prev.splice) → React ne re-renderait pas
    setFavorites(prev => prev.filter(f => f.id !== trackId))
  }

  // 🎯 BUT : Vérifie si un morceau est dans les favoris
  // @param trackId {string}
  // @returns {boolean}
  function isFavorite(trackId) {
    return favorites.some(f => f.id === trackId)
  }

  return { favorites, addFavorite, removeFavorite, isFavorite }
}
