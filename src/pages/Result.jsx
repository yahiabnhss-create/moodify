import { useCallback, useEffect, useRef, useState } from 'react'
import EmotionDetector from '../components/EmotionDetector/EmotionDetector'
import Playlist from '../components/Playlist/Playlist'
import { EMOTIONS } from '../constants/emotions'
import { loginWithSpotify, getToken, logout, getPlaylistTracks } from '../services/spotify'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'
import { useFavorites } from '../hooks/useFavorites'
import { useHistory } from '../hooks/useHistory'
import PlayerBar from '../components/Player/PlayerBar'
import './Result.css'

function SpotifyIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function Result() {
  const detectRequestRef = useRef(0)
  const [connected, setConnected] = useState(!!getToken())
  const [detectedEmotion, setDetectedEmotion] = useState(null)
  const [detectedConfidence, setDetectedConfidence] = useState(0)
  const [pendingPlayback, setPendingPlayback] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [apiError, setApiError] = useState(null)

  const { isReady, error: playerError, needsReauth, playerState, playPlaylist, togglePlay, nextTrack, prevTrack, seekTo } = useSpotifyPlayer()
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const { addSession } = useHistory()

  const currentEmotion = detectedEmotion ? EMOTIONS[detectedEmotion] : null

  useEffect(() => {
    if (!isReady || !pendingPlayback) return

    let cancelled = false

    async function playPending() {
      try {
        if (pendingPlayback.requestId !== detectRequestRef.current) return
        await playPlaylist(pendingPlayback.playlistId)
        if (cancelled || pendingPlayback.requestId !== detectRequestRef.current) return

        addSession(
          pendingPlayback.emotion,
          pendingPlayback.confidence,
          pendingPlayback.playlistId,
          pendingPlayback.playlistName
        )
        setPendingPlayback(null)
      } catch (err) {
        if (!cancelled && pendingPlayback.requestId === detectRequestRef.current) {
          setApiError(err.message)
        }
      }
    }

    void playPending()

    return () => {
      cancelled = true
    }
  }, [addSession, isReady, pendingPlayback, playPlaylist])

  const handleDetect = useCallback(async ({ emotion, confidence }) => {
    const requestId = detectRequestRef.current + 1
    detectRequestRef.current = requestId

    setDetectedEmotion(emotion)
    setDetectedConfidence(confidence)
    setPendingPlayback(null)
    setTracks([])
    setApiError(null)

    const emotionData = EMOTIONS[emotion]
    if (!emotionData) {
      setApiError(`Émotion inconnue: ${emotion}`)
      return
    }

    const playback = {
      requestId,
      emotion,
      confidence,
      playlistId: emotionData.playlistId,
      playlistName: emotionData.label,
    }

    if (isReady) {
      try {
        await playPlaylist(emotionData.playlistId)
        addSession(emotion, confidence, emotionData.playlistId, emotionData.label)
      } catch (err) {
        setApiError(err.message)
      }
    } else {
      setPendingPlayback(playback)
    }

    setLoadingTracks(true)
    try {
      const results = await getPlaylistTracks(emotionData)
      if (detectRequestRef.current !== requestId) return
      setTracks(results)
    } catch (err) {
      if (detectRequestRef.current !== requestId) return
      setApiError(err.message)
    } finally {
      if (detectRequestRef.current === requestId) {
        setLoadingTracks(false)
      }
    }
  }, [addSession, isReady, playPlaylist])

  const handleLogin = useCallback(async () => {
    setApiError(null)
    try {
      await loginWithSpotify()
    } catch (err) {
      setApiError(err.message)
    }
  }, [])

  function handleLogout() {
    detectRequestRef.current += 1
    logout()
    setConnected(false)
    setDetectedEmotion(null)
    setDetectedConfidence(0)
    setPendingPlayback(null)
    setTracks([])
    setApiError(null)
  }

  function handleChangeMood() {
    detectRequestRef.current += 1
    setDetectedEmotion(null)
    setDetectedConfidence(0)
    setPendingPlayback(null)
    setTracks([])
    setApiError(null)
  }

  if (!connected) {
    return (
      <main>
        <div className="spotify-connect">
          <SpotifyIcon size={48} />
          <p>Connecte-toi à Spotify pour obtenir ta playlist</p>
          {apiError && <p className="result-error">{apiError}</p>}
          <button className="spotify-btn" onClick={() => void handleLogin()}>
            <SpotifyIcon size={20} />
            Se connecter avec Spotify
          </button>
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className="spotify-status">
        <span className="spotify-badge">
          <SpotifyIcon size={16} />
          {isReady ? 'Player prêt' : 'Connexion player...'}
        </span>
        <button className="logout-btn" onClick={handleLogout}>Déconnecter</button>
      </div>

      {needsReauth && (
        <div className="reauth-banner">
          <p>Tes droits Spotify ont changé. Reconnecte-toi.</p>
          <button className="spotify-btn" onClick={() => { handleLogout(); void handleLogin() }}>
            <SpotifyIcon size={18} /> Reconnecter Spotify
          </button>
        </div>
      )}
      {playerError && !needsReauth && <p className="result-error">{playerError}</p>}
      {apiError && <p className="result-error">{apiError}</p>}

      <EmotionDetector onDetect={handleDetect} />

      {currentEmotion && (
        <div className="emotion-result">
          <div className="emotion-result-badge">
            <span className="emotion-label">{currentEmotion.label}</span>
            <span className="emotion-genre">{currentEmotion.genre}</span>
            <span className="emotion-confidence">{Math.round(detectedConfidence * 100)}% de confiance</span>
          </div>
          {isReady && <p className="now-playing">Playlist en cours de lecture dans Spotify</p>}
          {!isReady && <p className="now-playing">Player en cours d'initialisation...</p>}
          <button className="change-mood-btn" onClick={handleChangeMood}>
            Changer d'humeur
          </button>
        </div>
      )}

      {loadingTracks && <p className="result-loading">Chargement des titres...</p>}

      {tracks.length > 0 && (
        <div className="result-content">
          <h3 className="result-playlist-title">Titres de la playlist</h3>
          <Playlist
            tracks={tracks}
            onFavorite={track =>
              isFavorite(track.id)
                ? removeFavorite(track.id)
                : addFavorite(track, detectedEmotion)
            }
            isFavorite={isFavorite}
          />
        </div>
      )}

      <PlayerBar
        playerState={playerState}
        onToggle={togglePlay}
        onNext={nextTrack}
        onPrev={prevTrack}
        onSeek={seekTo}
        currentEmotion={detectedEmotion}
      />
    </main>
  )
}

export default Result
