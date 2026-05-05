import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback } from '../services/spotify'

function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Spotify renvoie ?error=access_denied si l'utilisateur refuse
    const spotifyError = params.get('error')
    if (spotifyError) {
      setError(`Spotify a refusé la connexion : ${spotifyError}`)
      return
    }

    const code = params.get('code')
    if (!code) {
      navigate('/result')
      return
    }

    handleCallback(code)
      .then(() => navigate('/result'))
      .catch((err) => setError(err.message))
  }, [navigate])

  if (error) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#e05', marginBottom: '1rem' }}>Erreur de connexion : {error}</p>
        <button onClick={() => navigate('/result')}>Retour</button>
      </main>
    )
  }

  return <p style={{ padding: '2rem', textAlign: 'center' }}>Connexion Spotify en cours...</p>
}

export default Callback
