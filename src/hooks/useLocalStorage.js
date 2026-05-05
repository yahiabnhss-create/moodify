import { useEffect, useRef, useState } from 'react'

const LOCAL_STORAGE_EVENT = 'moodify:local-storage'

function readStoredValue(key, initialValue) {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? JSON.parse(item) : initialValue
  } catch {
    return initialValue
  }
}

export function useLocalStorage(key, initialValue) {
  const initialValueRef = useRef(initialValue)
  const [value, setValue] = useState(() => readStoredValue(key, initialValue))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, {
        detail: { key, value },
      }))
    } catch {
      // localStorage can be unavailable in private mode or when quota is exceeded.
    }
  }, [key, value])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== key) return

      try {
        setValue(event.newValue !== null ? JSON.parse(event.newValue) : initialValueRef.current)
      } catch {
        setValue(initialValueRef.current)
      }
    }

    function handleLocalStorage(event) {
      if (event.detail?.key === key) {
        setValue(event.detail.value)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(LOCAL_STORAGE_EVENT, handleLocalStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(LOCAL_STORAGE_EVENT, handleLocalStorage)
    }
  }, [key])

  return [value, setValue]
}
