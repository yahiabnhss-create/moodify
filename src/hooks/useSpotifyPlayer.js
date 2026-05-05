import { useState, useEffect, useRef } from 'react'
import { getToken } from '../services/spotify'

// 🎯 BUT : Initialise le Spotify Web Playback SDK dans le navigateur
// Ce hook transforme l'onglet en "appareil Spotify" capable de lire de la musique
//
// 💡 CONCEPT : Pourquoi un custom hook ?
//   Le SDK a un cycle de vie complexe (chargement script → init player → connexion → events)
//   Mettre tout ça dans un composant mélange logique et rendu.
//   Un hook isole cette logique et la rend réutilisable.
//
// @returns {{
//   isReady: boolean,       — le player est connecté et prêt
//   error: string | null,   — message d'erreur si problème
//   playPlaylist: function, — lance une playlist par son ID
//   player: Spotify.Player  — instance du player (pour pause/resume si besoin)
// }}
export function useSpotifyPlayer() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  // 💡 useRef pour deviceId et player : ces valeurs n'ont pas besoin de déclencher
  //    un re-render quand elles changent — on les utilise juste en interne
  const deviceIdRef = useRef(null)
  const playerRef = useRef(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    // 🎯 BUT : On définit le callback AVANT de charger le script
    // ⚠️ ATTENTION : Si on charge le script d'abord, le callback peut être appelé
    //    avant qu'on l'ait défini → player jamais initialisé
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Moodify Player',
        // 💡 getOAuthToken est appelé par le SDK quand il a besoin d'un token frais
        //    On retourne le token stocké en localStorage
        getOAuthToken: (cb) => {
          const t = getToken()
          if (t) cb(t)
        },
        volume: 0.7,
      })

      playerRef.current = player

      // Événements du cycle de vie du player
      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id
        setIsReady(true)
      })

      player.addListener('not_ready', () => {
        setIsReady(false)
      })

      // ⚠️ Ces erreurs arrivent souvent si le token manque de scopes ou si pas Premium
      player.addListener('initialization_error', ({ message }) => setError(`Init: ${message}`))
      player.addListener('authentication_error', ({ message }) => {
        // "Permissions missing" = le token n'a pas les bons scopes → reconnexion nécessaire
        setNeedsReauth(true)
        setError(message)
      })
      player.addListener('account_error', () => setError('Spotify Premium requis pour la lecture'))

      player.connect()
    }

    // 💡 CONCEPT : Chargement dynamique d'un script externe
    //   On crée une balise <script> et on l'ajoute au DOM
    //   C'est différent d'un import ES6 : le SDK s'attache sur window.Spotify
    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement('script')
      script.id = 'spotify-sdk'
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
    } else if (window.Spotify) {
      // Script déjà chargé (hot reload) → on appelle le callback manuellement
      window.onSpotifyWebPlaybackSDKReady()
    }

    // Nettoyage : on déconnecte le player quand le composant est démonté
    return () => {
      playerRef.current?.disconnect()
    }
  }, [])

  // 🎯 BUT : Lance une playlist Spotify sur l'appareil Moodify
  // @param playlistId {string} - ex: "37i9dQZF1EVJHK7Q1TBABQ"
  //
  // 💡 CONCEPT : L'API REST Spotify permet de contrôler la lecture à distance
  //   On envoie un PUT sur /me/player/play en précisant le device_id
  //   pour que Spotify sache sur quel appareil jouer
  async function playPlaylist(playlistId) {
    const token = getToken()
    if (!token || !deviceIdRef.current) return

    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
        }),
      }
    )

    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error?.message ?? 'Erreur lecture Spotify')
    }
  }

  return { isReady, error, needsReauth, playPlaylist, player: playerRef.current }
}
