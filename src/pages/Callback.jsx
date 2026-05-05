import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback } from '../services/spotify'

const callbackRequests = new Map()

function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const search = window.location.search
  const spotifyError = new URLSearchParams(search).get('error')

  useEffect(() => {
    if (spotifyError) {
      return
    }

    const code = new URLSearchParams(search).get('code')
    if (!code) {
      navigate('/result')
      return
    }

    let cancelled = false
    let request = callbackRequests.get(code)

    if (!request) {
      request = handleCallback(code).finally(() => {
        callbackRequests.delete(code)
      })
      callbackRequests.set(code, request)
    }

    request
      .then(() => {
        if (!cancelled) navigate('/result')
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [navigate, search, spotifyError])

  if (spotifyError || error) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#e05', marginBottom: '1rem' }}>
          Erreur de connexion : {spotifyError ? `Spotify a refusé la connexion : ${spotifyError}` : error}
        </p>
        <button onClick={() => navigate('/result')}>Retour</button>
      </main>
    )
  }

  return <p style={{ padding: '2rem', textAlign: 'center' }}>Connexion Spotify en cours...</p>
}

export default Callback
