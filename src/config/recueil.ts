/**
 * Recueil des besoins PRÉ-FORMATION (F0A) — questions issues du document
 * officiel Formatrix. Sert à la fois au PDF téléchargeable et au formulaire
 * interactif de l'apprenant.
 */
export interface QuestionRecueil {
  cle: string;
  intitule: string;
  type: "texte" | "ouiNon" | "handicap";
}

export const QUESTIONS_RECUEIL: QuestionRecueil[] = [
  {
    cle: "poste",
    intitule:
      "Quel poste occupez-vous au sein de l'entreprise ? Depuis combien de temps ?",
    type: "texte",
  },
  {
    cle: "niveauMaitrise",
    intitule:
      "Selon vous, quel est votre niveau de maîtrise dans le domaine de la formation choisie ?",
    type: "texte",
  },
  {
    cle: "attentes",
    intitule: "Quelles sont vos attentes en participant à cette formation ?",
    type: "texte",
  },
  {
    cle: "besoins",
    intitule: "Que pensez-vous avoir le plus besoin ?",
    type: "texte",
  },
  {
    cle: "handicap",
    intitule:
      "Est-ce qu'un bénéficiaire participant à la formation est en situation de handicap ?",
    type: "handicap",
  },
  {
    cle: "programmeTransmis",
    intitule:
      "Le programme de la formation vous a-t-il bien été transmis par votre supérieur hiérarchique ?",
    type: "ouiNon",
  },
];

export interface ReponsesRecueil {
  [cle: string]: string;
}

export const TITRE_RECUEIL = "Recueil des besoins pré-formation";
