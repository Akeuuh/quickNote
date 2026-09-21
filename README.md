# QuickNote

Une Note unique et permanente, un canvas Excalidraw infini, affichée ou masquée par un Raccourci clavier global depuis n'importe quelle application. Vocabulaire du projet dans [CONTEXT.md](CONTEXT.md), décisions dans [docs/adr](docs/adr).

## Stack

- Tauri 2 (Rust) — macOS uniquement
- React 19 + TypeScript + Vite
- `@excalidraw/excalidraw`
- Vitest (front), `cargo test` (Rust)

## Prérequis

- Node 24 + pnpm (`corepack enable`)
- Rust stable (`rustup`)
- Xcode Command Line Tools

## Commandes

```sh
pnpm install          # dépendances front
pnpm tauri dev        # app en dev avec rechargement à chaud
pnpm tauri build      # .app et .dmg dans src-tauri/target/release/bundle
pnpm test             # tests Vitest
pnpm typecheck        # tsc --noEmit
cd src-tauri && cargo test
```

Les polices Excalidraw sont copiées depuis `node_modules` dans `dist/fonts` au build (`vite-plugin-static-copy`) pour fonctionner hors ligne.

`pnpm tauri build` signe aussi l'artefact updater et exige la clé privée (voir « Release ») : en local, exporter `TAURI_SIGNING_PRIVATE_KEY_PATH=~/.tauri/quicknote.key` et `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (vide si la clé n'en a pas). Sans clé, le `.app` est produit mais la commande termine en erreur.

## Release

Pousser un tag `v*` déclenche `.github/workflows/release.yml` : build universel (Apple Silicon + Intel), signature Developer ID, notarisation, publication d'une GitHub Release avec `QuickNote.app.tar.gz`, `.dmg` et `latest.json` (métadonnées de l'updater). Le workflow échoue dès la première étape si un secret manque.

### Version

Un seul endroit : `"version"` dans `package.json` (`src-tauri/tauri.conf.json` pointe dessus). Procédure :

```sh
pnpm version 0.2.0 --no-git-tag-version
git commit -am "chore: release v0.2.0"
git tag v0.2.0
git push && git push --tags
```

### Secrets GitHub Actions

À créer dans Settings › Secrets and variables › Actions. Aucun n'est commité.

| Secret | Contenu | Comment l'obtenir |
|---|---|---|
| `APPLE_CERTIFICATE` | Certificat **Developer ID Application** au format `.p12`, encodé base64 | Xcode › Settings › Accounts › Manage Certificates › + › Developer ID Application, puis Trousseau : exporter le certificat (avec sa clé privée) en `.p12`, puis `base64 -i cert.p12 \| pbcopy` |
| `APPLE_CERTIFICATE_PASSWORD` | Mot de passe choisi à l'export du `.p12` | idem |
| `APPLE_SIGNING_IDENTITY` | Nom complet de l'identité, ex. `Developer ID Application: Prénom Nom (TEAMID)` | `security find-identity -v -p codesigning` |
| `APPLE_ID` | Identifiant Apple du compte développeur | — |
| `APPLE_PASSWORD` | Mot de passe **d'application** (pas le mot de passe du compte) | appleid.apple.com › Connexion et sécurité › Mots de passe pour app |
| `APPLE_TEAM_ID` | Identifiant d'équipe (10 caractères) | developer.apple.com › Membership |
| `TAURI_SIGNING_PRIVATE_KEY` | Contenu du fichier de clé privée updater | voir ci-dessous |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mot de passe de cette clé (chaîne vide si aucun) | voir ci-dessous |

### Clé updater

Les artefacts updater sont signés (minisign) ; l'app n'installe une mise à jour que si la signature correspond à `plugins.updater.pubkey` dans `src-tauri/tauri.conf.json`. Générer la paire une seule fois, **hors du dépôt** :

```sh
pnpm tauri signer generate -w ~/.tauri/quicknote.key
```

Coller le contenu de `~/.tauri/quicknote.key.pub` dans `plugins.updater.pubkey`, et celui de `~/.tauri/quicknote.key` dans le secret `TAURI_SIGNING_PRIVATE_KEY`. Perdre la clé privée = impossible de publier une mise à jour installable par les versions déjà distribuées.

### Vérifier une Release

```sh
spctl --assess --type execute -vv QuickNote.app   # accepted, source=Notarized Developer ID
xcrun stapler validate QuickNote.app
```

## QA manuelle

Checklist à dérouler avant une release. Chaque ticket ajoute ses cas.

### Overlay (#3)

