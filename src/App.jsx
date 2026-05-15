// Point d'entrée principal de l'application.
// Structure : BrowserRouter > SpotifyPlayerProvider > AppShell
// Le SpotifyPlayerProvider doit envelopper AppShell pour que useSpotifyPlayer()
// fonctionne à l'intérieur (on ne peut pas lire un context en dehors de son Provider).

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'
import Header from './components/Layout/Header'
import PlayerBar from './components/Player/PlayerBar'
import { SpotifyPlayerProvider, useSpotifyPlayer } from './context/SpotifyPlayerContext'

// Chargement différé (lazy) = les pages ne sont téléchargées que quand l'utilisateur les visite.
// Ça réduit le bundle initial et accélère le premier affichage.
const Home      = lazy(() => import('./pages/Home'))
const Result    = lazy(() => import('./pages/Result'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Callback  = lazy(() => import('./pages/Callback'))

// AppShell est un composant interne séparé pour pouvoir appeler useSpotifyPlayer()
// (un hook de context ne peut pas être appelé dans le même composant que son Provider).
function AppShell() {
  // Récupère l'état et les contrôles du player depuis le context global
  const { playerState, togglePlay, nextTrack, prevTrack, seekTo, currentEmotion } = useSpotifyPlayer()

  // Sert à appliquer une classe CSS spéciale sur la page d'accueil (ex: cacher la navbar)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className={isHome ? 'is-home' : undefined}>
      {/* En-tête avec navigation — visible sur toutes les pages */}
      <Header />

      {/* Suspense affiche "Chargement..." pendant que le code de la page se télécharge */}
      <Suspense fallback={<main className="route-loading">Chargement...</main>}>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/result"    element={<Result />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* /callback reçoit le code OAuth après que Spotify redirige l'utilisateur */}
          <Route path="/callback"  element={<Callback />} />
        </Routes>
      </Suspense>

      {/* PlayerBar vit ici (hors des Routes) pour persister entre toutes les navigations.
          Si elle était dans Result.jsx, elle disparaîtrait en changeant de page. */}
      <PlayerBar
        playerState={playerState}
        onToggle={togglePlay}
        onNext={nextTrack}
        onPrev={prevTrack}
        onSeek={seekTo}
        currentEmotion={currentEmotion}
      />

      <footer className="footer"><span>made by Y9</span></footer>
    </div>
  )
}

// Composant racine exporté : configure le router et le provider global du player
function App() {
  return (
    <BrowserRouter>
      {/* SpotifyPlayerProvider initialise le Spotify Web Playback SDK une seule fois
          et partage son état (piste en cours, pause/play…) avec tous les enfants */}
      <SpotifyPlayerProvider>
        <AppShell />
      </SpotifyPlayerProvider>
    </BrowserRouter>
  )
}

export default App
