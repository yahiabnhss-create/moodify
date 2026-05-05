import { useState, useEffect } from 'react'

// 🎯 BUT : Remplace useState par une version qui persiste dans le localStorage
// Quand la valeur change, elle est automatiquement sauvegardée dans le navigateur
//
// 💡 CONCEPT : localStorage vs useState
//   useState  → valeur en mémoire, perdue au rechargement
//   localStorage → valeur sur le disque, persiste entre sessions
//   Ce hook combine les deux : réactivité de React + persistance du navigateur
//
// 💡 JSON.parse / JSON.stringify
//   localStorage ne stocke que des strings. On convertit :
//   - À l'écriture : JSON.stringify([{id:1}]) → '[{"id":1}]'
//   - À la lecture  : JSON.parse('[{"id":1}]') → [{id:1}]
//
// @param key          {string} - clé dans le localStorage ex: "moodify_favorites"
// @param initialValue {any}    - valeur par défaut si la clé n'existe pas encore
// @returns [value, setValue]   - même interface que useState
export function useLocalStorage(key, initialValue) {
  // 💡 useState avec fonction d'initialisation (lazy init)
  //   La fonction n'est appelée qu'une seule fois au premier render
  //   → évite de lire localStorage à chaque re-render
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch {
      // ⚠️ JSON.parse peut planter si la valeur stockée est corrompue
      return initialValue
    }
  })

  // Synchronise le localStorage à chaque changement de valeur
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ⚠️ localStorage peut être plein (quota) ou désactivé (navigation privée)
    }
  }, [key, value])

  return [value, setValue]
}
