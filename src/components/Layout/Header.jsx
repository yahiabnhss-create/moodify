// Barre de navigation principale — affichée en haut de toutes les pages.
// NavLink de react-router-dom applique automatiquement la classe 'active'
// sur le lien de la page courante (utilisé en CSS pour le soulignement actif).

import { NavLink } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      {/* Logo cliquable (sans lien — juste décoratif ici) */}
      <span className="header-logo">Moodify</span>

      {/* Navigation principale */}
      <nav className="header-nav">
        <NavLink to="/">Accueil</NavLink>
        <NavLink to="/result">Détecter</NavLink>
        <NavLink to="/favorites">Favoris</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </nav>
    </header>
  )
}

export default Header
