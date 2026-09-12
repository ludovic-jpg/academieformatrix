# Espace formateur Formatrix — plan de construction

Objectif : transformer l'outil actuel (un seul écran de génération de programme) en un espace formateur privé, avec compte, profil, archives, tests, évaluations et coffre-fort de documents. Tout reste en français, à la charte Formatrix (bleu marine, or, Carlito, logo existant).

## Ce qui est ajouté, vu par l'utilisateur

- Une page de connexion sobre (email + mot de passe, et bouton Google).
- Un espace privé « Intranet » avec 5 onglets : Profil, Mes Formations, Test de Positionnement, Évaluation des Acquis, Coffre-fort pédagogique.
- Une page publique « Politique de confidentialité » avec un texte provisoire.
- Un accès administrateur (ludovic@formatrix.fr) pour consulter et valider les candidatures des formateurs et leurs pièces.

## Phase 1 — Compte et structure

- Activation de Lovable Cloud (base de données, comptes, stockage de fichiers).
- Connexion par email/mot de passe + Google.
- Page `/login` : logo, encadré titre, formulaire sobre, lien d'inscription.
- Layout `/intranet` avec les 5 onglets ; toutes les pages `/intranet/*` sont protégées et renvoient vers `/login` si l'utilisateur n'est pas connecté.
- La page d'accueil actuelle reste accessible ; un bouton « Espace formateur » y est ajouté.

## Phase 2 — Profil formateur

- Formulaire coordonnées (nom, prénom, téléphone, adresse, NDA, SIRET si présent) ; l'email est pré-rempli et non modifiable.
- Dépôt des pièces : CV, diplôme, carte d'identité, extrait de casier judiciaire, autres (dépôt multiple). Chaque pièce affiche son statut : à fournir / reçu.
- Case de consentement obligatoire avec lien vers `/politique-confidentialite` ; le bouton Enregistrer reste désactivé tant qu'elle n'est pas cochée.
- Statut de candidature affiché (en attente / validée).

## Phase 3 — Mes Formations

- Sous-onglet **Générateur** : le formulaire et la génération IA existants sont déplacés tels quels dans l'onglet, sans changement de comportement ; ajout d'un bouton « Enregistrer la formation ».
- Sous-onglet **Archives** : liste des formations du formateur connecté (titre, niveau, durée, date) avec Voir, Télécharger PDF, Télécharger Word (mêmes générateurs qu'aujourd'hui) et Supprimer (avec confirmation).

## Phase 4 — Test de Positionnement

- **Générateur** : choix d'une formation enregistrée, génération IA de 7 questions à choix multiples adaptées au niveau et au contenu ; questions, réponses et bonne réponse éditables avant enregistrement.
- **Archives** : tests classés par formation, avec date et bouton Voir.

## Phase 5 — Évaluation des Acquis

- Même mécanique que la phase 4, réutilisée (même code, paramètre différent) : 8 questions, intitulé « Évaluation des acquis », archives sur le même principe.

## Phase 6 — Coffre-fort pédagogique

- Dépôt de fichiers rattachés à une formation, visibles uniquement par le formateur connecté.
- Bouton « Partager avec les apprenants » : génère un lien public de consultation en lecture seule, limité aux fichiers de cette formation, sans création de compte. Le lien peut être révoqué.

## Phase 7 — Sécurité, RGPD et administration

- Vérification des règles d'accès sur toutes les tables : aucune donnée d'un formateur n'est visible par un autre, sauf via un lien de partage explicite du coffre-fort.
- `/politique-confidentialite` : texte provisoire (responsable de traitement Back to Business, finalités, durée de conservation, droits, contact backtobusiness.eu@gmail.com), clairement marqué comme à remplacer par le texte officiel.
- Rôle ADMIN pour ludovic@formatrix.fr : écran d'administration listant les candidatures de formateurs, consultation de toutes les pièces, validation/refus d'une candidature.

## Détails techniques

- Backend : Lovable Cloud. Tables `profils_formateurs`, `pieces_formateur`, `formations`, `evaluations` (type = positionnement | acquis, avec le nombre de questions comme paramètre), `coffre_fichiers`, `partages_coffre`, `user_roles` (+ fonction `has_role`, rôles dans une table séparée).
- RLS activée sur toutes les tables, politiques `auth.uid() = formateur_id`, plus une politique de lecture admin via `has_role`. GRANT explicites pour `authenticated` / `service_role` ; `anon` uniquement sur la lecture des fichiers partagés via jeton.
- Stockage : bucket privé `pieces` (pièces d'identité, casier) et bucket `coffre` ; accès par URL signée générée côté serveur.
- Génération IA : réutilisation de `src/lib/generation.functions.ts` (même passerelle, même modèle, sortie JSON stricte) ; ajout d'une fonction serveur `genererQuestionnaire` paramétrée par nombre de questions et type.
- Exports : `src/lib/pdf/ProgrammePdf.tsx` et `src/lib/word/generateWord.ts` réutilisés sans modification depuis les archives.
- Routes protégées sous `src/routes/_authenticated/intranet/*` avec le gate d'authentification standard ; `/login`, `/politique-confidentialite` et le lien de partage restent publics.
- Le formulaire actuel de `src/routes/index.tsx` est extrait en composant réutilisable pour être monté dans l'onglet Générateur sans réécriture.

## Vérification à chaque phase

Build + typecheck, puis test réel dans le navigateur (connexion, dépôt de pièce, enregistrement d'une formation, génération d'un test, partage du coffre) avant de passer à la phase suivante.
