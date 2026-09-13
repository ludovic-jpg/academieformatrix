# Espace apprenant enrichi, supports par module et évaluations notées

## Objectif
Rendre l’espace plus personnel, organiser les supports au bon endroit et donner à chaque apprenant associé à une formation un accès direct aux cours et aux évaluations en ligne.

## Phase 1 — Photo de profil plus présente
- Agrandir la photo dans l’en-tête de l’espace formateur, avec une taille adaptée au mobile et à l’ordinateur.
- Agrandir également son aperçu dans l’onglet Profil, sans modifier le dépôt ni la confidentialité de l’image.

## Phase 2 — Supports rangés sous leur module
- Supprimer le bloc global « Supports déjà créés » qui sépare les fichiers de leurs modules.
- Reconnaître le numéro de module dans la nomenclature existante des fichiers.
- Afficher sous chaque module ses PowerPoint et PDF déjà générés, avec aperçu et téléchargement.
- Garder le paquet SCORM complet dans une section distincte rattachée à l’ensemble de la formation.
- Conserver les supports existants et leur stockage actuel.

## Phase 3 — Bibliothèque et visionneuse apprenant
- Réorganiser l’espace personnel de l’apprenant en trois onglets : « Mes supports », « Mon cours » et « Espace évaluation ».
- Dans « Mes supports », afficher les fichiers du coffre pédagogique classés par module, avec aperçu et téléchargement.
- Dans « Mon cours », afficher clairement le titre de la formation, la liste des modules et une visionneuse intégrée avec navigation entre les diapositives.
- Pour les nouveaux supports enrichis, enregistrer le contenu structuré utilisé pour produire le PowerPoint/SCORM afin que la visionneuse puisse l’afficher directement sans dépendre d’un logiciel externe.
- Pour les anciens fichiers sans contenu structuré, proposer l’aperçu PDF lorsqu’il existe et conserver le téléchargement PowerPoint/SCORM.

## Phase 4 — Questionnaires Claude de 10 questions
- Remplacer la génération actuelle des tests de positionnement et évaluations des acquis par Claude Anthropic, côté serveur uniquement, avec la clé déjà enregistrée.
- Imposer exactement 10 questions QCM, quatre propositions et une seule bonne réponse par question.
- Protéger cette génération pour qu’elle reste réservée aux formateurs connectés.
- Mettre à jour les deux écrans formateur pour annoncer et générer systématiquement 10 questions.

## Phase 5 — Évaluations dynamiques et notation
- Créer une table dédiée aux réponses d’évaluation, reliée au dossier apprenant et au questionnaire.
- Appliquer les droits d’accès : lecture pour le formateur propriétaire et l’administrateur ; soumission publique uniquement via le lien personnel vérifié côté serveur.
- Dans « Espace évaluation », conserver le recueil des besoins interactif et ajouter les deux QCM interactifs.
- Calculer le score côté serveur à partir des réponses enregistrées, afin que la correction ne puisse pas être falsifiée dans le navigateur.
- Afficher immédiatement à l’apprenant son résultat, le nombre de bonnes réponses et le pourcentage.
- Autoriser une nouvelle soumission qui met à jour le résultat existant, afin que l’apprenant puisse corriger son travail.

## Phase 6 — Remontée formateur et administration
- Afficher dans chaque dossier apprenant les résultats du test de positionnement et de l’évaluation des acquis.
- Ajouter à l’administration un sous-onglet « Évaluations apprenants » avec formation, apprenant, type d’évaluation, score et date.
- Intégrer les évaluations soumises dans le pourcentage de complétude du dossier.

## Phase 7 — Vérification complète
- Appliquer la migration avec les droits, politiques de sécurité et index nécessaires.
- Tester la génération Claude réelle et afficher clairement toute erreur Anthropic sans réponse générique.
- Vérifier le parcours formateur : génération, rangement des supports, aperçu et résultats.
- Vérifier le parcours apprenant : navigation, visionneuse, QCM, notation, modification et téléchargement.
- Vérifier les écrans ordinateur et mobile, puis confirmer que la compilation et les journaux d’exécution sont propres.

## Détails techniques
- Une nouvelle table `supports_cours` conservera le contenu JSON des modules enrichis et les références des fichiers générés ; les fichiers restent dans le coffre privé existant.
- Une nouvelle table `reponses_questionnaires` conservera les réponses, le score, le total et la date de soumission, avec une contrainte unique par dossier et questionnaire.
- Les liens apprenants restent fondés sur leur jeton personnel. Les écritures publiques passent par des fonctions serveur qui vérifient le jeton et recalculent le score.
- Les fichiers PowerPoint et SCORM ne seront pas exécutés directement depuis une archive privée dans le navigateur : la visionneuse React affichera leur contenu source structuré. C’est plus fiable et compatible mobile.
