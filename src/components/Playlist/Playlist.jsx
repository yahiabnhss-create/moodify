import PlaylistCard from './PlaylistCard'
import './Playlist.css'

// 🎯 BUT : Affiche une liste de morceaux
// @param tracks      {array}    - liste des pistes
// @param onFavorite  {function} - callback favori transmis à chaque carte (optionnel)
// @param isFavorite  {function} - (trackId) => boolean, pour l'état du cœur (optionnel)
function Playlist({ tracks, onFavorite, isFavorite }) {
  return (
    <div className="playlist">
      {tracks.map(track => (
        <PlaylistCard
          key={track.id}
          track={track}
          onFavorite={onFavorite}
          isFav={isFavorite?.(track.id)}
        />
      ))}
    </div>
  )
}

export default Playlist
