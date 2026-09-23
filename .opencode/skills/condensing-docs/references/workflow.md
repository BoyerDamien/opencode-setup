# Workflow de condensation

Procédure commune aux deux types de contenu.

## Découpage en sections

Découpe par headings Markdown (`#`, `##`, `###`). Redécoupe les sections trop longues en paragraphes ; sans heading, utilise des blocs de 3 à 5 paragraphes.

## Étapes

0. Classe le contenu selon `SKILL.md`. Pour un doc long, demande le mode ; pour un contenu court, utilise le mode automatique.
1. Découpe le document et crée une todo list, une entrée par section.
2. Traite chaque section dans l’ordre après l’avoir marquée `in_progress`.

**Mode interactif :**
   a. Applique le **Test de nécessité de suppression**, puis affiche l’original et la proposition — ou propose de passer une section déjà concise.
   b. Attends : valider, modifier ou passer.
   c. Si validé, édite immédiatement. Cherche les termes significatifs retirés dans les sections restantes et propose un correctif si nécessaire.
   d. Vérifie les chemins ; supprime-les ou généralise-les s’ils ne sont pas accessibles.
   e. Marque la section `completed`, puis demande à poursuivre.

**Mode automatique :**
   a. Applique le **Test de nécessité de suppression**, puis condense sans attendre de validation.
   b. Cherche les termes retirés dans les sections restantes et corrige automatiquement si nécessaire.
   c. Vérifie les chemins et supprime-les ou généralise-les s’ils ne sont pas accessibles.
   d. Marque la section `completed` et passe à la suivante.

3. Fin :
   - **Interactif** : pas de résumé sans demande explicite.
   - **Automatique** : résume les sections modifiées et les correctifs appliqués.
