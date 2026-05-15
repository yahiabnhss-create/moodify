// Table de correspondance entre les émotions détectées et les données musicales.
// Chaque clé correspond exactement aux valeurs retournées par normalizeEmotion().
// playlistId = ID de la playlist Spotify publique choisie pour cette humeur.
// icon = composant Lucide React (SVG inline, pas d'image externe).
// color = couleur hexadécimale utilisée partout dans l'UI (graphique, tags, barres…).

import { Smile, Zap, CloudRain, Flame, Minus } from 'lucide-react'

export const EMOTIONS = {
  happy: {
    label: 'Heureux',
    genre: 'pop / feel-good',
    playlistId: '37i9dQZF1DX3rxVfibe1L0', // Playlist Spotify "Happy Hits"
    icon: Smile,
    color: '#4ade80',
  },
  surprised: {
    label: 'Surpris',
    genre: 'dance / électro',
    playlistId: '37i9dQZF1DX0BcQWzuB7ZO', // Playlist Spotify "Dance Hits"
    icon: Zap,
    color: '#fbbf24',
  },
  sad: {
    label: 'Triste',
    genre: 'piano / mélancolique',
    playlistId: '37i9dQZF1DX4sWSpwq3LiO', // Playlist Spotify "Life Sucks"
    icon: CloudRain,
    color: '#60a5fa',
  },
  angry: {
    label: 'En colère',
    genre: 'workout / intense',
    playlistId: '37i9dQZF1DX76Wlfdnj7AP', // Playlist Spotify "Beast Mode"
    icon: Flame,
    color: '#f87171',
  },
  neutral: {
    label: 'Neutre',
    genre: 'lofi / chill',
    playlistId: '37i9dQZF1DX4WYpdgoIcn6', // Playlist Spotify "Lofi Beats"
    icon: Minus,
    color: '#818cf8',
  },
}
