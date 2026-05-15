import { Smile, Zap, CloudRain, Flame, Minus } from 'lucide-react'

export const EMOTIONS = {
  happy: {
    label: 'Heureux',
    genre: 'pop / feel-good',
    playlistId: '37i9dQZF1DX3rxVfibe1L0',
    icon: Smile,
    color: '#4ade80',
  },
  surprised: {
    label: 'Surpris',
    genre: 'dance / électro',
    playlistId: '37i9dQZF1DX0BcQWzuB7ZO',
    icon: Zap,
    color: '#fbbf24',
  },
  sad: {
    label: 'Triste',
    genre: 'piano / mélancolique',
    playlistId: '37i9dQZF1DX4sWSpwq3LiO',
    icon: CloudRain,
    color: '#60a5fa',
  },
  angry: {
    label: 'En colère',
    genre: 'workout / intense',
    playlistId: '37i9dQZF1DX76Wlfdnj7AP',
    icon: Flame,
    color: '#f87171',
  },
  neutral: {
    label: 'Neutre',
    genre: 'lofi / chill',
    playlistId: '37i9dQZF1DX4WYpdgoIcn6',
    icon: Minus,
    color: '#818cf8',
  },
}
