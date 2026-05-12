import { useNavigate } from 'react-router-dom'

const BG_VIDEO = 'https://res.cloudinary.com/detzrcs5y/video/upload/q_auto/v1778596857/142032-779071806_ttlbf7.mp4'

function Home() {
  const navigate = useNavigate()

  return (
    <main className="home-page">
      <video className="home-bg-video" src={BG_VIDEO} autoPlay muted loop playsInline />
      <div className="home-bg-overlay" />
      <div className="home-content">
        <h2>Comment tu te sens aujourd'hui ?</h2>
        <p>Laisse ta caméra détecter ton humeur et on te propose une playlist adaptée.</p>
        <button onClick={() => navigate('/result')}>
          Détecter mon humeur
        </button>
      </div>
    </main>
  )
}

export default Home
