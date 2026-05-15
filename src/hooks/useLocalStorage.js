// useState persisté en localStorage.
// Fonctionne exactement comme useState mais la valeur survit aux rechargements de page.
//
// Cas particuliers gérés :
//   - localStorage indisponible (mode privé, quota dépassé) → silencieux, fonctionne en mémoire
//   - Synchronisation entre onglets : l'event 'storage' du navigateur permet de partager
//     les mises à jour entre plusieurs onglets ouverts sur la même app
//   - Synchronisation dans le même onglet : l'event personnalisé 'moodify:local-storage'
//     permet aux composants de se mettre à jour quand une autre partie du code écrit en localStorage

import { useEffect, useRef, useState } from 'react'

// Nom de l'event personnalisé pour les mises à jour intra-onglet
const LOCAL_STORAGE_EVENT = 'moodify:local-storage'

// Lit et désérialise la valeur stockée en localStorage.
// Retourne initialValue si la clé est absente ou si le JSON est corrompu.
function readStoredValue(key, initialValue) {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? JSON.parse(item) : initialValue
  } catch {
    return initialValue
  }
}

// key          : clé localStorage (ex: 'moodify_favorites')
// initialValue : valeur par défaut si rien n'est stocké
export function useLocalStorage(key, initialValue) {
  // Ref pour garder une référence stable à initialValue (utile dans les event listeners)
  const initialValueRef = useRef(initialValue)

  // Initialise le state depuis localStorage (la fonction lazy évite une lecture à chaque render)
  const [value, setValue] = useState(() => readStoredValue(key, initialValue))

  // Écrit dans localStorage et notifie les autres listeners dans le même onglet à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      // L'event natif 'storage' ne se déclenche PAS dans l'onglet qui écrit → on émet le nôtre
      window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, {
        detail: { key, value },
      }))
    } catch {
      // localStorage peut être bloqué (mode privé Firefox, quota dépassé…) → on continue sans crash
    }
  }, [key, value])

  // S'abonne aux changements venant d'autres onglets ou d'autres parties du code
  useEffect(() => {
    // 'storage' = changement depuis un AUTRE onglet du même domaine
    function handleStorage(event) {
      if (event.key !== key) return
      try {
        setValue(event.newValue !== null
          ? JSON.parse(event.newValue)
          : initialValueRef.current)
      } catch {
        setValue(initialValueRef.current)
      }
    }

    // 'moodify:local-storage' = changement depuis le MÊME onglet (via notre event custom)
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
