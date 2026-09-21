# Tauri plutôt que Swift natif

L'auteur a l'habitude des apps macOS natives en Swift (voir notchVibe), mais la Note est un canvas Excalidraw, qui est une bibliothèque React sans équivalent natif. Plutôt que d'embarquer une WKWebView dans une app Swift et de faire dialoguer deux mondes, on écrit toute l'app en Tauri 2 (Rust + webview) : l'UI est entièrement web, les besoins natifs (raccourci global, tray, autostart, fenêtre sur tous les Spaces) sont couverts par des plugins ou quelques lignes de Rust. Electron a été écarté pour son poids ; Swift natif pour le coût du pont WebView ↔ Swift sur chaque interaction.

## Consequences

- Cross-platform possible plus tard, mais non visé en v1 (macOS seulement).
- Le comportement « visible par-dessus les apps plein écran » exige un réglage `NSWindow.collectionBehavior` côté Rust, hors de la config Tauri standard.
