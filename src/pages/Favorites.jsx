import { useState } from 'react'
import { useFavorites } from '../hooks/useFavorites'
import { EMOTIONS } from '../constants/emotions'
import PlaylistCard from '../components/Playlist/PlaylistCard'
import './Favorites.css'

// Formate une date ISO en français : "5 mai 2026 à 14:30"
function formatDate(isoString) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoString))
}

// Liste des filtres disponibles : "Toutes" + les émotions présentes dans les favoris
function getEmotionFilters(favorites) {
  const used = [...new Set(favorites.map(f => f.emotionAtLike).filter(Boolean))]
  return ['all', ...used]
}

function Favorites() {
  const { favorites, removeFavorite } = useFavorites()
  const [filter, setFilter] = useState('all')
  const [confirmClear, setConfirmClear] = useState(false)

  // Filtre les favoris selon l'émotion sélectionnée
  const filtered = filter === 'all'
    ? favorites
    : favorites.filter(f => f.emotionAtLike === filter)

  // Tri du plus récent au plus ancien
  const sorted = [...filtered].sort((a, b) => new Date(b.dateLike) - new Date(a.dateLike))

  const filters = getEmotionFilters(favorites)

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

        {/* Bouton effacer tout */}
        {!confirmClear ? (
          <button className="clear-btn" onClick={() => setConfirmClear(true)}>
            Tout effacer
          </button>
        ) : (
          <div className="confirm-clear">
            <span>Confirmer ?</span>
            <button className="confirm-yes" onClick={() => {
              favorites.forEach(f => removeFavorite(f.id))
              setConfirmClear(false)
            }}>Oui</button>
            <button className="confirm-no" onClick={() => setConfirmClear(false)}>Non</button>
          </div>
        )}
      </div>

      {/* Filtres par émotion */}
      {filters.length > 1 && (
        <div className="favorites-filters">
          {filters.map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Toutes' : (EMOTIONS[f]?.label ?? f)}
            </button>
          ))}
        </div>
      )}

      {/* Liste des favoris */}
      <div className="favorites-list">
        {sorted.map(track => (
          <div key={track.id} className="favorite-item">
            <div className="favorite-meta">
              <span className="favorite-emotion">{EMOTIONS[track.emotionAtLike]?.label ?? track.emotionAtLike}</span>
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
