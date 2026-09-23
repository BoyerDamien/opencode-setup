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

- **Chemin local** : lis le fichier avec `read`, puis édite-le en place avec `edit`.
- **URL distante** : récupère le contenu et affiche la condensation dans le chat ; pas d’édition en place.
- **Texte collé** : traite-le directement et retourne la version condensée dans le chat.
- **Commentaire ou issue Linear/Notion** : récupère le contenu avec le tool de la plateforme, par exemple `linear_get_issue` ou `notion_notion-get-comments`, puis écris automatiquement la condensation avec le tool correspondant, par exemple `linear_save_comment`, `linear_save_issue` ou `notion_notion-create-comment`. Pour mettre à jour un commentaire Notion existant, appelle `notion_notion-create-comment` avec l’ID du commentaire existant ; ne crée pas de doublon.
- **Commentaire, PR ou issue GitHub ; message Slack** : récupère le contenu avec un tool de lecture, par exemple `mermaid_get_pull_comments`, `mermaid_get_issue_comments` ou `slack_read_thread`, puis affiche la condensation dans le chat. Aucun tool d’édition n’est disponible.
- **Brouillon de message de commit** : traite-le comme du texte collé et affiche la condensation ; l’utilisateur effectue le commit.

## Règles de condensation

Charge `references/patterns.md` et `references/guardrails.md`. Si la condensation peut changer le format de présentation de la sortie, charge aussi `references/presentation-formats.md`. Les garde-fous priment.

- Condense uniquement la prose ; les blocs de code et le frontmatter YAML restent immuables.
- Conserve la structure des tableaux existants. Tu peux condenser la prose de leurs cellules, sans modifier les en-têtes, valeurs, cellules vides significatives, unités, exceptions, contraintes ni l’ordre des lignes et colonnes.
- En mode interactif seulement, reformate un tableau si `presentation-formats.md`, réappliqué à son information, sélectionne un format non tabulaire ; ne les reformate jamais en mode automatique.

## Workflow

Charge `references/workflow.md` avant de commencer. Il définit le découpage, le choix du mode et les contrôles par section.

## Ce que le skill ne fait pas (v1)

- Ne réorganise ni ne fusionne les sections.
- Vérifie la cohérence seulement avec les sections restantes.
- En mode interactif, ne produit pas de résumé final sans demande explicite.
- Pour GitHub et Slack, affiche la condensation dans le chat : aucun tool d’édition n’est disponible.
- Ne committe jamais ; les messages de commit restent affichés dans le chat.
- Vérifie uniquement les chemins Git existants, commités et poussés, pas les permissions ou ressources externes.
