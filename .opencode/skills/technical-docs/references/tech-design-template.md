> Dernière synchro : 2026-08-27 — Source : https://app.notion.com/p/3951d7ea7c8746a5be41de574acd7452

# Template Tech Design

## Sections

| Section | Requis ? | Écrire ceci | Ne pas écrire ceci |
|---|---|---|---|
| 🧭 Context | Toujours | Goals, drivers, contraintes ; lien vers le brief/ticket. 3-5 phrases. | Historique complet du projet, roadmap déjà connue. |
| 🏛️ High-level design | Toujours | Modèle de données affecté (ERD, champs nouveaux/modifiés uniquement) et/ou diagramme de séquence/activité si le flux n'est pas évident ; décisions clés ; sous-section "Rejected alternatives". | Code/pseudo-code, signatures de méthodes triviales, questions sans réponse, notes de réunion. |
| 📑 API contracts | Si changement d'API | Diff de schéma GraphQL / forme requête-réponse REST / schéma d'événement inter-service. | Rien si pas de changement d'API. |
| 💼 External integration | Si intégration tierce | Où vivent les docs, accès à l'admin panel, qui a accès, quirks non documentés. | Rien si pas d'intégration. |
| 💡 Technical opportunities | Optionnel | 2-3 bullets de dette technique concernée ou d'outillage qui aide. | Un backlog de dette complet. |
| ↯ Phasing | Recommandé | Feature flags, % rollout, dark launch, étapes de migration, rollback. Ou "Single-batch release, no phasing required." | — |
| 🧪 Testing plan | Toujours | Plan de test (pas la définition QA elle-même) ; lien vers un doc QA séparé si besoin. | Re-lister chaque test unitaire. |
| 🔔 Monitoring and alerting | Toujours si user-facing / écriture de données | Instrumentation, alerting, KPIs business, SLOs techniques. | Rien si changement vraiment mineur. |
| 🔐 Security and Privacy | Toujours, scopé | Uniquement ce qui s'applique : données personnelles, changements auth/authz, secrets, risques de validation d'input, RGPD. | La checklist complète copiée-collée quand rien ne s'applique. |
| 🪤 Gotchas | Optionnel | Choses non-évidentes qu'un reviewer pourrait mal lire ou vouloir "corriger". | — |
| ⏰ Estimates | Toujours | Un tableau `Task / Dev-days` avec un total. | — |
| 📜 Versions | Après 1ère révision | Quelles sections ont été modifiées par une révision, ou lien vers la nouvelle version. | — |

## Format lite (< 4 points d'effort)

Seulement : **Context** + **High-level design** + **Testing plan** + **Security and Privacy**. Voir le seuil dans `references/review-criteria.md`.

## Guidelines de style

- Écris ce que tu vas faire, pas ce qui aurait pu être fait — mentionne les alternatives rejetées en aparté (sous-section dédiée), pas comme des options encore ouvertes.
- Tout diagramme doit avoir une source éditable (Mermaid par défaut) — voir `references/writing-style.md` et l'étape 3 du workflow dans `SKILL.md` pour la validation Mermaid.
- Jamais de screenshot sans source éditable derrière.
- Écris vite un premier jet, puis relis-toi — ne cherche pas la perfection au premier passage.
- Ton direct ; emojis et code couleur bienvenus pour attirer l'attention sur les points importants.

## Process de review

- **Data team** : toujours dans la checklist.
- **≥1 reviewer tech** : les team leads si le sujet est cross-team, sinon n'importe quel tech de la PE (Platform Engineering).
- **Infosec** : seulement si le sujet déclenche un des critères suivants (détail dans `references/review-criteria.md`) :
  - déploiement d'une nouvelle application
  - changement d'architecture technique général (ex: migration K8s, changement de langage)
  - réimplémentation majeure d'un protocole
  - intégration de features complexes (ex: autocharge)
  - traitement de données sensibles (mots de passe, PII)
  - fonctions d'authentification ou de récupération de données tierces
