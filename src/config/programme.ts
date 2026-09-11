// Modèle de données du programme de formation et valeurs par défaut
// du formulaire (pré-remplies, éditables par l'utilisateur).

export type ModeFormation =
  | "Présentiel"
  | "Distanciel synchrone"
  | "Distanciel asynchrone"
  | "Mixte";

export type Niveau = "Débutant" | "Intermédiaire" | "Avancé";

export interface ProgrammeFormation {
  titre: string;
  sousTitre?: string;
  modeFormation: ModeFormation;
  plateforme?: string; // affiché seulement si modeFormation contient "synchrone"
  dureeHeures: number;
  nombreModules: number; // contrainte donnée à l'IA pour le découpage du contenu, défaut 3
  publicConcerne: string;
  prerequis: string;
  niveau: Niveau;
  modalitesAcces: string;
  encadrement: string;
  coordinationPedagogique: string;
  accompagnementPedagogique: string[];
  suivi: string;
  modalitesEvaluation: string[];
  validationFormation: string;
  methodesPedagogiques: string[];
  moyensPedagogiques: string[];
  objectifsPedagogiques: string[]; // rempli par l'IA, modifiable ensuite
  modules: { titre: string; points: string[] }[]; // rempli par l'IA, modifiable ensuite
}

export const MODES_FORMATION: ModeFormation[] = [
  "Présentiel",
  "Distanciel synchrone",
  "Distanciel asynchrone",
  "Mixte",
];

export const NIVEAUX: Niveau[] = ["Débutant", "Intermédiaire", "Avancé"];

export const PHRASE_METHODES_PEDAGOGIQUES =
  "Afin de renforcer l'interactivité, l'intérêt des participants et la qualité des apprentissages, l'intervenant privilégie les méthodes pédagogiques suivantes :";

export const VALEURS_DEFAUT = {
  modalitesAcces:
    "Inscription : A l'issue d'un Audit de croissance (réservation), l'organisme produit un plan de formation qui vous permettra de faire une demande de financement auprès de votre OPCO. Accessible à tout public (y compris personnes en situation de handicap). Quand : toute l'année dans la limite des disponibilités. Les dates de formation sont définies par le stagiaire selon ses convenances.",
  encadrement:
    "La formation est assurée par Back to Business en mettant à disposition un formateur expérimenté dans son domaine et disponible selon les modalités et plages horaires préalablement définies.",
  coordinationPedagogique:
    "Ludovic ALBISSER, responsable pédagogique, sera en charge de l'apprenant dès l'entrée en formation et ce, tout le long du parcours pédagogique.",
  accompagnementPedagogique: [
    "Questions sur les formations directement sur la plateforme et mise en contact avec un interlocuteur référent",
    "Coordinateur pédagogique disponible par téléphone et/ou par email (délais de réponse par email sous 48h maximum, jours ouvrés)",
    "Visioconférence prévue pendant la durée de la formation",
  ],
  suivi:
    "Le suivi de la réalisation du stage sera justifié par la feuille d'émargement, le relevé de fréquentation ou de connexion.",
  modalitesEvaluation: [
    "Tests d'évaluation et de progression",
    "Exercices / Mise en situation",
    "Échanges avec le formateur",
    "Travaux et évaluation finale",
  ],
  validationFormation:
    "La formation sera validée par la remise d'un certificat de réalisation.",
  methodesPedagogiques: [
    "Méthodes d'animation participatives : interactivité, exemples et cas pratiques",
    "Procédés pédagogiques adaptés au niveau du/des participants",
    "Travaux pratiques adaptés à l'activité du client",
  ],
  moyensPedagogiques: [
    "Ordinateur portable du client du formateur avec accès réseau/internet (webcam et micro obligatoires pour les formations synchrones)",
  ],
  accessibiliteHandicap:
    "Nos formations sont ouvertes à tous. Si le stagiaire a besoin d'un encadrement particulier, Back to Business se met à votre disposition à l'adresse email backtobusiness.eu@gmail.com afin de prendre en considération votre besoin. Nous serons heureux de créer un cadre de travail adapté à votre progression.",
} as const;
