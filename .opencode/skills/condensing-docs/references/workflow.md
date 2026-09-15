# Workflow de condensation

Procédure complète, commune aux deux types de contenu (voir `SKILL.md` > "Type de contenu"). Référencé par `SKILL.md` — à charger avant de commencer toute condensation.

## Découpage en sections

Découpe selon les headings markdown (`#`, `##`, `###`). Section trop longue → re-découpe en paragraphes. Aucun heading → blocs de ~3-5 paragraphes.

## Étapes

0. **Détermine le type de contenu puis choisis le mode** : classe le contenu récupéré selon la règle de `SKILL.md` > "Type de contenu". Pour "doc long structuré", demande "Mode interactif (validation section par section) ou automatique (application directe, résumé à la fin) ?" avant de commencer. Pour "court/faible impact", le mode automatique est utilisé directement, sans poser la question — aller directement à la boucle "Mode automatique" de l'étape 2.
1. Découpe le doc en sections (voir ci-dessus), puis crée une todo list (une entrée par section) via `todowrite` pour suivre la progression.
2. Pour chaque section, dans l'ordre, marque-la `in_progress` puis :

**Mode interactif :**
   a. Affiche l'original et une proposition condensée — ou signale que la section est déjà concise et propose de passer.
   b. Attend la validation (valider / modifier / passer).
   c. Si validé : applique **immédiatement** l'édition — jamais après plusieurs sections regroupées ni en fin de parcours — puis `grep` les sections restantes pour tout terme significatif retiré. Si trouvé, signale-le avec un correctif proposé avant de continuer.
   d. Vérifie l'accessibilité des chemins référencés dans le texte condensé (voir `guardrails.md`). Si un chemin ne passe pas, le supprime ou le généralise avant de continuer.
   e. Marque la section `completed`, demande si on continue avec la section suivante.

**Mode automatique :**
   a. Applique directement la condensation proposée, sans affichage ni attente de validation.
   b. `grep` les sections restantes pour tout terme significatif retiré ; si trouvé, applique automatiquement le correctif, sans s'arrêter.
   c. Vérifie l'accessibilité des chemins référencés dans le texte condensé (voir `guardrails.md`). Si un chemin ne passe pas, le supprime ou le généralise automatiquement, sans s'arrêter.
   d. Marque la section `completed`, passe à la suivante.

3. Fin de parcours :
   - **Interactif** : pas de résumé automatique, sauf demande explicite.
   - **Automatique** : résumé systématique (sections modifiées, correctifs de cohérence appliqués).
