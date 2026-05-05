import PlaylistCard from './PlaylistCard'
import './Playlist.css'

function Playlist({ tracks }) {
  return (
    <div className="playlist">
      {tracks.map(track => (
        <PlaylistCard key={track.id} track={track} />
      ))}
    </div>
  )
}

export default Playlist
