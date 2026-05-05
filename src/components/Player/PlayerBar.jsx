import { useFavorites } from '../../hooks/useFavorites'
import './PlayerBar.css'

// Convertit des millisecondes en "m:ss"
function formatTime(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// 🎯 BUT : Mini-player affiché en bas de page quand une piste est en cours
// @param playerState  {{ track, paused, position, duration }}
// @param onToggle     {function} — play / pause
// @param onNext       {function} — piste suivante
// @param onPrev       {function} — piste précédente
// @param onSeek       {function(ms)} — déplacement dans la piste
// @param currentEmotion {string|null} — émotion active pour sauvegarder le favori avec le contexte
function PlayerBar({ playerState, onToggle, onNext, onPrev, onSeek, currentEmotion }) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()

  if (!playerState?.track) return null

  const { track, paused, position, duration } = playerState

  // Construit un objet compatible avec notre système de favoris
  const trackForFav = {
    id: track.id,
    name: track.name,
    artist: track.artists[0]?.name ?? '',
    image: track.album.images[0]?.url ?? '',
    url: `https://open.spotify.com/track/${track.id}`,
  }

  const fav = isFavorite(track.id)
  const progress = duration > 0 ? (position / duration) * 100 : 0

  function handleFav() {
    fav ? removeFavorite(track.id) : addFavorite(trackForFav, currentEmotion)
  }

  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(Math.floor(ratio * duration))
  }

  return (
    <div className="player-bar">
      {/* Infos piste */}
      <div className="player-track">
        <img src={track.album.images[0]?.url} alt={track.name} className="player-cover" />
        <div className="player-track-info">
          <span className="player-track-name">{track.name}</span>
          <span className="player-track-artist">{track.artists.map(a => a.name).join(', ')}</span>
        </div>
        <button
          className={`player-fav-btn ${fav ? 'player-fav-btn--active' : ''}`}
          onClick={handleFav}
          title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {fav ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Contrôles */}
      <div className="player-controls">
        <button className="player-ctrl-btn" onClick={onPrev} title="Précédent">⏮</button>
        <button className="player-ctrl-btn player-ctrl-btn--main" onClick={onToggle} title={paused ? 'Lecture' : 'Pause'}>
          {paused ? '▶' : '⏸'}
        </button>
        <button className="player-ctrl-btn" onClick={onNext} title="Suivant">⏭</button>
      </div>

      {/* Barre de progression */}
      <div className="player-progress">
        <span className="player-time">{formatTime(position)}</span>
        <div className="player-progress-bar" onClick={handleProgressClick} title="Cliquer pour avancer">
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export default PlayerBar
