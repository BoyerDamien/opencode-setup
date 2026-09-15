# Garde-fous de condensation

Contraintes dures — s'appliquent quel que soit le mode (interactif/automatique). Priment sur les patterns stylistiques de `patterns.md` en cas de conflit. Référencé par `SKILL.md` — à lire avant de commencer toute condensation.

## Anti-sur-condensation

**Le risque principal n'est pas l'excès de texte, c'est la sur-condensation.** La brièveté est une conséquence d'une bonne condensation, pas son objectif (Carroll, « Ten Misconceptions about Minimalism » — source académique la plus citée du domaine). Couper « au couteau » tout ce qui n'est pas essentiel au sens strict crée du risque, pas de la clarté.

- **Don't** : condenser en supprimant tout ce qui n'est pas « essentiel » au sens strict.
- **Do** : préférer supprimer la *verbosité* (mots vides, nominalisations, redondances) plutôt que le *contenu* (contexte, conditions, distinctions). Garder assez d'information pour que le lecteur puisse inférer sans ambiguïté.

## Éviter le style télégraphique

- **Don't** : couper les articles et « that » pour gagner en brièveté (« Ensure file exists before running »).
- **Do** : garder les articles et « that » — un texte grammaticalement complet reste plus clair qu'un texte télégraphique, même condensé (ASD-STE100 : « Make sure that the file exists before you run the command »).

## Contrainte d'accessibilité des chemins

Toute référence à un chemin de fichier/dossier gardée dans le résultat condensé final doit être vérifiée sur 3 critères avant d'être conservée :
1. Existe sur disque
2. Est committée en git (pas seulement stagée/untracked)
3. Est pushée sur la branche/remote partagée (visible pour un lecteur qui n'a pas l'état local de l'auteur)

Si une des trois conditions manque → supprime la référence ou généralise, **même si le chemin est le sujet principal de la phrase**. Vérifie avec `git show @{u}:<chemin>` (échoue si absent de l'état remote/upstream), ou équivalent (`git ls-files`, `git status`, vérification contre la branche amont).

Cette contrainte ne couvre pas les permissions d'accès sur les plateformes externes (Notion, Linear, Slack, GitHub) — seulement les chemins de fichiers dans le dépôt git.
