// Hook de gestion de l'historique des sessions de détection d'émotion.
// Chaque session correspond à une détection réussie + une playlist lancée.
// Persisté en localStorage sous 'moodify_history', limité à 100 entrées.

import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

// Nombre maximum de sessions conservées en historique
const MAX_HISTORY_ENTRIES = 100

// Génère un identifiant unique pour chaque session.
// crypto.randomUUID() est disponible dans tous les navigateurs modernes (HTTPS ou localhost).
// Fallback timestamp+random pour les environnements plus anciens.
function createSessionId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useHistory() {
  const [history, setHistory] = useLocalStorage('moodify_history', [])

  // Ajoute une nouvelle session en tête de liste (la plus récente en premier).
  // .slice(0, MAX_HISTORY_ENTRIES) → on ne garde que les 100 dernières entrées
  const addSession = useCallback((emotion, confidence, playlistId, playlistName) => {
    const session = {
      id:          createSessionId(),
      date:        new Date().toISOString(), // format ISO pour le tri et l'affichage
      emotion,
      confidence,  // score de confiance face-api (0 à 1)
      playlistId,
      playlistName,
    }
    setHistory(prev => [session, ...prev].slice(0, MAX_HISTORY_ENTRIES))
  }, [setHistory])

  // Vide l'historique complet
  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  // Calcule les statistiques d'émotions sur un sous-ensemble de sessions (ex: filtrées par période).
  // Retourne [ { emotion, count, percent }, ... ] — utilisé par le graphique camembert du Dashboard.
  const computeEmotionStats = useCallback((entries) => {
    // Compte le nombre d'occurrences de chaque émotion avec reduce()
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
  }, [])

  // Filtre les sessions selon la période sélectionnée dans le Dashboard.
  // 'all' → tout l'historique, 'day' → aujourd'hui, 'week' → 7j, 'month' → 30j
  const filterByPeriod = useCallback((period) => {
    if (period === 'all') return history

    const now    = new Date()
    const limits = { day: 1, week: 7, month: 30 }
    const days   = limits[period] ?? limits.week
    // Date de coupure : on soustrait `days` jours à la date courante
    const cutoff = new Date(now.setDate(now.getDate() - days))

    return history.filter(session => new Date(session.date) >= cutoff)
  }, [history])

  return { history, addSession, clearHistory, computeEmotionStats, filterByPeriod }
}
