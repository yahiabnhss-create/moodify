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
          isFav={isFavorite?.(track.id)}
        />
      ))}
    </div>
  )
}

export default Playlist
