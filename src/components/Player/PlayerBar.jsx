import { useState } from 'react'
import { useFavorites } from '../../hooks/useFavorites'
import './PlayerBar.css'

function formatTime(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function PlayerBar({ playerState, onToggle, onNext, onPrev, onSeek, currentEmotion }) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const [expanded, setExpanded] = useState(false)

  if (!playerState?.track) return null

  const { track, paused, position, duration } = playerState
  const progress = duration > 0 ? (position / duration) * 100 : 0

  const trackForFav = {
    id: track.id,
    name: track.name,
    artist: track.artists[0]?.name ?? '',
    image: track.album.images[0]?.url ?? '',
    url: `https://open.spotify.com/track/${track.id}`,
  }

  const fav = isFavorite(track.id)

  function handleFav() {
    fav ? removeFavorite(track.id) : addFavorite(trackForFav, currentEmotion)
  }

  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(Math.floor(((e.clientX - rect.left) / rect.width) * duration))
  }

  // ── Vue expandée (plein écran) ─────────────────────────────────────
  if (expanded) {
    return (
      <div className="player-fullscreen">
        <button className="player-collapse-btn" onClick={() => setExpanded(false)}>✕</button>

        <img
          src={track.album.images[0]?.url}
          alt={track.name}
          className="player-full-cover"
        />

        <div className="player-full-info">
          <span className="player-full-name">{track.name}</span>
          <span className="player-full-artist">{track.artists.map(a => a.name).join(', ')}</span>
        </div>

        <button
          className={`player-fav-btn player-fav-btn--lg ${fav ? 'player-fav-btn--active' : ''}`}
          onClick={handleFav}
          title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {fav ? '❤️' : '🤍'}
        </button>

        {/* Barre de progression */}
        <div className="player-full-progress">
          <span className="player-time">{formatTime(position)}</span>
          <div className="player-progress-bar player-progress-bar--lg" onClick={handleProgressClick}>
            <div className="player-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>

        {/* Contrôles */}
        <div className="player-controls player-controls--lg">
          <button className="player-ctrl-btn" onClick={onPrev}>⏮</button>
          <button className="player-ctrl-btn player-ctrl-btn--main" onClick={onToggle}>
            {paused ? '▶' : '⏸'}
          </button>
          <button className="player-ctrl-btn" onClick={onNext}>⏭</button>
        </div>
      </div>
    )
  }

  // ── Mini barre fixe en bas ─────────────────────────────────────────
  return (
    <div className="player-bar">
      {/* Infos piste — clic pour agrandir */}
      <div className="player-track" onClick={() => setExpanded(true)} style={{ cursor: 'pointer' }} title="Agrandir le player">
        <img src={track.album.images[0]?.url} alt={track.name} className="player-cover" />
        <div className="player-track-info">
          <span className="player-track-name">{track.name}</span>
          <span className="player-track-artist">{track.artists.map(a => a.name).join(', ')}</span>
        </div>
        <span className="player-expand-hint">⛶</span>
      </div>

      <div className="player-fav-and-controls">
        <button className={`player-fav-btn ${fav ? 'player-fav-btn--active' : ''}`} onClick={handleFav} title={fav ? 'Retirer' : 'Ajouter aux favoris'}>
          {fav ? '❤️' : '🤍'}
        </button>
        <div className="player-controls">
          <button className="player-ctrl-btn" onClick={onPrev}>⏮</button>
          <button className="player-ctrl-btn player-ctrl-btn--main" onClick={onToggle}>
            {paused ? '▶' : '⏸'}
          </button>
          <button className="player-ctrl-btn" onClick={onNext}>⏭</button>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="player-progress">
        <span className="player-time">{formatTime(position)}</span>
        <div className="player-progress-bar" onClick={handleProgressClick}>
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export default PlayerBar
