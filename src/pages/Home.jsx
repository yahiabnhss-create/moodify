import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <main>
      <h2>Comment tu te sens aujourd'hui ?</h2>
      <p>Laisse ta caméra détecter ton humeur et on te propose une playlist adaptée.</p>
      <button onClick={() => navigate('/result')}>
        Détecter mon humeur
      </button>
    </main>
  )
}

export default Home
