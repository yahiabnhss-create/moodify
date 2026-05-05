import { useState, useEffect, useRef } from 'react'
import { getToken } from '../services/spotify'

export function useSpotifyPlayer() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [playerState, setPlayerState] = useState(null)

  const deviceIdRef = useRef(null)
  const playerRef = useRef(null)
  const positionTimerRef = useRef(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Moodify Player',
        getOAuthToken: (cb) => { const t = getToken(); if (t) cb(t) },
        volume: 0.7,
      })

      playerRef.current = player

      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id
        setIsReady(true)
      })

      player.addListener('not_ready', () => setIsReady(false))
      player.addListener('initialization_error', ({ message }) => setError(`Init: ${message}`))
      player.addListener('authentication_error', ({ message }) => {
        setNeedsReauth(true)
        setError(message)
      })
      player.addListener('account_error', () => setError('Spotify Premium requis'))

      player.addListener('player_state_changed', (state) => {
        if (!state) { setPlayerState(null); return }

        setPlayerState({
          track: state.track_window.current_track,
          paused: state.paused,
          position: state.position,
          duration: state.duration,
        })

        clearInterval(positionTimerRef.current)
        if (!state.paused) {
          let pos = state.position
          positionTimerRef.current = setInterval(() => {
            pos += 1000
            setPlayerState(prev => prev ? { ...prev, position: pos } : prev)
          }, 1000)
        }
      })

      player.connect()
    }

    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement('script')
      script.id = 'spotify-sdk'
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
    } else if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady()
    }

    return () => {
      playerRef.current?.disconnect()
      clearInterval(positionTimerRef.current)
    }
  }, [])

  // 🎯 BUT : Lance une playlist
  // ⚠️ ATTENTION : "Device not found" arrive quand Spotify ne reconnaît pas encore le device
  //   Fix : on transfère d'abord la lecture vers notre device, puis on joue
  async function playPlaylist(playlistId) {
    const token = getToken()
    const deviceId = deviceIdRef.current
    if (!token || !deviceId) return

    // Étape 1 : transférer la lecture vers notre device Moodify
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    })

    // Étape 2 : petite pause pour laisser Spotify enregistrer le device
    await new Promise(r => setTimeout(r, 800))

    // Étape 3 : lancer la playlist
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
      }
    )

    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error?.message ?? 'Erreur lecture Spotify')
    }
  }

  function togglePlay() { playerRef.current?.togglePlay() }
  function nextTrack()  { playerRef.current?.nextTrack() }
  function prevTrack()  { playerRef.current?.previousTrack() }
  function seekTo(ms)   { playerRef.current?.seek(ms) }

  return { isReady, error, needsReauth, playerState, playPlaylist, togglePlay, nextTrack, prevTrack, seekTo }
}
