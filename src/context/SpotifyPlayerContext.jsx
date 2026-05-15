// Context React qui encapsule le Spotify Web Playback SDK.
//
// Pourquoi un Context ?
//   Le player doit être partagé entre plusieurs composants (Result, PlayerBar, Dashboard…).
//   Un Context évite le "prop drilling" (passer playerState à travers 5 niveaux de composants).
//
// Spotify Web Playback SDK = bibliothèque JavaScript fournie par Spotify qui permet de
// lire de la musique directement dans le navigateur (l'onglet devient un "device" Spotify).
// Requiert Spotify Premium.
//
// Flux d'initialisation :
//   1. On injecte le script SDK dans le DOM (<script src="spotify-player.js">)
//   2. Spotify appelle window.onSpotifyWebPlaybackSDKReady quand il est prêt
//   3. On crée un Player, on s'abonne aux événements, on appelle player.connect()
//   4. L'événement 'ready' nous donne un device_id → on peut lancer de la musique

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getToken } from '../services/spotify'

// Le context null par défaut → useSpotifyPlayer() lèvera une erreur claire si utilisé hors Provider
const Ctx = createContext(null)

// Lit le message d'erreur dans la réponse de l'API Spotify Player
async function readSpotifyError(res, fallback) {
  const data = await res.json().catch(() => ({}))
  return data?.error?.message ?? fallback
}

