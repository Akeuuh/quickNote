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
