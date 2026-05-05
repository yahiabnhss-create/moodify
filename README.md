# Moodify

Moodify est une app React/Vite qui détecte une humeur via la webcam, normalise l'émotion avec `face-api.js`, puis lance une playlist Spotify adaptée.

## Scripts

- `npm run dev` démarre Vite en HTTPS local pour faciliter l'accès webcam.
- `npm run build` génère la version production dans `dist/`.
- `npm run lint` vérifie les règles ESLint et React Hooks.
- `npm run preview` sert le build localement.

## Structure

- `src/components/EmotionDetector/` gère la webcam et la détection d'émotion.
- `src/components/Playlist/` affiche les titres Spotify et l'état favori.
- `src/components/Player/` affiche le player Spotify compact ou plein écran.
- `src/hooks/` contient la persistance locale, les favoris, l'historique, la stabilité d'émotion et le SDK Spotify.
- `src/services/` regroupe `face-api.js` et les appels Spotify.
- `src/pages/` contient les vues accueil, résultat, favoris, dashboard et callback Spotify.
- `public/models/` contient les modèles `face-api.js` utilisés côté navigateur.

## Variables D'environnement

Crée un fichier `.env.local` avec au minimum:

```env
VITE_SPOTIFY_CLIENT_ID=ton_client_id
VITE_SPOTIFY_REDIRECT_URI=https://localhost:5173/callback
```

La webcam fonctionne uniquement dans un contexte sécurisé: `https://`, `localhost`, ou une configuration équivalente acceptée par le navigateur.