export function SpotifyPlayerProvider({ children }) {
  // isReady = true quand le player est connecté et a un device_id valide
  const [isReady, setIsReady]           = useState(false)
  // error = message d'erreur à afficher dans l'UI (null = pas d'erreur)
  const [error, setError]               = useState(null)
  // needsReauth = true quand le token Spotify est expiré → invite à se reconnecter
  const [needsReauth, setNeedsReauth]   = useState(false)
  // playerState = { track, paused, position, duration } — null si rien ne joue
  const [playerState, setPlayerState]   = useState(null)
  // currentEmotion = émotion active quand la playlist en cours a été lancée
  const [currentEmotion, setCurrentEmotion] = useState(null)

  // Refs pour éviter des re-renders : on accède à ces valeurs sans les mettre en state
  const deviceIdRef    = useRef(null)  // ID du device Spotify (fourni par l'événement 'ready')
  const playerRef      = useRef(null)  // Instance window.Spotify.Player
  const positionTimer  = useRef(null)  // setInterval qui incrémente la position toutes les 1s
  const initializedRef = useRef(false) // Empêche d'initialiser le player deux fois

  // Arrête le timer de position (appelé à chaque changement de piste ou pause)
  const clearTimer = useCallback(() => {
    clearInterval(positionTimer.current)
    positionTimer.current = null
  }, [])

  // Initialise le Spotify Web Playback SDK.
  // Injecte le script si absent, ou appelle setup() directement si window.Spotify est déjà chargé.
  const initPlayer = useCallback(() => {
    // Guard : n'initialiser qu'une seule fois pendant toute la durée de vie de l'app
    if (initializedRef.current) return
    const token = getToken()
    if (!token) return  // Pas de token = pas connecté → rien à faire

    initializedRef.current = true

    function setup() {
      if (!window.Spotify) return  // SDK pas encore chargé (ne devrait pas arriver ici)

      const player = new window.Spotify.Player({
        name: 'Moodify Player',
        // getOAuthToken est appelé par le SDK chaque fois qu'il a besoin d'un token frais
        getOAuthToken: (cb) => { const t = getToken(); if (t) cb(t) },
        volume: 0.7,
      })

      playerRef.current = player

      // 'ready' : le player est connecté et prêt. device_id identifie cet onglet comme device Spotify.
      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id
        setError(null)
        setIsReady(true)
      })

      // 'not_ready' : connexion perdue (réseau, inactivité…)
      player.addListener('not_ready', () => {
        deviceIdRef.current = null
        setIsReady(false)
      })

      // Erreurs d'initialisation : navigateur incompatible, etc.
      player.addListener('initialization_error', ({ message }) =>
        setError(`Initialisation Spotify: ${message}`)
      )

      // Erreur d'auth : token expiré ou révoqué
      player.addListener('authentication_error', ({ message }) => {
        setNeedsReauth(true)
        setError(message)
      })

      // Premium requis pour la lecture en streaming
      player.addListener('account_error', () =>
        setError('Spotify Premium requis pour la lecture.')
      )

      // Déclenché à chaque changement de piste, play, pause, seek…
      // state = null signifie que la lecture est arrêtée
      player.addListener('player_state_changed', (state) => {
        clearTimer()
        if (!state) { setPlayerState(null); return }

        // Met à jour l'état immédiatement avec la position exacte fournie par Spotify
        setPlayerState({
          track:    state.track_window.current_track,
          paused:   state.paused,
          position: state.position,
          duration: state.duration,
        })

        // Si la musique joue, on simule l'avancement de la position (Spotify n'envoie pas d'update
        // en temps réel). On incrémente de 1000 ms toutes les secondes pour une barre de progression fluide.
        if (!state.paused) {
          let pos = state.position
          positionTimer.current = setInterval(() => {
            pos += 1000
            setPlayerState(prev => prev ? { ...prev, position: pos } : prev)
          }, 1000)
        }
      })

      // Connecte le player à l'infrastructure Spotify
      player.connect().then((ok) => {
        if (!ok) setError("Le player Spotify n'a pas pu se connecter.")
      })
    }

    // Injecte le script SDK si pas encore présent dans le DOM
    if (!document.getElementById('spotify-sdk')) {
      const script  = document.createElement('script')
      script.id     = 'spotify-sdk'
      script.src    = 'https://sdk.scdn.co/spotify-player.js'
      script.async  = true
      document.body.appendChild(script)
      // Le SDK appelle ce callback global quand il est chargé et prêt
      window.onSpotifyWebPlaybackSDKReady = setup
    } else if (window.Spotify) {
      // Le SDK est déjà chargé (ex: navigation rapide) → on appelle setup() directement
      setup()
    } else {
      // Script en cours de chargement → on attend le callback
      window.onSpotifyWebPlaybackSDKReady = setup
    }
  }, [clearTimer])

  // Initialise le player au montage si un token est déjà présent (reconnexion après rechargement),
  // ou sur l'événement 'spotify:connected' déclenché par Callback.jsx après un login réussi.
  useEffect(() => {
    initPlayer()

    function onConnected() { initPlayer() }
    window.addEventListener('spotify:connected', onConnected)

    return () => {
      window.removeEventListener('spotify:connected', onConnected)
      clearTimer()
      // On ne déconnecte PAS le player ici : la musique doit continuer quand on change de page
    }
  }, [clearTimer, initPlayer])

  // Lance la lecture d'une playlist Spotify sur notre device.
  // Étapes :
  //   1. Transfert de la lecture vers notre device (PUT /me/player)
  //   2. Attente de 800ms (le SDK a besoin d'un court délai pour accepter les commandes)
  //   3. Lancement de la playlist à un offset aléatoire (pour varier les pistes)
  //   4. Activation du shuffle
  const playPlaylist = useCallback(async (playlistId, emotion = null) => {
    const token    = getToken()
    const deviceId = deviceIdRef.current

    setError(null)

    if (!token)    { setNeedsReauth(true); throw new Error('Session Spotify expirée, reconnecte-toi.') }
    if (!deviceId) { throw new Error("Le player Spotify n'est pas encore prêt.") }

    // Étape 1 : transférer la lecture vers notre device (play: false = transférer sans lancer)
    const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ device_ids: [deviceId], play: false }),
    })

    if (!transferRes.ok && transferRes.status !== 204) {
      throw new Error(await readSpotifyError(transferRes, `Transfert Spotify impossible (${transferRes.status})`))
    }

    // Étape 2 : délai nécessaire pour que le SDK accepte la commande suivante
    await new Promise(r => setTimeout(r, 800))

    // Étape 3 : lancement à une position aléatoire dans les 50 premières pistes
    // → évite de toujours commencer par la première piste de la playlist
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

    // 403 = compte free Spotify (Premium requis pour la lecture via SDK)
    if (playRes.status === 403) {
      throw new Error('Lecture impossible — Spotify Premium requis pour la lecture en ligne.')
    }

    if (!playRes.ok && playRes.status !== 204) {
      throw new Error(await readSpotifyError(playRes, `Lecture Spotify impossible (${playRes.status})`))
    }

    // Étape 4 : active le shuffle pour que les pistes suivantes soient aussi aléatoires
    // .catch(() => {}) = on ignore les erreurs (le shuffle est un bonus, pas critique)
    await fetch(
      `https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => {})

    // Mémorise l'émotion qui a déclenché cette playlist (utilisé par PlayerBar pour les favoris)
    if (emotion !== null) setCurrentEmotion(emotion)
  }, [])

  // Déconnecte complètement le player et remet tous les états à zéro.
  // Appelé quand l'utilisateur clique "Déconnecter" dans Result.jsx.
  const disconnectPlayer = useCallback(() => {
    clearTimer()
    playerRef.current?.disconnect()
    playerRef.current     = null
    deviceIdRef.current   = null
    initializedRef.current = false
    setIsReady(false)
    setPlayerState(null)
    setCurrentEmotion(null)
    setError(null)
    setNeedsReauth(false)
  }, [clearTimer])

  // Contrôles de lecture — délèguent directement au SDK Spotify
  const togglePlay = useCallback(() => { playerRef.current?.togglePlay() }, [])
  const nextTrack  = useCallback(() => { playerRef.current?.nextTrack() }, [])
  const prevTrack  = useCallback(() => { playerRef.current?.previousTrack() }, [])
  // seekTo reçoit des millisecondes, Math.max(0, ms) empêche de chercher à une position négative
  const seekTo     = useCallback((ms) => { playerRef.current?.seek(Math.max(0, ms)) }, [])

  // Valeurs et fonctions exposées à tous les composants enfants via useSpotifyPlayer()
  return (
    <Ctx.Provider value={{
      isReady, error, needsReauth, playerState, currentEmotion,
      playPlaylist, disconnectPlayer, togglePlay, nextTrack, prevTrack, seekTo,
    }}>
      {children}
    </Ctx.Provider>
  )
}

// Hook personnalisé pour accéder au context depuis n'importe quel composant enfant.
// Lance une erreur claire si utilisé hors du Provider (erreur de configuration).
export function useSpotifyPlayer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSpotifyPlayer doit être dans SpotifyPlayerProvider')
  return ctx
}
