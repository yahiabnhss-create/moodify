import { useEffect, useState } from 'react'
import EmotionDetector from '../components/EmotionDetector/EmotionDetector'
import Playlist from '../components/Playlist/Playlist'
import { EMOTIONS } from '../constants/emotions'
import { loginWithSpotify, getToken, logout, getPlaylistTracks } from '../services/spotify'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'
import { useEmotionStability } from '../hooks/useEmotionStability'
import { useFavorites } from '../hooks/useFavorites'
import './Result.css'

function SpotifyIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function Result() {
  const [connected, setConnected] = useState(!!getToken())
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)

  // 💡 CONCEPT : On utilise nos deux custom hooks
  //   useSpotifyPlayer gère le SDK et expose playPlaylist()
  //   useEmotionStability filtre les émotions instables et expose reportEmotion()
  const { isReady, error: playerError, playPlaylist } = useSpotifyPlayer()
  const { stableEmotion, confidence, secondsLeft, reportEmotion } = useEmotionStability()
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()

  const currentEmotion = stableEmotion ? EMOTIONS[stableEmotion] : null

  // 🎯 BUT : Réagir quand une émotion stable est validée
  // 💡 CONCEPT : useEffect avec dépendance [stableEmotion]
  //   Ce bloc s'exécute UNIQUEMENT quand stableEmotion change
  //   → c'est le point de déclenchement de l'auto-play
  useEffect(() => {
    if (!stableEmotion || !isReady) return

    const emotion = EMOTIONS[stableEmotion]
    if (!emotion) return

    // Lance la playlist correspondante sur Spotify
    playPlaylist(emotion.playlistId)

    // Charge aussi la liste des pistes pour l'affichage
    setLoadingTracks(true)
    getPlaylistTracks(emotion)
      .then(setTracks)
      .catch(() => setTracks([]))
      .finally(() => setLoadingTracks(false))
  }, [stableEmotion]) // ⚠️ On ne met pas isReady ici pour éviter des double-déclenchements

  function handleLogout() {
    logout()
    setConnected(false)
    setTracks([])
  }

  // ─── Pas connecté à Spotify ───────────────────────────────────────
  if (!connected) {
    return (
      <main>
        <div className="spotify-connect">
          <SpotifyIcon size={48} />
          <p>Connecte-toi à Spotify pour obtenir ta playlist</p>
          <button className="spotify-btn" onClick={loginWithSpotify}>
            <SpotifyIcon size={20} />
            Se connecter avec Spotify
          </button>
        </div>
      </main>
    )
  }

  return (
    <main>
      {/* Barre de statut Spotify */}
      <div className="spotify-status">
        <span className="spotify-badge">
          <SpotifyIcon size={16} />
          {isReady ? 'Player prêt' : 'Connexion player...'}
        </span>
        <button className="logout-btn" onClick={handleLogout}>Déconnecter</button>
      </div>

      {playerError && <p className="result-error">{playerError}</p>}

      {/* Détecteur d'émotion — passe reportEmotion comme callback */}
      <EmotionDetector onDetect={({ emotion, confidence }) => reportEmotion(emotion, confidence)} />

      {/* Countdown de stabilité */}
      {secondsLeft > 0 && (
        <div className="stability-countdown">
          <div className="countdown-bar" style={{ '--seconds': secondsLeft }} />
          <p>Stabilisation en cours… <strong>{secondsLeft}s</strong></p>
        </div>
      )}

      {/* Émotion validée */}
      {currentEmotion && (
        <div className="emotion-result">
          <div className="emotion-result-badge">
            <span className="emotion-label">{currentEmotion.label}</span>
            <span className="emotion-genre">{currentEmotion.genre}</span>
            <span className="emotion-confidence">{Math.round(confidence * 100)}% de confiance</span>
          </div>
          <p className="now-playing">🎵 Playlist en cours de lecture dans Spotify</p>
        </div>
      )}

      {/* Liste des pistes */}
      {loadingTracks && <p className="result-loading">Chargement des titres...</p>}
      {tracks.length > 0 && (
        <div className="result-content">
          <h3 className="result-playlist-title">Titres de la playlist</h3>
          <Playlist
            tracks={tracks}
            onFavorite={track =>
              isFavorite(track.id)
                ? removeFavorite(track.id)
                : addFavorite(track, stableEmotion)
            }
            isFavorite={isFavorite}
          />
        </div>
      )}
    </main>
  )
}

export default Result
