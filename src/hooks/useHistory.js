import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

const MAX_HISTORY_ENTRIES = 100

function createSessionId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useHistory() {
  const [history, setHistory] = useLocalStorage('moodify_history', [])

  const addSession = useCallback((emotion, confidence, playlistId, playlistName) => {
    const session = {
      id: createSessionId(),
      date: new Date().toISOString(),
      emotion,
      confidence,
      playlistId,
      playlistName,
    }

    setHistory(prev => [session, ...prev].slice(0, MAX_HISTORY_ENTRIES))
  }, [setHistory])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  const computeEmotionStats = useCallback((entries) => {
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

  const filterByPeriod = useCallback((period) => {
    if (period === 'all') return history

    const now = new Date()
    const limits = { day: 1, week: 7, month: 30 }
    const days = limits[period] ?? limits.week
    const cutoff = new Date(now.setDate(now.getDate() - days))

    return history.filter(session => new Date(session.date) >= cutoff)
  }, [history])

  return { history, addSession, clearHistory, computeEmotionStats, filterByPeriod }
}
