// Page de callback OAuth Spotify.
//
// Spotify redirige ici après que l'utilisateur a accepté (ou refusé) la connexion.
// URL reçue : /callback?code=XXXXX  (succès)
//         ou : /callback?error=access_denied  (refus)
//
// Cas d'usage :
//   1. Succès : on échange le code contre un token via handleCallback(),
//      on émet l'event 'spotify:connected' pour que SpotifyPlayerContext s'initialise,
//      puis on redirige vers /result
//   2. Erreur : on affiche le message d'erreur avec un bouton Retour
//
// Protection anti double-appel :
//   React 18 en StrictMode monte les composants deux fois en dev.
//   callbackRequests (Map<code, Promise>) mémorise la promesse en cours pour éviter
//   d'appeler handleCallback() deux fois avec le même code (le code Spotify est usage unique).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback } from '../services/spotify'

// Map globale (hors composant) pour éviter les doubles appels entre les deux montages React StrictMode
const callbackRequests = new Map()

function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  // Lit les paramètres depuis l'URL (on utilise window.location et non useSearchParams
  // pour éviter un re-render au montage)
  const search       = window.location.search
  const spotifyError = new URLSearchParams(search).get('error') // ex: 'access_denied'

  useEffect(() => {
    // Si Spotify a renvoyé une erreur explicite (ex: utilisateur a cliqué "Refuser")
    if (spotifyError) return

    const code = new URLSearchParams(search).get('code')
    if (!code) {
      // Pas de code = URL invalide → on redirige directement vers /result
      navigate('/result')
      return
    }

    let cancelled = false

    // Réutilise la promesse existante si elle est déjà en cours (protection double-appel)
    let request = callbackRequests.get(code)
    if (!request) {
      request = handleCallback(code).finally(() => {
        callbackRequests.delete(code) // nettoyage une fois terminé
      })
      callbackRequests.set(code, request)
    }

    request
      .then(() => {
        if (!cancelled) {
          // Notifie SpotifyPlayerContext qu'un token est disponible → initialise le player
          window.dispatchEvent(new CustomEvent('spotify:connected'))
          navigate('/result')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    // Si le composant est démonté (StrictMode / navigation rapide), on ignore les résultats en retard
    return () => { cancelled = true }
  }, [navigate, search, spotifyError])

  // ── Affichage erreur ──
  if (spotifyError || error) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#e05', marginBottom: '1rem' }}>
          Erreur de connexion : {spotifyError
            ? `Spotify a refusé la connexion : ${spotifyError}`
            : error}
        </p>
        <button onClick={() => navigate('/result')}>Retour</button>
      </main>
    )
  }

  // ── Affichage pendant l'échange de token ──
  return <p style={{ padding: '2rem', textAlign: 'center' }}>Connexion Spotify en cours...</p>
}

export default Callback
