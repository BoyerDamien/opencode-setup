> Dernière synchro : 2026-08-27 — Source : meeting notes Electra, workshop tech spec du 23/06/2026

# Critères de review (condensé)

## Déclenchement Infosec

Source : `references/tech-design-template.md` (guide "Tech Design Writing", Notion Electra).

| Critère | Déclenche Infosec ? |
|---|---|
| Déploiement d'une nouvelle application | Oui |
| Changement d'architecture technique général (ex: migration K8s, changement de langage) | Oui |
| Réimplémentation majeure d'un protocole | Oui |
| Intégration de features complexes (ex: autocharge) | Oui |
| Traitement de données sensibles (mots de passe, PII) | Oui |
| Fonctions d'authentification ou de récupération de données tierces | Oui |
| Aucun des critères ci-dessus | Non — ne pas inclure Infosec dans la checklist |

## Seuil format "lite"

**< 4 points d'effort ET pas de changement d'architecture → Tech Design lite** (Context + High-level design + Testing plan + Security and Privacy uniquement).

Source : meeting notes Electra, workshop tech spec du 23/06/2026.
