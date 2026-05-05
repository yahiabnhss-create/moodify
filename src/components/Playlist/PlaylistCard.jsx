import './Playlist.css'

// 🎯 BUT : Affiche un morceau avec bouton favori
// @param track      {object}   - données du morceau
// @param onFavorite {function} - callback appelé au clic sur le cœur (optionnel)
// @param isFav      {boolean}  - true si ce morceau est déjà en favori
function PlaylistCard({ track, onFavorite, isFav = false }) {
  return (
    <div className="playlist-card">
      <img src={track.image} alt={track.name} className="playlist-card-img" />

      <div className="playlist-card-info">
        <span className="playlist-card-name">{track.name}</span>
        <span className="playlist-card-artist">{track.artist}</span>
      </div>

      {/* Bouton favori — affiché uniquement si onFavorite est fourni */}
      {onFavorite && (
        <button
          className={`fav-btn ${isFav ? 'fav-btn--active' : ''}`}
          onClick={() => onFavorite(track)}
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      )}

      <a
        href={track.url}
        target="_blank"
        rel="noreferrer"
        className="playlist-card-link"
      >
        Écouter
      </a>
    </div>
  )
}

export default PlaylistCard
