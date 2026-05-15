import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getToken } from '../services/spotify'

const Ctx = createContext(null)

async function readSpotifyError(res, fallback) {
  const data = await res.json().catch(() => ({}))
  return data?.error?.message ?? fallback
}

export function SpotifyPlayerProvider({ children }) {
  const [isReady, setIsReady]           = useState(false)
  const [error, setError]               = useState(null)
  const [needsReauth, setNeedsReauth]   = useState(false)
  const [playerState, setPlayerState]   = useState(null)
  const [currentEmotion, setCurrentEmotion] = useState(null)

  const deviceIdRef     = useRef(null)
  const playerRef       = useRef(null)
  const positionTimer   = useRef(null)
  const initializedRef  = useRef(false)

  const clearTimer = useCallback(() => {
    clearInterval(positionTimer.current)
    positionTimer.current = null
  }, [])

  const initPlayer = useCallback(() => {
    if (initializedRef.current) return
    const token = getToken()
    if (!token) return

    initializedRef.current = true

    function setup() {
      if (!window.Spotify) return

      const player = new window.Spotify.Player({
        name: 'Moodify Player',
        getOAuthToken: (cb) => { const t = getToken(); if (t) cb(t) },
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

      player.addListener('initialization_error', ({ message }) =>
        setError(`Initialisation Spotify: ${message}`)
      )

      player.addListener('authentication_error', ({ message }) => {
        setNeedsReauth(true)
        setError(message)
      })

      player.addListener('account_error', () =>
        setError('Spotify Premium requis pour la lecture.')
      )

      player.addListener('player_state_changed', (state) => {
        clearTimer()
        if (!state) { setPlayerState(null); return }

        setPlayerState({
          track:    state.track_window.current_track,
          paused:   state.paused,
          position: state.position,
          duration: state.duration,
        })

        if (!state.paused) {
          let pos = state.position
          positionTimer.current = setInterval(() => {
            pos += 1000
            setPlayerState(prev => prev ? { ...prev, position: pos } : prev)
          }, 1000)
        }
      })

      player.connect().then((ok) => {
        if (!ok) setError("Le player Spotify n'a pas pu se connecter.")
      })
    }

    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement('script')
      script.id    = 'spotify-sdk'
      script.src   = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
      window.onSpotifyWebPlaybackSDKReady = setup
    } else if (window.Spotify) {
      setup()
    } else {
      window.onSpotifyWebPlaybackSDKReady = setup
    }
  }, [clearTimer])

  /* Init au montage si déjà connecté, ou sur l'event après login */
  useEffect(() => {
    initPlayer()

    function onConnected() { initPlayer() }
    window.addEventListener('spotify:connected', onConnected)
    return () => {
      window.removeEventListener('spotify:connected', onConnected)
      clearTimer()
      // Pas de player.disconnect() → la musique continue à la navigation
    }
  }, [clearTimer, initPlayer])

  /* Lancer une playlist + enregistrer l'émotion en cours */
  const playPlaylist = useCallback(async (playlistId, emotion = null) => {
    const token    = getToken()
    const deviceId = deviceIdRef.current

    setError(null)

    if (!token)    { setNeedsReauth(true); throw new Error('Session Spotify expirée, reconnecte-toi.') }
    if (!deviceId) { throw new Error("Le player Spotify n'est pas encore prêt.") }

    const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ device_ids: [deviceId], play: false }),
    })

    if (!transferRes.ok && transferRes.status !== 204) {
      throw new Error(await readSpotifyError(transferRes, `Transfert Spotify impossible (${transferRes.status})`))
    }

    await new Promise(r => setTimeout(r, 800))

    const randomOffset = Math.floor(Math.random() * 50)

    const playRes = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { position: randomOffset },
        }),
      }
    )

    if (playRes.status === 403) {
      throw new Error('Lecture impossible — Spotify Premium requis pour la lecture en ligne.')
    }

    if (!playRes.ok && playRes.status !== 204) {
      throw new Error(await readSpotifyError(playRes, `Lecture Spotify impossible (${playRes.status})`))
    }

    // Active le shuffle pour que les suivantes soient aussi aléatoires
    await fetch(
      `https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => {})

    if (emotion !== null) setCurrentEmotion(emotion)
  }, [])

  /* Déconnexion complète (logout) */
  const disconnectPlayer = useCallback(() => {
    clearTimer()
    playerRef.current?.disconnect()
    playerRef.current    = null
    deviceIdRef.current  = null
    initializedRef.current = false
    setIsReady(false)
    setPlayerState(null)
    setCurrentEmotion(null)
    setError(null)
    setNeedsReauth(false)
  }, [clearTimer])

  const togglePlay = useCallback(() => { playerRef.current?.togglePlay() }, [])
  const nextTrack  = useCallback(() => { playerRef.current?.nextTrack() }, [])
  const prevTrack  = useCallback(() => { playerRef.current?.previousTrack() }, [])
  const seekTo     = useCallback((ms) => { playerRef.current?.seek(Math.max(0, ms)) }, [])

  return (
    <Ctx.Provider value={{
      isReady, error, needsReauth, playerState, currentEmotion,
      playPlaylist, disconnectPlayer, togglePlay, nextTrack, prevTrack, seekTo,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSpotifyPlayer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSpotifyPlayer doit être dans SpotifyPlayerProvider')
  return ctx
}
