> Dernière synchro : 2026-08-27 — Source : https://app.notion.com/p/2dc3410ee00d430ea3d7256ba01556dc (guide) et https://app.notion.com/p/34c96db3ecf780b8ba5ec301d2314ef5 (exemple "Monorepo ADR")

# Template ADR (Architecture Decision Record)

## Propriétés Notion (à renseigner à la publication)

| Propriété | Type | Valeur |
|---|---|---|
| `Status` | Select | `Draft` (défaut) \| `Proposal` \| `In effect` \| `Superseded` \| `Retired` |
| `Authors` | People | Personne(s) Notion ayant rédigé l'ADR |
| `Reviewers` | People | Laissé vide en v1 — voir SKILL.md étape 5 |
| `Platforms` | Multi-select | `Web`, `Mobile`, `Data`, `Infra`, `Backend` (autant que pertinent) |
| `Projects` | Relation | Vers la DB Projects, optionnel |
| `Date` | Date | Date de la décision |

## Sections de contenu, dans l'ordre

1. **TL;DR** (callout en haut) — 3 à 6 bullet points résumant la décision, ce qui change, ce qui est explicitement hors scope.
2. **🎯 Motivation** — le problème concret qui force la décision ; données/chiffres si possible ; ce qui a été essayé/observé avant.
3. **✅ Decision** — liste numérotée des décisions concrètes prises (LA décision retenue, pas les options), formulée à l'impératif.
4. **🧩 Description** — détails d'implémentation : mécanique, séquences, topologie/architecture cible, questions ouvertes marquées explicitement dans un callout "Open question".
5. **⚖️ Trade-offs** — sous-section **Pros** / **Cons**, puis sous-section **Alternatives considered** (chaque alternative rejetée + la raison du rejet en 1-2 phrases).
6. **📎 Annex** — références externes, liens, calculs/dérivations si pertinent.

## Exemple de style (Decision + Alternatives considered)

Ton attendu : impératif, concret, sans jargon creux. Exemple neutre (pas le contenu réel Electra) :

**✅ Decision**

1. Move incrementally: extract one service per sprint, starting with the least-coupled one.
2. Preserve the existing REST contracts during the transition; no breaking change for consumers.
3. Route new traffic through the API gateway; keep the legacy path as fallback until parity is confirmed.

**⚖️ Trade-offs — Alternatives considered**

- **Big-bang rewrite** — rejected: too risky given the team's current on-call load, and no rollback path once started.
- **Keep the monolith, add a caching layer** — rejected: treats the symptom (latency) but leaves the actual coupling problem unresolved.
