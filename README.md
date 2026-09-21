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
