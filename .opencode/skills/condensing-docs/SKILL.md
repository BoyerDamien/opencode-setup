---
name: condensing-docs
description: Use when condensing, simplifying, or reducing the verbosity of a markdown document — triggers: "condense ce doc", "simplifie ce texte", "relis section par section", "rends ça moins verbeux", "réduis ce document".
---

# condensing-docs

Relit un document markdown section par section et propose une version condensée à l'essentiel, en mode interactif (validation par section) ou automatique (application directe, résumé à la fin).

## Récupération de la source

| Entrée | Action |
|---|---|
| Chemin local | `read` le fichier, édite en place avec `edit` |
| URL distante | fetch le contenu, condensation affichée en chat (pas d'édition en place possible) |
| Texte collé | traité directement, version condensée retournée en chat |

## Règles de condensation

| Don't | Do |
|---|---|
| Référence à un chemin de fichier/dossier précis quand il n'est pas le sujet de la phrase (`src/foo/bar.ts:42`) | Supprime la référence ou généralise |
| Lien intentionnel (`[doc](https://...)`) qui porte l'information | Garde-le — ce n'est pas une référence fragile |
| Phrase longue/complexe, subordonnées imbriquées | Découpe en phrases courtes ou liste à puces |
| Plusieurs formulations de la même idée | Garde la plus courte |
| Détails d'implémentation non essentiels au message | Garde seulement la conclusion/règle/décision |

Seule la prose est condensée. Intouchables : blocs de code, tableaux de référence, frontmatter YAML.

## Découpage en sections

Découpe selon les headings markdown (`#`, `##`, `###`). Section trop longue → re-découpe en paragraphes. Aucun heading → blocs de ~3-5 paragraphes.

## Workflow

0. **Choix du mode** : demande "Mode interactif (validation section par section) ou automatique (application directe, résumé à la fin) ?" avant de commencer.
1. Découpe le doc en sections (voir ci-dessus), puis crée une todo list (une entrée par section) via `todowrite` pour suivre la progression.
2. Pour chaque section, dans l'ordre, marque-la `in_progress` puis :

**Mode interactif :**
   a. Affiche l'original et une proposition condensée — ou signale que la section est déjà concise et propose de passer.
   b. Attend la validation (valider / modifier / passer).
   c. Si validé : applique l'édition, puis `grep` les sections restantes pour tout terme significatif retiré. Si trouvé, signale-le avec un correctif proposé avant de continuer.
   d. Marque la section `completed`, demande si on continue avec la section suivante.

**Mode automatique :**
   a. Applique directement la condensation proposée, sans affichage ni attente de validation.
   b. `grep` les sections restantes pour tout terme significatif retiré ; si trouvé, applique automatiquement le correctif, sans s'arrêter.
   c. Marque la section `completed`, passe à la suivante.

3. Fin de parcours :
   - **Interactif** : pas de résumé automatique, sauf demande explicite.
   - **Automatique** : résumé systématique (sections modifiées, correctifs de cohérence appliqués).

## Ce que le skill ne fait pas (v1)

- Ne réorganise ni ne fusionne les sections.
- Ne détecte pas les ruptures de cohérence vers des sections déjà éditées (seulement vers les sections restantes).
- En mode interactif, ne produit pas de résumé automatique de fin (sauf demande explicite).
