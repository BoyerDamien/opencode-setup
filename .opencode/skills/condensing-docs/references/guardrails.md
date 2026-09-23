# Garde-fous de condensation

Contraintes dures — s'appliquent quel que soit le mode (interactif/automatique). Priment sur les patterns stylistiques de `patterns.md` en cas de conflit. Référencé par `SKILL.md` — à lire avant de commencer toute condensation.

## Anti-sur-condensation

**Le risque principal est la sur-condensation.** La brièveté est un résultat, pas un objectif.

- **Don't** : supprimer tout ce qui n’est pas strictement essentiel.
- **Do** : retire la verbosité, pas le contexte, les conditions ni les distinctions. Garde assez d’information pour éviter toute ambiguïté.

## Éviter le style télégraphique

- **Don't** : supprimer les articles ou « that » pour gagner en brièveté.
- **Do** : préserve une grammaire complète ; elle reste plus claire qu’un style télégraphique.

## Contrainte d’accessibilité des chemins

Conserve un chemin uniquement s’il existe, est committé et est poussé sur la branche partagée. Sinon, supprime-le ou généralise-le, même s’il est le sujet de la phrase.

Vérifie avec `git show @{u}:<chemin>` ou un équivalent (`git ls-files`, `git status`, branche amont). Cette contrainte couvre les chemins Git, pas les permissions des plateformes externes.
