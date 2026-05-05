import { useState } from 'react'
import EmotionDetector from '../components/EmotionDetector/EmotionDetector'
import Playlist from '../components/Playlist/Playlist'
import { EMOTIONS } from '../constants/emotions'
import { loginWithSpotify, getToken, logout, getPlaylistTracks } from '../services/spotify'
import './Result.css'

function Result() {
  const [detectedEmotion, setDetectedEmotion] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(!!getToken())

  const emotion = detectedEmotion ? EMOTIONS[detectedEmotion] : null

  async function handleEmotionDetected(emotionKey) {
    setDetectedEmotion(emotionKey)
    setLoading(true)
    setError(null)
    setTracks([])
    try {
      const results = await getPlaylistTracks(EMOTIONS[emotionKey])
      setTracks(results)
    } catch (e) {
      setError(e.message)
      if (e.message.includes('reconnecte')) setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    setConnected(false)
    setDetectedEmotion(null)
    setTracks([])
  }

  return (
    <main>
      {!connected ? (
        <div className="spotify-connect">
          <p>Connecte-toi à Spotify pour obtenir ta playlist</p>
          <button className="spotify-btn" onClick={loginWithSpotify}>
            Se connecter à Spotify
          </button>
        </div>
      ) : (
        <>
          <div className="spotify-status">
            <span>Spotify connecté</span>
            <button className="logout-btn" onClick={handleLogout}>Déconnecter</button>
          </div>
          <EmotionDetector onDetect={handleEmotionDetected} />
        </>
      )}

      {loading && <p className="result-loading">Chargement de ta playlist...</p>}
      {error && <p className="result-error">{error}</p>}

      {emotion && tracks.length > 0 && (
        <div className="result-content">
          <div className="result-emotion">
            <span className="result-emotion-label">{emotion.label}</span>
            <span className="result-emotion-genre">{emotion.genre}</span>
          </div>
          <h3 className="result-playlist-title">Ta playlist</h3>
          <Playlist tracks={tracks} />
        </div>
      )}
    </main>
  )
}

export default Result
