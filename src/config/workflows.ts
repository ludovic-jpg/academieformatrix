/** Les quatre étapes du parcours apprenant, envoyées par email par le formateur. */
export const WORKFLOWS = [
  {
    cle: "positionnement",
    titre: "Positionnement sur un parcours de formation",
    message:
      "Avant le démarrage de votre formation, merci de compléter le recueil des besoins puis le test de positionnement depuis votre espace personnel.",
  },
  {
    cle: "financement",
    titre: "Demande de financement de votre formation",
    message:
      "Voici les documents nécessaires à la demande de financement de votre formation. Merci de les compléter, signer et déposer dans votre espace personnel.",
  },
  {
    cle: "realisation",
    titre: "Réalisation de l'action de formation",
    message:
      "Votre formation démarre : retrouvez dans votre espace les supports pédagogiques et les documents à signer au fil des séances.",
  },
  {
    cle: "finalisation",
    titre: "Finalisation de l'action de formation",
    message:
      "Votre formation touche à sa fin : merci de compléter l'évaluation des acquis et de déposer les derniers documents signés.",
  },
] as const;

export type CleWorkflow = (typeof WORKFLOWS)[number]["cle"];
