import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Header from './components/Layout/Header'

const Home = lazy(() => import('./pages/Home'))
const Result = lazy(() => import('./pages/Result'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Callback = lazy(() => import('./pages/Callback'))

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Suspense fallback={<main className="route-loading">Chargement...</main>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/result" element={<Result />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </Suspense>
      <footer className="footer">made by Y9</footer>
    </BrowserRouter>
  )
}

export default App