- [x] ⌥⌘N depuis une autre app affiche la Note avec le focus clavier ; ⌥⌘N à nouveau la masque et rend le focus à l'app précédente
- [x] Un clic hors de la Note la masque
- [ ] « Exporter en image » ouvre le panneau d'enregistrement sans masquer la Note
- [ ] Depuis une app en plein écran : la Note apparaît par-dessus sans changer de Space
- [ ] Changer de Space puis ⌥⌘N : la Note apparaît sur le Space courant
- [ ] Dessiner, masquer, afficher : le contenu est intact
- [ ] Fenêtre sans barre de titre, coins arrondis, ombre ; la bande du haut déplace la fenêtre ; les bords redimensionnent
- [x] Icône barre de menus avec « Afficher la Note » et « Quitter » ; aucune icône Dock, absente de Cmd+Tab
- [ ] En dev : `[note] shown` / `[note] hidden` dans la console web à chaque bascule

### Persistance (#4)

Fichier de Note par défaut : `~/Library/Application Support/com.aleclercq.quicknote/note.excalidraw`.

- [x] Dessiner, quitter, relancer : le contenu est restauré
- [ ] Coller une image, quitter, relancer : l'image est restaurée
- [ ] Le fichier s'ouvre sur excalidraw.com
- [x] Une rafale de modifications produit une seule écriture après ~500 ms d'inactivité (tests Vitest)
- [x] Masquer la Note écrit immédiatement les modifications en attente (tests Vitest)
- [x] Modifier le fichier à la main pendant que la Note est masquée, puis l'afficher : le nouveau contenu apparaît
- [x] Même scénario avec des modifications locales non écrites : le local est conservé (tests Vitest)
- [x] Fichier absent au premier lancement : Note vide, fichier créé à la première écriture
- [ ] Fichier corrompu : bandeau d'erreur dans la Note, app toujours utilisable, fichier non écrasé

### Géométrie (#5)

Préférences : `~/Library/Application Support/com.aleclercq.quicknote/preferences.json`.

- [x] Déplacer/redimensionner la Note, masquer, afficher : même géométrie
- [x] Idem après quitter/relancer
- [x] Géométrie mémorisée hors de tout écran : la Note réapparaît centrée sur l'écran du curseur, même taille
- [ ] Écran externe débranché avec la Note mémorisée dessus : même comportement
- [x] Premier lancement : 80 % de l'écran du curseur, centré

### Vue et Échap (#6)

- [x] Zoomer et scroller, masquer, afficher : même Vue
- [x] Idem après quitter/relancer
- [x] Le Fichier de Note ne contient pas la Vue (`preferences.json` la porte)
- [ ] Échap pendant l'édition d'un texte sort de l'édition sans masquer
- [ ] Échap avec une sélection désélectionne sans masquer (désélection faite par QuickNote : Excalidraw 0.18 ne désélectionne pas sur Échap)
- [x] Échap avec un outil actif revient à la sélection sans masquer
- [x] Échap sans rien à annuler masque la Note

### Préférences (#7)

- [ ] Menu barre de menus : « Préférences… » ouvre la fenêtre
- [ ] Capturer un nouveau Raccourci : effectif immédiatement, persistant après redémarrage
- [ ] Capturer un Raccourci déjà pris par une autre app (Carbon) : erreur affichée, ancien Raccourci toujours fonctionnel. Les raccourcis système (⌘Space) ne remontent pas d'erreur : ils prennent simplement le dessus
- [ ] « Créer un nouveau fichier… » vers un dossier iCloud : la Note bascule dessus sans redémarrage ; dessiner y écrit
- [ ] « Ouvrir un fichier existant… » sur un `.excalidraw` : son contenu est chargé
- [ ] Modifications en attente avant la bascule : écrites dans l'ancien fichier (tests Vitest)
- [ ] Lancement au login : activé au premier lancement, désactivable, visible dans Réglages Système › Général › Ouverture

### Release (#8)

- [ ] `git tag v0.1.0 && git push --tags` déclenche le workflow et publie une Release
- [ ] La Release contient `QuickNote.app.tar.gz` + `.sig`, le `.dmg` et `latest.json`
- [ ] `spctl --assess` accepte l'app ; elle s'ouvre sans avertissement Gatekeeper sur un Mac vierge
- [ ] Supprimer un secret et relancer : le workflow échoue à la première étape en nommant le secret

### Updater (#9)

L'app interroge `latest.json` de la dernière Release au lancement puis toutes les 24 h. Pour tester en local : publier une Release de version supérieure, ou servir un `latest.json` de test et pointer `plugins.updater.endpoints` dessus dans une build locale.

- [ ] Version locale inférieure à la dernière Release : « Mise à jour disponible (vX.Y.Z) » apparaît dans le menu tray après le lancement
- [ ] Sans mise à jour : aucune entrée
- [ ] Cliquer l'entrée télécharge, installe, relance ; la nouvelle version tourne
- [ ] Contenu de la Note et Vue intacts après relancement
- [x] Échec réseau (aucune Release publiée) : aucune erreur visible, app utilisable, log `updater: check failed`
