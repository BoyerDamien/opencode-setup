---
name: condensing-docs
description: Use when condensing, simplifying, or reducing the verbosity of any written content — markdown docs, comments, PR messages, commit messages, tickets/issues. Triggers on "condense ce doc", "simplifie ce texte", "relis section par section", "rends ça moins verbeux", "réduis ce document", "condense ce commentaire", "simplifie cette PR", "condense ce ticket", "réduis ce message de commit".
---

# condensing-docs

Condense toute production écrite destinée à des humains : documents markdown longs, commentaires, messages de PR, tickets/issues, commit messages. Propose une version condensée à l'essentiel, en mode interactif (validation par section) ou automatique (application directe, résumé à la fin).

## Type de contenu

Classe le contenu selon sa structure et sa longueur, jamais selon sa source.

- **Doc long structuré** : au moins 2 headings Markdown ou 300 mots. Demande le mode, découpe en sections et crée une todo list.
- **Court / faible impact** : sinon. Utilise directement le mode automatique, avec les mêmes contrôles et un résumé final.

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

Avant de condenser, charge `references/patterns.md` et `references/guardrails.md`. Si la condensation peut changer le format de présentation de la sortie, charge aussi `references/presentation-formats.md`. Les garde-fous priment en cas de conflit.

Condense uniquement la prose. Préserve les blocs de code, tableaux de référence et frontmatter YAML.

## Workflow

Charge `references/workflow.md` avant de commencer. Il définit le découpage, le choix du mode et les contrôles par section.

## Ce que le skill ne fait pas (v1)

- Ne réorganise ni ne fusionne les sections.
- Vérifie la cohérence seulement avec les sections restantes.
- En mode interactif, ne produit pas de résumé final sans demande explicite.
- Pour GitHub et Slack, affiche la condensation dans le chat : aucun tool d’édition n’est disponible.
- Ne committe jamais ; les messages de commit restent affichés dans le chat.
- Vérifie uniquement les chemins Git existants, commités et poussés, pas les permissions ou ressources externes.
