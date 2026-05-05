const MAPPING = {
  happy: 'happy',
  sad: 'sad',
  neutral: 'neutral',
  angry: 'angry',
  surprised: 'surprised',
  fearful: 'neutral',
  disgusted: 'angry',
}

export function normalizeEmotion(faceApiEmotion) {
  return MAPPING[faceApiEmotion] ?? 'neutral'
}
