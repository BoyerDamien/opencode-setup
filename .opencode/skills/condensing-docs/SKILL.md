---
name: condensing-docs
description: Use when condensing, simplifying, or reducing the verbosity of any written content — markdown docs, comments, PR messages, commit messages, tickets/issues. Triggers on "condense ce doc", "simplifie ce texte", "relis section par section", "rends ça moins verbeux", "réduis ce document", "condense ce commentaire", "simplifie cette PR", "condense ce ticket", "réduis ce message de commit".
---

# condensing-docs

Condense toute production écrite destinée à des humains : documents markdown longs, commentaires, messages de PR, tickets/issues, commit messages. Propose une version condensée à l'essentiel, en mode interactif (validation par section) ou automatique (application directe, résumé à la fin).

## Type de contenu

Le type dépend de la structure et de la longueur du contenu — jamais de la source (fichier, URL, texte collé, commentaire, ticket...).

**Règle de classification :** `doc long structuré` si le contenu a **≥2 headings markdown** (`#`/`##`/`###`) **OU ≥300 mots**. Sinon `court/faible impact`.

| Type | Comportement |
|---|---|
| **Doc long structuré** | Demande le mode (interactif/auto), découpage en sections + todo list, validation ou grep selon le mode choisi |
| **Court / faible impact** | Mode automatique forcé (question du choix de mode sautée), même workflow que les docs longs : découpage en sections + todo list, boucle en mode automatique (grep de cohérence + vérification d'accessibilité des chemins), résumé final systématique |

## Récupération de la source

| Entrée | Action |
|---|---|
| Chemin local | `read` le fichier, édite en place avec `edit` |
| URL distante | fetch le contenu, condensation affichée en chat (pas d'édition en place possible) |
| Texte collé | traité directement, version condensée retournée en chat |
| Commentaire/issue Linear ou Notion existant | Fetch via tool plateforme (ex. `linear_get_issue`, `notion_notion-get-comments`), condensation, **écriture automatique** via le tool d'écriture correspondant (ex. `linear_save_comment`, `linear_save_issue`, `notion_notion-create-comment` avec l'id du commentaire pour update) |
| Commentaire/PR/issue GitHub, message Slack | Fetch via tool de lecture (ex. `mermaid_get_pull_comments`, `mermaid_get_issue_comments`, `slack_read_thread`), condensation **affichée en chat uniquement** — aucun tool d'édition de commentaire/message existant n'est disponible pour ces plateformes, donc pas d'écriture automatique possible |
| Commit message (brouillon avant `git commit`) | Traité comme texte collé, condensation affichée en chat — l'utilisateur committe lui-même |

## Règles de condensation

Charge `references/patterns.md` avant de condenser — liste complète des règles Don't/Do (règles de base + patterns validés par la recherche en rédaction technique).

Charge aussi `references/guardrails.md` — garde-fous obligatoires (anti-sur-condensation, style télégraphique, accessibilité des chemins). Ces contraintes priment sur les patterns stylistiques en cas de conflit.

Seule la prose est condensée. Intouchables : blocs de code, tableaux de référence, frontmatter YAML.

## Workflow

Charge `references/workflow.md` avant de commencer — découpage en sections, choix du mode, et boucles interactif/automatique complètes (validation, cohérence, accessibilité des chemins).

## Ce que le skill ne fait pas (v1)

- Ne réorganise ni ne fusionne les sections.
- Ne détecte pas les ruptures de cohérence vers des sections déjà éditées (seulement vers les sections restantes).
- En mode interactif, ne produit pas de résumé automatique de fin (sauf demande explicite).
- Ne propose pas d'édition en place pour les plateformes sans tool d'écriture de commentaire (GitHub, Slack) — affichage en chat seulement.
- Ne committe jamais automatiquement à la place de l'utilisateur (commit messages toujours affichés en chat, jamais exécutés).
- Ne vérifie pas les permissions d'accès sur les plateformes externes (Notion, Linear, Slack, GitHub). La vérification d'accessibilité (existant + committé + pushé) ne couvre que les chemins de fichiers du dépôt git, pas les liens/documents externes.
