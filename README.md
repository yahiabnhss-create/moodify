moodify/

├── index.html                   # Point d'entrée HTML (Vite)
├── vite.config.js               # Config Vite (bundler)
├── eslint.config.js             # Config ESLint (linting)
├── package.json                 # Dépendances & scripts npm
├── public/
│   ├── favicon.svg
│   └── icons.svg                # Icônes SVG globales
└── src/
    ├── main.jsx                 # Montage React (ReactDOM.render)
    ├── App.jsx                  # Composant racine, routing principal
    ├── App.css / index.css      # Styles globaux
    │
    ├── assets/                  # Images statiques (hero, logos)
    │
    ├── components/              # Composants UI réutilisables
    │   ├── Camera/              # Accès webcam, affichage flux vidéo
    │   ├── EmotionDetector/     # Analyse et affichage de l'émotion
    │   ├── Favorites/           # Gestion des playlists favorites
    │   ├── Layout/Header.*      # Header/navigation
    │   └── Playlist/            # Affichage des playlists & cards
    │       ├── Playlist.jsx
    │       └── PlaylistCard.jsx
    │
    ├── context/
    │   └── AppContext.jsx       # État global partagé (Context API)
    │
    ├── hooks/                   # Logique métier encapsulée
    │   ├── useCamera.js         # Gestion de la caméra
    │   ├── useEmotion.js        # Détection d'émotion
    │   └── useFavorites.js      # Persistance des favoris
    │
    ├── services/                # Appels vers APIs externes
    │   ├── faceApi.js           # Intégration face-api.js (ML)
    │   └── spotify.js           # Appels API Spotify
    │
    ├── constants/
    │   └── emotions.js          # Liste des émotions supportées
    │
    └── utils/
        └── emotionMapping.js    # Correspondance émotion → playlist