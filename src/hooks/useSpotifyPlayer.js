import { useState, useEffect, useRef, useCallback } from 'react'
import { getToken } from '../services/spotify'

async function readSpotifyError(res, fallback) {
  const data = await res.json().catch(() => ({}))
  return data?.error?.message ?? fallback
}

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

    let active = true

    function clearPositionTimer() {
      clearInterval(positionTimerRef.current)
      positionTimerRef.current = null
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!active || !window.Spotify) return

      const player = new window.Spotify.Player({
        name: 'Moodify Player',
        getOAuthToken: (cb) => {
          const currentToken = getToken()
          if (currentToken) cb(currentToken)
        },
        volume: 0.7,
      })

      playerRef.current = player

      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id
        setError(null)
        setIsReady(true)
      })

      player.addListener('not_ready', () => {
        deviceIdRef.current = null
        setIsReady(false)
      })
      player.addListener('initialization_error', ({ message }) => setError(`Initialisation Spotify: ${message}`))
      player.addListener('authentication_error', ({ message }) => {
        setNeedsReauth(true)
        setError(message)
      })
      player.addListener('account_error', () => setError('Spotify Premium requis'))

      player.addListener('player_state_changed', (state) => {
        clearPositionTimer()

        if (!state) {
          setPlayerState(null)
          return
        }

        setPlayerState({
          track: state.track_window.current_track,
          paused: state.paused,
          position: state.position,
          duration: state.duration,
        })

        if (!state.paused) {
          let position = state.position
          positionTimerRef.current = setInterval(() => {
            position += 1000
            setPlayerState(prev => prev ? { ...prev, position } : prev)
          }, 1000)
        }
      })

      player.connect().then((connected) => {
        if (!connected && active) {
          setError("Le player Spotify n'a pas pu se connecter.")
        }
      })
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
      active = false
      playerRef.current?.disconnect()
      playerRef.current = null
      deviceIdRef.current = null
      clearPositionTimer()
    }
  }, [])

  const playPlaylist = useCallback(async (playlistId) => {
    const token = getToken()
    const deviceId = deviceIdRef.current

    setError(null)

    if (!token) {
      setNeedsReauth(true)
      throw new Error('Session Spotify expirée, reconnecte-toi.')
    }

    if (!deviceId) {
      throw new Error("Le player Spotify n'est pas encore prêt.")
    }

    const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    })

    if (!transferRes.ok && transferRes.status !== 204) {
      throw new Error(await readSpotifyError(transferRes, `Transfert Spotify impossible (${transferRes.status})`))
    }

    await new Promise((resolve) => setTimeout(resolve, 800))

    const playRes = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
      }
    )

    if (!playRes.ok && playRes.status !== 204) {
      throw new Error(await readSpotifyError(playRes, `Lecture Spotify impossible (${playRes.status})`))
    }
  }, [])

  const togglePlay = useCallback(() => { playerRef.current?.togglePlay() }, [])
  const nextTrack = useCallback(() => { playerRef.current?.nextTrack() }, [])
  const prevTrack = useCallback(() => { playerRef.current?.previousTrack() }, [])
  const seekTo = useCallback((ms) => { playerRef.current?.seek(Math.max(0, ms)) }, [])

  return { isReady, error, needsReauth, playerState, playPlaylist, togglePlay, nextTrack, prevTrack, seekTo }
}
