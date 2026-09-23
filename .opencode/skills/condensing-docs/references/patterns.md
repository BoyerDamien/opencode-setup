# Patterns de condensation

Règles à appliquer lors de la condensation de tout contenu (doc long, commentaire, PR, ticket, commit). Référencé par `SKILL.md` — à lire avant de commencer toute condensation.

Le format d’affichage de la sortie suit `presentation-formats.md`.

## Règles de base

| Don't | Do |
|---|---|
| Référence à un chemin de fichier/dossier précis quand il n'est pas le sujet de la phrase (`src/foo/bar.ts:42`) | Supprime la référence ou généralise |
| Lien intentionnel (`[doc](https://...)`) qui porte l'information | Garde-le — ce n'est pas une référence fragile |
| Phrase longue/complexe, subordonnées imbriquées | Découpe en phrases courtes ou liste à puces |
| Plusieurs formulations de la même idée | Garde la plus courte |
| **Test de nécessité de suppression** — mot, idée, phrase ou détail explicatif candidat | Supprime-le seulement si le paragraphe reste compréhensible, exact et actionnable ; garde ou reformule plus concisément toute dépendance implicite ou contrainte d'implémentation |
| Détails d'implémentation non essentiels au message | Garde seulement la conclusion/règle/décision |

**Atomes techniques dans la prose** (code inline ou code cité, commandes, chemins requis, identifiants, endpoints, noms de config, messages d'erreur) : supprime-les seulement s'ils sont inutiles pour le propos ; s'ils restent, conserve-les verbatim. Les blocs de code restent intouchables selon `SKILL.md`.

## Patterns issus de la recherche

| Don't | Do | Source |
|---|---|---|
| Fusionner plusieurs idées dans une phrase longue pour « gagner de la place » | Découpe toute phrase portant 2+ idées en phrases courtes distinctes | Google, Digital.gov, SPARC BC, Oregon DAS, AU Style Manual — consensus très fort |
| Garder des phrases de 40+ mots avec clauses empilées | Ramène les phrases vers 15-20 mots ; au-delà de ~25 mots, découpe ou convertis en liste | 6 sources indépendantes (Google, OPM, AU Style Manual, Nottinghamshire, SPARC BC, Oregon) — consensus très fort |
| Laisser un paragraphe mélanger plusieurs sujets | Un seul sujet par paragraphe, 3-8 phrases ; supprime/déplace toute phrase hors-sujet | NN/g, Google, Digital.gov, OPM, AU Style Manual — consensus fort |
| Garder le contexte/background en tête et la conclusion enterrée | Mets la conclusion/décision/réponse en première phrase, puis les détails en ordre décroissant d'importance (pyramide inversée / BLUF) | NN/g, Microsoft, Mintlify, datafield.dev, Yoast — consensus très fort |
| Garder une énumération/options/étapes imbriquées dans une phrase | Refactorise en liste à puces/numérotée, items grammaticalement parallèles | Google, NN/g, Microsoft — consensus fort |
| Garder « the implementation of X will facilitate improved detection » | Réécris en « X improves detection » — acteur + verbe + cible, voix active | Google, Microsoft, datafield.dev, OPM, ASD-STE100 — consensus fort |
| « Simplifier » ou renommer un nom technique, identifiant, commande, chemin, message d'erreur cité | Laisse intacts le code, les chemins, les noms de produit/endpoint/config, les liens intentionnels — condense seulement la prose autour | ASD-STE100, Google — consensus moyen-fort |
| Introduire un synonyme pour un concept déjà nommé, ou laisser des pronoms flottants (« it », « this ») après avoir coupé le référent | Garde un seul nom par concept dans tout le document ; remplace les pronoms ambigus par leur nom explicite si la coupe a éloigné le référent | Google, ASD-STE100 — consensus fort |

## Traitement selon le type de contenu

- **Documentation longue** : pyramide inversée au niveau du document, hiérarchie de titres informatifs, réduction/masquage plutôt que suppression quand on ne peut pas condenser davantage.
- **Commentaire court / PR / ticket / commit** : BLUF strict — réponse/action en première phrase, suppression impitoyable du backstory et du filler.
- **Procédural vs descriptif** (ASD-STE100) : deux régimes distincts. Procédural — impératif, ≤20 mots/phrase, une instruction par phrase. Descriptif — pas d'impératif, ≤25 mots/phrase, un fait nouveau par phrase, ≤6 phrases/paragraphe. Ne mélange pas les deux dans un même passage.
