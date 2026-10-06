# Analyse génétique — Terminal Sovereign (RP cyberpunk)

Site web statique (HTML/CSS/JS, aucune dépendance, polices et logos inclus) : scanner ADN jouable pour un serveur RP.
À l'ouverture : séquence de démarrage puis **authentification biométrique** (maintenir le clic sur l'empreinte). Ambiance et effets sonores synthétisés en direct (bouton haut-parleur pour couper).
Le **guide** (comment jouer + traductions russes) est intégré : bouton **GUIDE** de l'en-tête, ou lien direct `…/#guide`.
La progression et le résultat sont **sauvegardés automatiquement** dans le navigateur (`localStorage`) : fermer ou recharger la page ne fait rien perdre ; « Nouvelle analyse » repart de zéro.

## Publier sur GitHub Pages

```bash
git init
git add .
git commit -m "Terminal Sovereign ADN"
git branch -M main
git remote add origin https://github.com/VOTRE-PSEUDO/adn-scanner.git
git push -u origin main
```

Puis sur GitHub : **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
Le site est disponible sur `https://VOTRE-PSEUDO.github.io/adn-scanner/`.

## FiveM

1. `fivem-example/html/index.html` pointe déjà vers `https://imraptoryt.github.io/adn-scanner/`.
2. Copiez le dossier `fivem-example` dans `resources/` (nommez-le `adn-scanner`) et ajoutez `ensure adn-scanner` à `server.cfg`.
3. En jeu : `/adn` ouvre le terminal ; `Échap` ou ✕ le ferme. Depuis un autre script : `exports['adn-scanner']:Open()` / `:Close()`.

Messages acceptés par le site : `{ action: 'open', fresh: false }` (mettre `fresh: true` pour forcer une nouvelle analyse), `{ action: 'hide' }`, `{ action: 'reset' }`. À la fermeture, il envoie `{ source: 'adn-scanner', action: 'close' }` au parent.

## Réglages

| Où | Quoi |
|----|------|
| `js/data.js` | `PROFILE_MODE` (`'fixed'` = toujours `FIXED_PROFILE_ID`, par défaut Mila Sorokina · `'random'` = tirage au sort), profils, `DEATH_YEARS_AGO`, messages du séquençage |
| `js/app.js` (haut du fichier) | `TOTAL_PARTICLES`, `REQ_MAG` (×400), `ZOOM_RATE` (vitesse du zoom), `HOLD_TIME` (maintien de l'extracteur), `AUTH_TIME` (maintien de l'empreinte) |
| `js/audio.js` | sons synthétisés (volume `VOL`) |
| `css/style.css` | couleur d'accent `--acc` (#FF8A1F) |

Test local : `python -m http.server 5173` puis http://localhost:5173 (éviter `file://`).

## Structure

`index.html` (terminal + guide) · `js/data.js` · `js/audio.js` · `js/app.js` · `css/style.css` · `assets/` (images, logos Sovereign, polices) · `fivem-example/`
