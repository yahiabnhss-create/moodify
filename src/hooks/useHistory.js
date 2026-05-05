import { useLocalStorage } from './useLocalStorage'

// 🎯 BUT : Enregistre et lit l'historique des sessions de détection d'émotion
//
// 💡 CONCEPT : Les stats sont CALCULÉES depuis l'historique plutôt que stockées séparément
//   Avantage : pas de risque de désynchronisation entre deux sources de vérité
//   L'historique est la source unique → les stats en découlent toujours correctement
//
// Structure d'une session :
// { id, date, emotion, confidence, playlistId, playlistName }
export function useHistory() {
  const [history, setHistory] = useLocalStorage('moodify_history', [])

  // 🎯 BUT : Enregistre une nouvelle session
  // @param emotion     {string} - émotion validée ex: "happy"
  // @param confidence  {number} - score entre 0 et 1
  // @param playlistId  {string} - id Spotify de la playlist jouée
  // @param playlistName {string} - nom lisible de la playlist
  function addSession(emotion, confidence, playlistId, playlistName) {
    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      emotion,
      confidence,
      playlistId,
      playlistName,
    }
    // ⚠️ On ajoute en tête de liste (plus récent en premier)
    setHistory(prev => [session, ...prev])
  }

  // 🎯 BUT : Supprime toutes les sessions de l'historique
  function clearHistory() {
    setHistory([])
  }

  // 🎯 BUT : Calcule la répartition des émotions depuis l'historique
  // @param entries {array} - sous-ensemble de l'historique (filtré)
  // @returns {array} - [{ emotion, label, count, percent }]
  //
  // 💡 CONCEPT : Array.reduce()
  //   reduce() parcourt un tableau et accumule un résultat
  //   Ici on construit un objet { happy: 5, sad: 2, ... } depuis la liste des sessions
  function computeEmotionStats(entries) {
    const counts = entries.reduce((acc, session) => {
      acc[session.emotion] = (acc[session.emotion] ?? 0) + 1
      return acc
    }, {})

    const total = entries.length
    return Object.entries(counts).map(([emotion, count]) => ({
      emotion,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
  }

  // 🎯 BUT : Filtre l'historique par période
  // @param period {'day'|'week'|'month'|'all'}
  function filterByPeriod(period) {
    if (period === 'all') return history

    const now = new Date()
    const limits = { day: 1, week: 7, month: 30 }
    const days = limits[period]
    const cutoff = new Date(now.setDate(now.getDate() - days))

    return history.filter(s => new Date(s.date) >= cutoff)
  }

  return { history, addSession, clearHistory, computeEmotionStats, filterByPeriod }
}
