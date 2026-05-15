// Couche API Spotify — gère l'authentification et les appels REST.
//
// Authentification utilisée : OAuth 2.0 PKCE (Proof Key for Code Exchange)
// PKCE est la méthode recommandée pour les apps front-end (pas de secret côté serveur).
// Flux :
//   1. loginWithSpotify() → génère un code_verifier + challenge, redirige vers Spotify
//   2. Spotify redirige vers /callback avec un `code`
//   3. handleCallback(code) → échange le code contre un access_token
//   4. Le token est stocké en localStorage et utilisé pour tous les appels API

const CLIENT_ID    = import.meta.env.VITE_SPOTIFY_CLIENT_ID
// REDIRECT_URI peut être configurée manuellement dans .env.local, sinon on utilise l'URL courante
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? `${window.location.origin}/callback`

// Vérifie que CLIENT_ID est bien défini avant d'appeler Spotify
function assertSpotifyConfig() {
  if (!CLIENT_ID) {
    throw new Error('Configuration Spotify manquante: ajoute VITE_SPOTIFY_CLIENT_ID dans .env.local.')
  }
}

// Génère une chaîne aléatoire cryptographiquement sûre (code_verifier PKCE).
// 128 caractères = longueur maximale recommandée par la spec OAuth 2.0 PKCE.
function generateCodeVerifier(length = 128) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr   = new Uint8Array(length)
  crypto.getRandomValues(arr)        // getRandomValues = CSPRNG du navigateur
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

// Dérive le code_challenge depuis le verifier : SHA-256(verifier) encodé en base64url.
// base64url = base64 sans padding `=` et avec `-` et `_` à la place de `+` et `/`
async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Lit le message d'erreur dans la réponse JSON de l'API Spotify (format variable selon l'endpoint)
async function readSpotifyError(res, fallback) {
  const data = await res.json().catch(() => ({}))
  return data?.error_description ?? data?.error?.message ?? fallback
}

// Démarre le flux OAuth PKCE :
//   - génère et stocke le code_verifier en sessionStorage (doit survivre à la redirection)
//   - redirige l'utilisateur vers la page de login Spotify avec les scopes nécessaires
export async function loginWithSpotify() {
  assertSpotifyConfig()

  const verifier   = generateCodeVerifier()
  const challenge  = await generateCodeChallenge(verifier)

  // sessionStorage survit à la redirection mais pas à la fermeture de l'onglet
  sessionStorage.setItem('spotify_code_verifier', verifier)

  // Scopes demandés :
  //   streaming                      → lire de la musique via le Web Playback SDK
  //   user-read-email/private        → accès au profil (requis par le SDK)
  //   user-read/modify-playback-state → lire et contrôler la lecture en cours
  //   playlist-read-*                → lire les playlists
  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    scope: [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'playlist-read-private',
      'playlist-read-collaborative',
    ].join(' '),
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

// Échange le code OAuth (reçu dans l'URL de callback) contre un access_token.
// Le code_verifier stocké en sessionStorage prouve qu'on est bien l'initiateur du flux.
export async function handleCallback(code) {
  assertSpotifyConfig()

  const verifier = sessionStorage.getItem('spotify_code_verifier')
  if (!verifier) throw new Error('Session Spotify invalide: relance la connexion.')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     CLIENT_ID,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  if (!res.ok) {
    throw new Error(await readSpotifyError(res, 'Connexion Spotify impossible.'))
  }

  const data = await res.json()

  // Le verifier ne sert plus → on le supprime pour éviter une réutilisation accidentelle
  sessionStorage.removeItem('spotify_code_verifier')

  // On stocke le token et sa date d'expiration en localStorage (persiste entre les sessions)
  localStorage.setItem('spotify_access_token', data.access_token)
  localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000))
}

// Retourne le token valide ou null si absent/expiré.
// Si expiré, supprime le token pour forcer une reconnexion.
export function getToken() {
  const token  = localStorage.getItem('spotify_access_token')
  const expiry = localStorage.getItem('spotify_token_expiry')

  if (!token || !expiry) return null

  // Vérifie que le token n'est pas expiré (les tokens Spotify durent 1 heure)
  if (Date.now() > Number(expiry)) {
    logout()
    return null
  }

  return token
}

// Supprime le token du localStorage → déconnecte l'utilisateur
export function logout() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_token_expiry')
}

// Récupère les 20 premières pistes d'une playlist Spotify et les normalise.
// emotion.playlistId vient de constants/emotions.js
// Retourne un tableau d'objets { id, name, artist, image, url }
export async function getPlaylistTracks(emotion) {
  const token = getToken()
  if (!token) throw new Error('Session Spotify expirée, reconnecte-toi.')

  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${emotion.playlistId}/tracks?limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  // 401 = token invalide ou expiré → on force la déconnexion
  if (res.status === 401) {
    logout()
    throw new Error('Session Spotify expirée, reconnecte-toi.')
  }

  // 403 = compte sans accès à cette playlist (ex: région géographique) → liste vide silencieuse
  if (res.status === 403) {
    return []
  }

  if (!res.ok) {
    throw new Error(await readSpotifyError(res, `Erreur Spotify (${res.status})`))
  }

  const data = await res.json()

  // data.items contient des objets { track: {...}, added_at: ... }
  // On filtre les items sans track.id (peut arriver si une piste est indisponible)
  // et on projette vers un format simplifié utilisé partout dans l'app
  return data.items
    .filter((item) => item.track?.id)
    .map((item) => ({
      id:     item.track.id,
      name:   item.track.name,
      artist: item.track.artists[0]?.name ?? '',
      image:  item.track.album?.images[0]?.url ?? '',
      url:    item.track.external_urls?.spotify ?? '',
    }))
}
