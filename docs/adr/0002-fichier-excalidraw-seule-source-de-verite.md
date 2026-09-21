# Le Fichier de Note `.excalidraw` est la seule source de vérité

La Note est persistée dans un unique fichier au format JSON Excalidraw standard, à un emplacement choisi par l'utilisateur. Pas de base locale, pas d'historique, pas de snapshot : le fichier est ouvrable sur excalidraw.com et se synchronise ou se versionne via le dossier où l'utilisateur le place (iCloud, Dropbox, git). Les images collées sont embarquées dans le fichier pour qu'il reste portable en une seule pièce.

## Considered Options

- SQLite avec versions : undo entre sessions, mais format opaque et non portable.
- Images dans un dossier voisin : JSON léger, mais deux choses à synchroniser.

## Consequences

- Conflits : à l'affichage, le fichier est rechargé s'il a changé sur disque et qu'aucune modification locale n'est en attente ; sinon le local gagne. Aucun merge, aucun dialogue. Une édition simultanée sur deux machines perd silencieusement un côté.
- La Vue (zoom, scroll) et la position de fenêtre vivent dans les préférences de l'app, jamais dans le fichier, pour ne pas le polluer.
- La protection contre la perte est déléguée au dossier de l'utilisateur ; l'app n'en fournit aucune.
