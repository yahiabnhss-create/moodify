import { EMOTIONS } from '../constants/emotions'
import './EmotionTag.css'

export default function EmotionTag({ emotionKey, size = 13 }) {
  const e = EMOTIONS[emotionKey]
  if (!e) return <span className="emotion-tag">{emotionKey}</span>
  const Icon = e.icon
  return (
    <span className="emotion-tag" style={{ color: e.color }}>
      <Icon size={size} strokeWidth={2.5} />
      {e.label}
    </span>
  )
}
