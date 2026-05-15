// Hook de gestion des pistes favorites.
// Les favoris sont persistés en localStorage sous la clé 'moodify_favorites'.
//
// Un favori = une piste Spotify enrichie avec :
//   - emotionAtLike : l'émotion active au moment où l'utilisateur a mis le like
//   - dateLike : horodatage ISO (utile pour un futur tri chronologique)

import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage('moodify_favorites', [])

  // Ajoute une piste aux favoris (ignore les doublons via la vérification sur track.id)
  const addFavorite = useCallback((track, emotion) => {
    setFavorites(prev => {
      // Garde anti-doublon : si la piste est déjà en favoris, on ne l'ajoute pas
      if (!track?.id || prev.some(f => f.id === track.id)) return prev

      return [
        ...prev,
        {
          ...track,             // { id, name, artist, image, url }
          emotionAtLike: emotion,              // émotion détectée quand l'utilisateur a aimé
          dateLike: new Date().toISOString(),  // pour un éventuel tri par date
        },
      ]
    })
  }, [setFavorites])

  // Retire une piste des favoris par son ID
  const removeFavorite = useCallback((trackId) => {
    setFavorites(prev => prev.filter(f => f.id !== trackId))
  }, [setFavorites])

  // Vide complètement la liste des favoris
  const clearFavorites = useCallback(() => {
    setFavorites([])
  }, [setFavorites])

  // Retourne true si la piste est déjà en favoris (utilisé pour l'icône cœur plein/vide)
  const isFavorite = useCallback((trackId) => {
    return favorites.some(f => f.id === trackId)
  }, [favorites])

  return { favorites, addFavorite, removeFavorite, clearFavorites, isFavorite }
}
