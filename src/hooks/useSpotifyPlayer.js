import { useState, useEffect, useRef } from 'react'
import { getToken } from '../services/spotify'

export function useSpotifyPlayer() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  // 🎯 BUT : État du player en temps réel (piste, pause, position, durée)
  // 💡 Alimenté par l'événement player_state_changed du SDK
  const [playerState, setPlayerState] = useState(null)

  const deviceIdRef = useRef(null)
  const playerRef = useRef(null)
  const positionTimerRef = useRef(null) // Timer pour avancer la barre de progression

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
      player.addListener('account_error', () => setError('Spotify Premium requis pour la lecture'))

      // 🎯 BUT : Écoute les changements d'état du player
      // 💡 CONCEPT : Cet événement est émis à chaque changement :
      //   - nouvelle piste, pause, reprise, seek...
      //   On en profite pour mettre à jour notre état React
      player.addListener('player_state_changed', (state) => {
        if (!state) { setPlayerState(null); return }

        setPlayerState({
          track: state.track_window.current_track,
          paused: state.paused,
          position: state.position,
          duration: state.duration,
        })

        // 💡 Timer local pour faire avancer la barre de progression chaque seconde
        //    sans attendre un nouvel événement SDK
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

  async function playPlaylist(playlistId) {
    const token = getToken()
    if (!token || !deviceIdRef.current) return

    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
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

  // 🎯 BUT : Contrôles du player — délégués directement au SDK
  function togglePlay() { playerRef.current?.togglePlay() }
  function nextTrack()  { playerRef.current?.nextTrack() }
  function prevTrack()  { playerRef.current?.previousTrack() }

  // 🎯 BUT : Seek à une position précise (en ms)
  function seekTo(ms) {
    playerRef.current?.seek(ms)
  }

  return { isReady, error, needsReauth, playerState, playPlaylist, togglePlay, nextTrack, prevTrack, seekTo }
}
