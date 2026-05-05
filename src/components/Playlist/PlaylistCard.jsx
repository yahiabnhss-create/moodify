import './Playlist.css'

function PlaylistCard({ track }) {
  return (
    <div className="playlist-card">
      <img src={track.image} alt={track.name} className="playlist-card-img" />
      <div className="playlist-card-info">
        <span className="playlist-card-name">{track.name}</span>
        <span className="playlist-card-artist">{track.artist}</span>
      </div>
      <a
        href={track.url}
        target="_blank"
        rel="noreferrer"
        className="playlist-card-link"
      >
        Écouter
      </a>
    </div>
  )
}

export default PlaylistCard
