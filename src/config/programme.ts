// Modèle de données du programme de formation et valeurs par défaut
// du formulaire (pré-remplies, éditables par l'utilisateur).

export type ModeFormation =
  | "Présentiel"
  | "Distanciel synchrone"
  | "Mixte";

export type Niveau =
  | "Débutant"
  | "Intermédiaire"
  | "Avancé"
  | "Débutant à avancé";

export interface ProgrammeFormation {
  titre: string;
  modeFormation: ModeFormation;
  plateforme?: string | undefined; // affiché seulement si modeFormation contient "synchrone"
  dureeHeures: number;
  nombreModules: number; // contrainte donnée à l'IA pour le découpage du contenu, défaut 3
  publicConcerne: string;
  prerequis: string;
  niveau: Niveau;
  modalitesAcces: string;
  encadrement: string;
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
  "Mixte",
];

export const NIVEAUX: Niveau[] = [
  "Débutant",
  "Intermédiaire",
  "Avancé",
  "Débutant à avancé",
];

export const PHRASE_METHODES_PEDAGOGIQUES =
  "Afin de renforcer l'interactivité, l'intérêt des participants et la qualité des apprentissages, l'intervenant privilégie les méthodes pédagogiques suivantes :";

export const VALEURS_DEFAUT = {
  modalitesAcces:
    "Recueil des besoins réalisé par la conseillère formation, test de positionnement réalisé par le formateur et adaptation du parcours aux besoins et au parcours professionnel de la personne.",
  encadrement:
    "La formation est assurée par Formatrix en mettant à disposition un formateur expérimenté dans son domaine, disponible selon les modalités et plages horaires préalablement définies.",
  accompagnementPedagogique: [
    "L'apprenant reçoit une convocation dans laquelle l'ensemble des modalités selon la nature et le mode de formation choisis sont explicites.",
    "Mise à disposition de l'adresse email pedagogie@formatrix.fr, à votre disposition 24/24, pour poser des questions en cas de rupture de connexion.",
    "Formulaire de réclamation",
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

/**
 * Les rubriques « Organisation pédagogique » et « Moyens pédagogiques
 * spécifiques » ne sont plus saisies dans le formulaire : elles sont
 * toujours reprises depuis les valeurs de l'organisme dans les documents.
 */
export const RUBRIQUES_FIXES = {
  modalitesAcces: VALEURS_DEFAUT.modalitesAcces,
  encadrement: VALEURS_DEFAUT.encadrement,
  accompagnementPedagogique: [...VALEURS_DEFAUT.accompagnementPedagogique],
  suivi: VALEURS_DEFAUT.suivi,
  modalitesEvaluation: [...VALEURS_DEFAUT.modalitesEvaluation],
  validationFormation: VALEURS_DEFAUT.validationFormation,
  methodesPedagogiques: [...VALEURS_DEFAUT.methodesPedagogiques],
  moyensPedagogiques: [...VALEURS_DEFAUT.moyensPedagogiques],
};

/** Applique systématiquement les rubriques fixes de l'organisme. */
export function avecRubriquesFixes(
  programme: ProgrammeFormation,
): ProgrammeFormation {
  return { ...programme, ...RUBRIQUES_FIXES };
}
