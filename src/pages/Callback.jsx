import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback } from '../services/spotify'

function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      navigate('/result')
      return
    }
    handleCallback(code)
      .then(() => navigate('/result'))
      .catch(() => navigate('/result'))
  }, [navigate])

  return <p style={{ padding: '2rem' }}>Connexion Spotify en cours...</p>
}

export default Callback
