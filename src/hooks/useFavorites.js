import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage('moodify_favorites', [])

  const addFavorite = useCallback((track, emotion) => {
    setFavorites(prev => {
      if (!track?.id || prev.some(f => f.id === track.id)) return prev

      return [
        ...prev,
        {
          ...track,
          emotionAtLike: emotion,
          dateLike: new Date().toISOString(),
        },
      ]
    })
  }, [setFavorites])

  const removeFavorite = useCallback((trackId) => {
    setFavorites(prev => prev.filter(f => f.id !== trackId))
  }, [setFavorites])

  const clearFavorites = useCallback(() => {
    setFavorites([])
  }, [setFavorites])

  const isFavorite = useCallback((trackId) => {
    return favorites.some(f => f.id === trackId)
  }, [favorites])

  return { favorites, addFavorite, removeFavorite, clearFavorites, isFavorite }
}
