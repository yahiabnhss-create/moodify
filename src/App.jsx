import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Header from './components/Layout/Header'
import Home from './pages/Home'
import Result from './pages/Result'
import Favorites from './pages/Favorites'
import Callback from './pages/Callback'

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/result" element={<Result />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
      <footer className="footer">made by Y9</footer>
    </BrowserRouter>
  )
}

export default App