# Workflow de condensation

Procédure commune aux deux types de contenu.

## Découpage en sections

Découpe par headings Markdown (`#`, `##`, `###`). Redécoupe les sections trop longues en paragraphes ; sans heading, utilise des blocs de 3 à 5 paragraphes.

## Étapes

0. Classe le contenu selon `SKILL.md` : demande le mode pour un doc long ; utilise l’automatique pour un contenu court.
1. Découpe le document et crée une todo list, une entrée par section.
2. Traite chaque section dans l’ordre après l’avoir marquée `in_progress`.

**Mode interactif :**
   a. Applique le **Test de nécessité de suppression**. Si un changement de format de sortie est envisagé, choisis-le avec `presentation-formats.md`.
   b. Si Mermaid semble adapté et que la cible est inconnue, demande où le contenu sera lu avant de proposer la sortie finale.
   c. Affiche l’original et la proposition, ou propose de passer une section déjà concise.
   d. Attends : valider, modifier ou passer.
   e. Si validé, édite immédiatement. Cherche les termes significatifs retirés dans les sections restantes et propose un correctif si nécessaire.
   f. Vérifie les chemins ; supprime-les ou généralise-les s’ils ne sont pas accessibles.
   g. Marque la section `completed`, puis demande à poursuivre.

**Mode automatique :**
   a. Applique le **Test de nécessité de suppression**. Si un changement de format de sortie est envisagé, choisis-le avec `presentation-formats.md`.
   b. Si Mermaid semble adapté et que la cible est inconnue, demande où le contenu sera lu et attends obligatoirement sa réponse avant d’appliquer la sortie finale ; cette question concerne le rendu, pas la validation éditoriale.
   c. Après cette réponse — ou si aucune question n’était nécessaire — condense sans validation section par section.
   d. Cherche les termes significatifs retirés dans les sections restantes et corrige automatiquement si nécessaire.
   e. Vérifie les chemins ; supprime-les ou généralise-les s’ils ne sont pas accessibles.
   f. Marque la section `completed` et passe à la suivante.

3. Fin :
   - **Interactif** : pas de résumé sans demande explicite.
   - **Automatique** : résume les sections modifiées et les correctifs appliqués.
