# QuickNote

Une note unique et permanente, affichée/masquée par un raccourci clavier global, servant de brouillon toujours disponible pour du texte et des schémas.

## Language

**Note**:
Le canvas Excalidraw infini unique de l'application. Il n'en existe qu'un, il persiste entre les sessions. Le texte s'y écrit via les éléments texte du canvas.
_Avoid_: Document, page, dessin, scratchpad

**Fichier de Note**:
Le fichier `.excalidraw` qui est la seule source de vérité du contenu de la Note. Son emplacement est choisi par l'utilisateur.
_Avoid_: Base, sauvegarde, export

**Vue**:
La caméra sur la Note (zoom et position de défilement). Elle appartient à l'application, pas au Fichier de Note.
_Avoid_: Viewport, scroll, caméra

**Raccourci**:
La combinaison de touches globale qui affiche ou masque la Note depuis n'importe quelle application.
_Avoid_: Hotkey, touche

**Afficher / Masquer**:
Les deux seuls états de la Note. Masquer ne ferme rien et ne perd rien ; Afficher ramène la Note exactement où elle était.
_Avoid_: Ouvrir, fermer, quitter

**Bridge**:
L'unique interface du front vers Tauri : lire et écrire le Fichier de Note, obtenir son mtime, s'abonner à Afficher / Masquer. Toute la logique front est testée contre un Bridge fake en mémoire.
_Avoid_: API, IPC, invoke (dans la logique métier)
