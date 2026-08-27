---
name: technical-docs
description: Use when writing an ADR, tech design doc, or tech exploration doc that must follow Electra's Notion templates (sections, review process, lifecycle status). Triggers on "ADR", "architecture decision record", "tech design", "tech spec", "design doc", "tech exploration", "documente cette décision", "écris un ADR/tech design sur...".
---

# technical-docs

Rédige de la documentation technique (ADR, Tech Design, Tech Exploration) conforme aux templates réels d'Electra sur Notion, avec publication optionnelle et validation Mermaid des diagrammes.

## Decision table (choix du format)

| Situation | Format |
|---|---|
| Décision architecturale isolée, réversible dans le temps, à tracer (ex: "pourquoi Kafka plutôt que SQS") | **ADR** |
| Projet/feature à implémenter avec design détaillé (API, tests, sécurité) | **Tech Design** |
| Effort estimé < 4 points ET pas de changement d'architecture | **Tech Design "lite"** (Context + High-level design + Testing plan + Security & Privacy uniquement) |
| Incertitude sur la faisabilité/l'ampleur, avant de savoir si une tech spec est nécessaire | **Tech Exploration** (format proposé, non-officiel) |

Un format demandé explicitement par l'utilisateur ("écris un ADR sur X") prime toujours sur la table.

## Workflow d'exécution

1. **Détection du format** — utilise la decision table ci-dessus, ou le format explicite fourni par l'utilisateur. **Si le format détecté est Tech Exploration**, précise oralement à l'utilisateur que ce format est une proposition interne non-officielle, pas un standard Electra validé — lis `references/tech-exploration-template.md` pour le bandeau exact et les sections.
2. **Mini-brainstorming ciblé** — pose une question à la fois sur ce qui manque pour remplir les sections obligatoires (alternatives rejetées, sécurité/privacy, estimation d'effort...), en réutilisant d'abord ce qui est déjà dans le contexte de conversation.
3. **Rédaction du brouillon local** dans `docs/tech-docs/<type>/YYYY-MM-DD-<slug>.md` (`<type>` = `adr` | `tech-design` | `tech-exploration`), **rédigé en français**, en respectant strictement l'ordre et le statut obligatoire/conditionnel/optionnel des sections. Avant de rédiger, `read` le template correspondant : `references/adr-template.md`, `references/tech-design-template.md`, ou `references/tech-exploration-template.md`. Diagrammes en **Mermaid valide par défaut** ; PlantUML/kroki.io ou lien Miro/Figma uniquement si demandé ou si la complexité l'exige.
   - **Chaque diagramme Mermaid est validé** via le tool MCP `validate_and_render_mermaid_diagram` (serveur `mermaid`) avant inclusion. En cas d'échec, corrige la syntaxe et revalide en boucle ; si toujours bloqué, signale-le explicitement à l'utilisateur plutôt que d'inclure un diagramme non validé.
4. **Auto-relecture** — `read` `references/writing-style.md` et applique ses règles (une idée par phrase, phrases courtes, voix active, termes cohérents, listes plutôt que prose dense...) — passe de simplification avant présentation à l'utilisateur, pas après.
5. **Checklist de review** ajoutée en fin de document (texte informatif, pas d'assignation) : Data team (toujours), ≥1 reviewer tech, Infosec si le contenu déclenche les critères Electra. `read` `references/review-criteria.md` pour la liste exacte des critères Infosec et le seuil "lite". **v1 : pas de recherche automatique de noms** — l'utilisateur remplit `Reviewers` lui-même.
6. **Validation utilisateur** du brouillon local avant toute publication.
7. **Publication Notion** (sur demande explicite, jamais automatique) — traduis le contenu en anglais (guideline Electra "Write in proper English") avant création de la page dans la bonne base de données, propriétés renseignées (Status: Draft par défaut, Authors, Platforms si pertinent) en plus du corps du texte. Le brouillon local en français n'est pas modifié ; seule la version publiée est en anglais.
8. **Évolution d'un doc existant (v1, simplifié)** — si l'utilisateur référence un ADR/Tech Design Notion existant (URL/ID) à faire évoluer : crée la nouvelle page + mentionne l'ancienne dans la section Versions de la nouvelle. **v1 : ne marque pas automatiquement l'ancienne `Superseded`** — cas repoussé en itération 2.

## Étape → tool(s) MCP nommé(s)

| Étape | Tool(s) MCP |
|---|---|
| 3 — validation Mermaid | `validate_and_render_mermaid_diagram` (serveur `mermaid`) |
| 7 — obtenir le `data_source_id` cible avant publication | `notion_notion-fetch` sur la DB ADR (`collection://03a4f416-014a-4846-8384-45fd88c3c63f`) ou "Projects' docs" — ne jamais passer un `database_id` brut à `create-pages` sur une DB multi-source |
| 7 — création de la page Notion | `notion_notion-create-pages` avec `parent: {data_source_id: ...}` |
| 8 — mention de l'ancien doc | `notion_notion-fetch` (lire l'ancienne page pour citer son URL/titre exact dans la section Versions de la nouvelle) |

## Ce que le skill ne fait pas (v1)

- Ne cherche pas automatiquement des noms de reviewers concrets (Notion/Slack) — l'utilisateur remplit `Reviewers`.
- Ne marque pas automatiquement l'ancien doc `Superseded` lors d'une évolution — juste une mention dans la nouvelle section Versions.
- Ne vérifie pas automatiquement la fraîcheur des templates — chaque `references/*.md` porte un bandeau "Dernière synchro" à contrôler manuellement.
