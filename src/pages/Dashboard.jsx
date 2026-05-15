// Page Dashboard — vue analytique de l'application.
//
// 3 sections :
//   1. Stats : graphique camembert (Recharts) des émotions + émotion dominante
//   2. Historique : tableau des sessions filtrables par période et par émotion
//   3. Favoris par émotion : regroupement des pistes aimées selon l'humeur active au moment du like
//
// Les données viennent de deux hooks persistés en localStorage :
//   - useHistory() → sessions de détection
//   - useFavorites() → pistes mises en favori

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useHistory } from '../hooks/useHistory'
import { useFavorites } from '../hooks/useFavorites'
import { EMOTIONS } from '../constants/emotions'
import EmotionTag from '../components/EmotionTag'
import './Dashboard.css'

// Formate une date ISO en format français court : "05/05/2026 14:30"
function formatDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

// Options du filtre de période affiché au-dessus du dashboard
const PERIODS = [
  { key: 'day',   label: "Aujourd'hui" },
  { key: 'week',  label: '7 derniers jours' },
  { key: 'month', label: '30 derniers jours' },
  { key: 'all',   label: 'Tout' },
]

// Options du filtre par émotion dans la section historique ('all' + toutes les clés d'EMOTIONS)
const EMOTION_FILTERS = ['all', ...Object.keys(EMOTIONS)]

function Dashboard() {
  const { history, clearHistory, computeEmotionStats, filterByPeriod } = useHistory()
  const { favorites } = useFavorites()

  const [period, setPeriod]               = useState('all')   // filtre de période actif
  const [emotionFilter, setEmotionFilter] = useState('all')   // filtre par émotion dans l'historique
  const [confirmClear, setConfirmClear]   = useState(false)   // affiche le bouton de confirmation avant effacement

  // Sessions filtrées par période (recalculé seulement quand period ou history change)
  const periodFiltered = useMemo(
    () => filterByPeriod(period),
    [filterByPeriod, period]
  )

  // Statistiques par émotion calculées sur les sessions filtrées
  // Retourne [{ emotion, count, percent }, ...]
  const emotionStats = useMemo(
    () => computeEmotionStats(periodFiltered),
    [computeEmotionStats, periodFiltered]
  )

  // Émotion dominante = celle avec le plus grand nombre de sessions dans la période
  const dominant = useMemo(
    () => emotionStats.reduce((max, e) => e.count > (max?.count ?? 0) ? e : max, null),
    [emotionStats]
  )

  // Double filtrage : période + émotion spécifique (pour le tableau historique)
  const historyFiltered = useMemo(
    () => emotionFilter === 'all'
      ? periodFiltered
      : periodFiltered.filter(s => s.emotion === emotionFilter),
    [emotionFilter, periodFiltered]
  )

  // Regroupe les favoris par émotion active au moment du like (emotionAtLike)
  // Résultat : { happy: [track1, track2], sad: [track3], ... }
  const favsByEmotion = useMemo(() => {
    return favorites.reduce((acc, fav) => {
      const key  = fav.emotionAtLike ?? 'inconnu'
      acc[key]   = acc[key] ? [...acc[key], fav] : [fav]
      return acc
    }, {})
  }, [favorites])

  return (
    <main className="dashboard">
      <h2>Tableau de bord</h2>

      {/* ── Filtre de période ── */}
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

      {/* Si aucune session, on affiche un message plutôt qu'un dashboard vide */}
      {history.length === 0 ? (
        <p className="dashboard-empty">Aucune session enregistrée. Lance une détection !</p>
      ) : (
        <>
          {/* ── Section 1 : graphique camembert ── */}
          <section className="dashboard-section">
            <h3>Répartition des émotions</h3>

            {/* Cartes résumé : nombre de sessions + émotion dominante */}
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
              // ResponsiveContainer = le camembert s'adapte à la largeur de son parent
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={emotionStats}
                    dataKey="count"    // valeur numérique utilisée pour calculer les parts
                    nameKey="emotion"  // clé utilisée pour les labels et la légende
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    // Label affiché sur chaque part : "Heureux 45%"
                    label={({ emotion, percent }) =>
                      `${EMOTIONS[emotion]?.label ?? emotion} ${percent}%`
                    }
                  >
                    {/* Chaque Cell colore une part du camembert avec la couleur de l'émotion */}
                    {emotionStats.map(entry => (
                      <Cell
                        key={entry.emotion}
                        fill={EMOTIONS[entry.emotion]?.color ?? '#ccc'}
                      />
                    ))}
                  </Pie>
                  {/* Tooltip affiché au survol d'une part */}
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} session${value > 1 ? 's' : ''}`,
                      EMOTIONS[name]?.label ?? name,
                    ]}
                  />
                  {/* Légende sous le graphique */}
                  <Legend formatter={name => EMOTIONS[name]?.label ?? name} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="dashboard-empty">Aucune donnée pour cette période.</p>
            )}
          </section>

          {/* ── Section 2 : tableau historique ── */}
          <section className="dashboard-section">
            <div className="section-header">
              <h3>Historique</h3>
              {/* Confirmation en deux clics avant d'effacer tout l'historique */}
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

            {/* Chips de filtre par émotion */}
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
                        <td><EmotionTag emotionKey={session.emotion} /></td>
                        <td>{Math.round(session.confidence * 100)}%</td>
                        {/* On affiche le label de l'émotion plutôt que le nom de la playlist */}
                        <td className="history-playlist">{EMOTIONS[session.emotion]?.label ?? session.playlistName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Section 3 : favoris groupés par émotion ── */}
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
                    {/* On affiche 5 pistes maximum par émotion */}
                    <ul className="top-favs-list">
                      {tracks.slice(0, 5).map(t => (
                        <li key={t.id} className="top-favs-item">
                          <img src={t.image} alt={t.name} className="top-favs-img" />
                          <div className="top-favs-info">
                            <span className="top-favs-name">{t.name}</span>
                            <span className="top-favs-artist">{t.artist}</span>
                          </div>
                          {/* Lien vers la piste sur Spotify */}
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
