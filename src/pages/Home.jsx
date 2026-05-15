// Page d'accueil — simple landing page avec vidéo de fond et bouton vers /result.
// La vidéo est hébergée sur Cloudinary (CDN) pour de meilleures performances de chargement.

import { useNavigate } from 'react-router-dom'

const BG_VIDEO = 'https://res.cloudinary.com/detzrcs5y/video/upload/q_auto/v1778596857/142032-779071806_ttlbf7.mp4'

function Home() {
  const navigate = useNavigate()

  return (
    <main className="home-page">
      {/* Vidéo en fond : autoPlay (lecture immédiate), muted (requis par les navigateurs pour autoPlay),
          loop (boucle infinie), playsInline (empêche le plein écran automatique sur iOS) */}
      <video className="home-bg-video" src={BG_VIDEO} autoPlay muted loop playsInline />

      {/* Overlay semi-transparent pour améliorer la lisibilité du texte sur la vidéo */}
      <div className="home-bg-overlay" />

      <div className="home-content">
        <h2>Comment tu te sens aujourd'hui ?</h2>
        <p>Laisse ta caméra détecter ton humeur et on te propose une playlist adaptée.</p>
        {/* Navigue vers /result où se trouvent la caméra et la détection */}
        <button onClick={() => navigate('/result')}>
          Détecter mon humeur
        </button>
      </div>
    </main>
  )
}

export default Home
