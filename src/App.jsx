import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'
import Header from './components/Layout/Header'
import PlayerBar from './components/Player/PlayerBar'
import { SpotifyPlayerProvider, useSpotifyPlayer } from './context/SpotifyPlayerContext'

const Home      = lazy(() => import('./pages/Home'))
const Result    = lazy(() => import('./pages/Result'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Callback  = lazy(() => import('./pages/Callback'))

/* Composant interne qui peut lire le context player */
function AppShell() {
  const { playerState, togglePlay, nextTrack, prevTrack, seekTo, currentEmotion } = useSpotifyPlayer()
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className={isHome ? 'is-home' : undefined}>
      <Header />
      <Suspense fallback={<main className="route-loading">Chargement...</main>}>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/result"    element={<Result />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/callback"  element={<Callback />} />
        </Routes>
      </Suspense>
      {/* PlayerBar global — persiste à travers toutes les navigations */}
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

function App() {
  return (
    <BrowserRouter>
      <SpotifyPlayerProvider>
        <AppShell />
      </SpotifyPlayerProvider>
    </BrowserRouter>
  )
}

export default App
