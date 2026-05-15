// Composant conteneur de la liste de pistes.
// Simple boucle sur un tableau de tracks → délègue l'affichage de chaque piste à PlaylistCard.
//
// Props :
//   tracks     : tableau de { id, name, artist, image, url }
//   onFavorite : callback appelé avec la piste quand l'utilisateur clique sur le cœur
//   isFavorite : fonction(trackId) → boolean pour afficher le cœur plein ou vide

import PlaylistCard from './PlaylistCard'
import './Playlist.css'

function Playlist({ tracks, onFavorite, isFavorite }) {
  return (
    <div className="playlist">
      {tracks.map(track => (
        <PlaylistCard
          key={track.id}
          track={track}
          onFavorite={onFavorite}
          isFav={isFavorite?.(track.id)} // appel optionnel au cas où isFavorite n'est pas fourni
        />
      ))}
    </div>
  )
}

export default Playlist
