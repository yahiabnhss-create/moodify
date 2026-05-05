import './Playlist.css'

function PlaylistCard({ track, onFavorite, isFav = false }) {
  return (
    <div className="playlist-card">
      {track.image ? (
        <img src={track.image} alt={track.name} className="playlist-card-img" />
      ) : (
        <div className="playlist-card-img playlist-card-img--placeholder" aria-hidden="true" />
      )}

      <div className="playlist-card-info">
        <span className="playlist-card-name">{track.name}</span>
        <span className="playlist-card-artist">{track.artist}</span>
      </div>

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

      {track.url ? (
        <a
          href={track.url}
          target="_blank"
          rel="noreferrer"
          className="playlist-card-link"
        >
          Écouter
        </a>
      ) : (
        <span className="playlist-card-link playlist-card-link--disabled">Indisponible</span>
      )}
    </div>
  )
}

export default PlaylistCard
