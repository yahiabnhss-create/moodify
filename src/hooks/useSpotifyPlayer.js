// Re-export du hook depuis le context global.
// Le player Spotify vit au niveau App (dans SpotifyPlayerContext) pour persister entre les pages.
// Ce fichier permet d'importer useSpotifyPlayer depuis le dossier hooks/ au lieu du dossier context/.
export { useSpotifyPlayer } from '../context/SpotifyPlayerContext'
