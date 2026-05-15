import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useHistory } from '../hooks/useHistory'
import { useFavorites } from '../hooks/useFavorites'
import { EMOTIONS } from '../constants/emotions'
import EmotionTag from '../components/EmotionTag'
import './Dashboard.css'

// Formate une date ISO en format court : "05/05/2026 14:30"
function formatDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const PERIODS = [
  { key: 'day',   label: "Aujourd'hui" },
  { key: 'week',  label: '7 derniers jours' },
  { key: 'month', label: '30 derniers jours' },
  { key: 'all',   label: 'Tout' },
]

const EMOTION_FILTERS = ['all', ...Object.keys(EMOTIONS)]

function Dashboard() {
  const { history, clearHistory, computeEmotionStats, filterByPeriod } = useHistory()
  const { favorites } = useFavorites()

  const [period, setPeriod] = useState('all')
  const [emotionFilter, setEmotionFilter] = useState('all')
  const [confirmClear, setConfirmClear] = useState(false)

  // Données filtrées par période pour les stats et l'historique
  const periodFiltered = useMemo(
    () => filterByPeriod(period),
    [filterByPeriod, period]
  )

  // Stats émotions calculées depuis l'historique filtré
  const emotionStats = useMemo(
    () => computeEmotionStats(periodFiltered),
    [computeEmotionStats, periodFiltered]
  )

  // Émotion dominante = celle avec le plus de sessions
  const dominant = useMemo(
    () => emotionStats.reduce((max, e) => e.count > (max?.count ?? 0) ? e : max, null),
    [emotionStats]
  )

  // Historique filtré par émotion en plus de la période
  const historyFiltered = useMemo(
    () => emotionFilter === 'all'
      ? periodFiltered
      : periodFiltered.filter(s => s.emotion === emotionFilter),
    [emotionFilter, periodFiltered]
  )

  // Top favoris par émotion : on groupe les favoris par emotionAtLike
  // 💡 CONCEPT : reduce() pour grouper un tableau en objet { emotion: [tracks] }
  const favsByEmotion = useMemo(() => {
    return favorites.reduce((acc, fav) => {
      const key = fav.emotionAtLike ?? 'inconnu'
      acc[key] = acc[key] ? [...acc[key], fav] : [fav]
      return acc
    }, {})
  }, [favorites])

  return (
    <main className="dashboard">
      <h2>Tableau de bord</h2>

      {/* ── FILTRES DE PÉRIODE ── */}
      <div className="period-filters">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-chip ${period === p.key ? 'period-chip--active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {history.length === 0 ? (
        <p className="dashboard-empty">Aucune session enregistrée. Lance une détection !</p>
      ) : (
        <>
          {/* ── SECTION STATS ── */}
          <section className="dashboard-section">
            <h3>Répartition des émotions</h3>

            <div className="stats-overview">
              <div className="stat-card">
                <span className="stat-value">{periodFiltered.length}</span>
                <span className="stat-label">Sessions</span>
              </div>
              {dominant && (
                <div className="stat-card stat-card--dominant">
                  <span className="stat-value"><EmotionTag emotionKey={dominant.emotion} size={18} /></span>
                  <span className="stat-label">Émotion dominante</span>
                </div>
              )}
            </div>

            {emotionStats.length > 0 ? (
              // 💡 ResponsiveContainer adapte le graphique à la largeur du parent
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={emotionStats}
                    dataKey="count"
                    nameKey="emotion"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ emotion, percent }) =>
                      `${EMOTIONS[emotion]?.label ?? emotion} ${percent}%`
                    }
                  >
                    {emotionStats.map(entry => (
                      <Cell
                        key={entry.emotion}
                        fill={EMOTIONS[entry.emotion]?.color ?? '#ccc'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} session${value > 1 ? 's' : ''}`,
                      EMOTIONS[name]?.label ?? name,
                    ]}
                  />
                  <Legend
                    formatter={name => EMOTIONS[name]?.label ?? name}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="dashboard-empty">Aucune donnée pour cette période.</p>
            )}
          </section>

          {/* ── SECTION HISTORIQUE ── */}
          <section className="dashboard-section">
            <div className="section-header">
              <h3>Historique</h3>
              {!confirmClear ? (
                <button className="clear-btn" onClick={() => setConfirmClear(true)}>
                  Effacer
                </button>
              ) : (
                <div className="confirm-clear">
                  <span>Confirmer ?</span>
                  <button className="confirm-yes" onClick={() => { clearHistory(); setConfirmClear(false) }}>Oui</button>
                  <button className="confirm-no" onClick={() => setConfirmClear(false)}>Non</button>
                </div>
              )}
            </div>

            {/* Filtre par émotion */}
            <div className="emotion-filters">
              {EMOTION_FILTERS.map(e => (
                <button
                  key={e}
                  className={`filter-chip ${emotionFilter === e ? 'filter-chip--active' : ''}`}
                  onClick={() => setEmotionFilter(e)}
                >
                  {e === 'all' ? 'Toutes' : <EmotionTag emotionKey={e} />}
                </button>
              ))}
            </div>

            {historyFiltered.length === 0 ? (
              <p className="dashboard-empty">Aucune session pour ces filtres.</p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Émotion</th>
                      <th>Confiance</th>
                      <th>Playlist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyFiltered.map(session => (
                      <tr key={session.id}>
                        <td>{formatDate(session.date)}</td>
                        <td>
                          <EmotionTag emotionKey={session.emotion} />
                        </td>
                        <td>{Math.round(session.confidence * 100)}%</td>
                        <td className="history-playlist">{session.playlistName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── SECTION TOP FAVORIS PAR ÉMOTION ── */}
          {favorites.length > 0 && (
            <section className="dashboard-section">
              <h3>Favoris par émotion</h3>
              <div className="top-favs">
                {Object.entries(favsByEmotion).map(([emotion, tracks]) => (
                  <div key={emotion} className="top-favs-group">
                    <h4 className="top-favs-emotion">
                      <EmotionTag emotionKey={emotion} size={14} />
                      <span className="top-favs-count">{tracks.length}</span>
                    </h4>
                    <ul className="top-favs-list">
                      {tracks.slice(0, 5).map(t => (
                        <li key={t.id} className="top-favs-item">
                          <img src={t.image} alt={t.name} className="top-favs-img" />
                          <div className="top-favs-info">
                            <span className="top-favs-name">{t.name}</span>
                            <span className="top-favs-artist">{t.artist}</span>
                          </div>
                          <a href={t.url} target="_blank" rel="noreferrer" className="top-favs-link">
                            ▶
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default Dashboard
