import { useMemo, useState } from 'react'
import { useFavorites } from '../../hooks/useFavorites'
import './PlayerBar.css'

function formatTime(ms) {
  if (!ms) return '0:00'
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function PlayerBar({ playerState, onToggle, onNext, onPrev, onSeek, currentEmotion }) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const [expanded, setExpanded] = useState(false)

  const track = playerState?.track
  const paused = playerState?.paused ?? true
  const position = playerState?.position ?? 0
  const duration = playerState?.duration ?? 0

  const artists = useMemo(
    () => track?.artists?.map(artist => artist.name).join(', ') ?? '',
    [track]
  )
  const image = track?.album?.images?.[0]?.url ?? ''
  const progress = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0
  const fav = track?.id ? isFavorite(track.id) : false

  const trackForFav = useMemo(() => {
    if (!track) return null

    return {
      id: track.id,
      name: track.name,
      artist: track.artists?.[0]?.name ?? '',
      image,
      url: `https://open.spotify.com/track/${track.id}`,
    }
  }, [image, track])

  if (!track) return null

  function handleFav() {
    if (!trackForFav) return
    fav ? removeFavorite(track.id) : addFavorite(trackForFav, currentEmotion)
  }

  function handleProgressClick(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !duration) return

    const ratio = (event.clientX - rect.left) / rect.width
    onSeek(Math.floor(Math.min(1, Math.max(0, ratio)) * duration))
  }

  const cover = image ? (
    <img src={image} alt={track.name} className={expanded ? 'player-full-cover' : 'player-cover'} />
  ) : (
    <div className={expanded ? 'player-full-cover player-cover--placeholder' : 'player-cover player-cover--placeholder'} aria-hidden="true" />
  )

  if (expanded) {
    return (
      <div className="player-fullscreen">
        <button
          className="player-collapse-btn"
          onClick={() => setExpanded(false)}
          aria-label="Réduire le player"
          title="Réduire"
        >
          ✕
        </button>

        {cover}

        <div className="player-full-info">
          <span className="player-full-name">{track.name}</span>
          <span className="player-full-artist">{artists}</span>
        </div>

        <button
          className={`player-fav-btn player-fav-btn--lg ${fav ? 'player-fav-btn--active' : ''}`}
          onClick={handleFav}
          title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {fav ? '❤️' : '🤍'}
        </button>

        <div className="player-full-progress">
          <span className="player-time">{formatTime(position)}</span>
          <div
            className="player-progress-bar player-progress-bar--lg"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Position du morceau"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={position}
          >
            <div className="player-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>

        <div className="player-controls player-controls--lg">
          <button className="player-ctrl-btn" onClick={onPrev} aria-label="Titre précédent">⏮</button>
          <button className="player-ctrl-btn player-ctrl-btn--main" onClick={onToggle} aria-label={paused ? 'Lecture' : 'Pause'}>
            {paused ? '▶' : '⏸'}
          </button>
          <button className="player-ctrl-btn" onClick={onNext} aria-label="Titre suivant">⏭</button>
        </div>
      </div>
    )
  }

  return (
    <div className="player-bar">
      <button className="player-track" onClick={() => setExpanded(true)} title="Agrandir le player">
        {cover}
        <div className="player-track-info">
          <span className="player-track-name">{track.name}</span>
          <span className="player-track-artist">{artists}</span>
        </div>
        <span className="player-expand-hint" aria-hidden="true">⛶</span>
      </button>

      <div className="player-fav-and-controls">
        <button
          className={`player-fav-btn ${fav ? 'player-fav-btn--active' : ''}`}
          onClick={handleFav}
          title={fav ? 'Retirer' : 'Ajouter aux favoris'}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {fav ? '❤️' : '🤍'}
        </button>
        <div className="player-controls">
          <button className="player-ctrl-btn" onClick={onPrev} aria-label="Titre précédent">⏮</button>
          <button className="player-ctrl-btn player-ctrl-btn--main" onClick={onToggle} aria-label={paused ? 'Lecture' : 'Pause'}>
            {paused ? '▶' : '⏸'}
          </button>
          <button className="player-ctrl-btn" onClick={onNext} aria-label="Titre suivant">⏭</button>
        </div>
      </div>

      <div className="player-progress">
        <span className="player-time">{formatTime(position)}</span>
        <div
          className="player-progress-bar"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Position du morceau"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={position}
        >
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export default PlayerBar
