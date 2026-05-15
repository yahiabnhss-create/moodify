import { useMemo, useState } from 'react'
import { useFavorites } from '../hooks/useFavorites'
import { EMOTIONS } from '../constants/emotions'
import PlaylistCard from '../components/Playlist/PlaylistCard'
import EmotionTag from '../components/EmotionTag'
import './Favorites.css'

function formatDate(isoString) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

function getEmotionFilters(favorites) {
  const used = [...new Set(favorites.map(f => f.emotionAtLike).filter(Boolean))]
  return ['all', ...used]
}

function Favorites() {
  const { favorites, removeFavorite, clearFavorites } = useFavorites()
  const [filter, setFilter] = useState('all')
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = useMemo(
    () => filter === 'all'
      ? favorites
      : favorites.filter(f => f.emotionAtLike === filter),
    [favorites, filter]
  )

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.dateLike) - new Date(a.dateLike)),
    [filtered]
  )

  const filters = useMemo(() => getEmotionFilters(favorites), [favorites])

  if (favorites.length === 0) {
    return (
      <main className="favorites-page">
        <h2>Mes favoris</h2>
        <p className="favorites-empty">
          Tu n'as pas encore de favoris. Lance une détection et clique sur ❤️ !
        </p>
      </main>
    )
  }

  return (
    <main className="favorites-page">
      <div className="favorites-header">
        <h2>Mes favoris <span className="favorites-count">{favorites.length}</span></h2>

        {!confirmClear ? (
          <button className="favorites-clear-btn" onClick={() => setConfirmClear(true)}>
            Tout effacer
          </button>
        ) : (
          <div className="favorites-confirm-clear">
            <span>Confirmer ?</span>
            <button className="favorites-confirm-yes" onClick={() => {
              clearFavorites()
              setConfirmClear(false)
            }}>Oui</button>
            <button className="favorites-confirm-no" onClick={() => setConfirmClear(false)}>Non</button>
          </div>
        )}
      </div>

      {filters.length > 1 && (
        <div className="favorites-filters">
          {filters.map(f => (
            <button
              key={f}
              className={`favorites-filter-chip ${filter === f ? 'favorites-filter-chip--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Toutes' : <EmotionTag emotionKey={f} />}
            </button>
          ))}
        </div>
      )}

      <div className="favorites-list">
        {sorted.map(track => (
          <div key={track.id} className="favorite-item">
            <div className="favorite-meta">
              <EmotionTag emotionKey={track.emotionAtLike} />
              <span className="favorite-date">{formatDate(track.dateLike)}</span>
            </div>
            <PlaylistCard
              track={track}
              onFavorite={() => removeFavorite(track.id)}
              isFav={true}
            />
          </div>
        ))}
      </div>
    </main>
  )
}

export default Favorites
