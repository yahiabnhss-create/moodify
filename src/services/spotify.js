const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? `${window.location.origin}/callback`

function generateCodeVerifier(length = 128) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function loginWithSpotify() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_code_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    // 🎯 BUT : Ces scopes donnent à l'app le droit de lire et contrôler la lecture Spotify
    // ⚠️ ATTENTION : sans "streaming", le Web Playback SDK refusera de s'initialiser
    scope: [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
    ].join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function handleCallback(code) {
  const verifier = sessionStorage.getItem('spotify_code_verifier')
  if (!verifier) throw new Error('Missing code verifier')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  if (!res.ok) throw new Error('Token exchange failed')
  const data = await res.json()

  sessionStorage.removeItem('spotify_code_verifier')
  localStorage.setItem('spotify_access_token', data.access_token)
  localStorage.setItem('spotify_token_expiry', Date.now() + data.expires_in * 1000)
}

export function getToken() {
  const token = localStorage.getItem('spotify_access_token')
  const expiry = localStorage.getItem('spotify_token_expiry')
  if (!token || !expiry || Date.now() > Number(expiry)) return null
  return token
}

export function logout() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_token_expiry')
}

export async function getPlaylistTracks(emotion) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${emotion.playlistId}/tracks?limit=20&market=from_token`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (res.status === 401) {
    logout()
    throw new Error('Session expirée, reconnecte-toi.')
  }
  if (!res.ok) throw new Error('Erreur Spotify API')

  const data = await res.json()
  return data.items
    .filter((item) => item.track && item.track.id)
    .map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists[0]?.name ?? '',
      image: item.track.album.images[0]?.url ?? '',
      url: item.track.external_urls?.spotify ?? '',
    }))
}
