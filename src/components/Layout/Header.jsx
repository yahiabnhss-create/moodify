import { NavLink } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <span className="header-logo">Moodify</span>
      <nav className="header-nav">
        <NavLink to="/">Accueil</NavLink>
        <NavLink to="/result">Détecter</NavLink>
        <NavLink to="/favorites">Favoris</NavLink>
      </nav>
    </header>
  )
}

export default Header
