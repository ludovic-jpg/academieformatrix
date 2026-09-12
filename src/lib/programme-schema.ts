import { z } from "zod";

import {
  MODES_FORMATION,
  NIVEAUX,
  VALEURS_DEFAUT,
  type ProgrammeFormation,
} from "@/config/programme";

export const programmeSchema = z.object({
  titre: z
    .string()
    .trim()
    .min(1, "Le titre est obligatoire")
    .max(200, "Le titre doit faire moins de 200 caractères"),
  modeFormation: z.enum(MODES_FORMATION as [string, ...string[]]),
  plateforme: z
    .string()
    .trim()
    .max(100, "La plateforme doit faire moins de 100 caractères")
    .optional()
    .or(z.literal("")),
  dureeHeures: z.coerce
    .number({ error: "La durée est obligatoire" })
    .positive("La durée doit être supérieure à 0")
    .max(1000, "La durée doit être inférieure à 1000 heures"),
  nombreModules: z.coerce
    .number()
    .int("Le nombre de modules doit être un entier")
    .min(1, "Au moins 1 module")
    .max(20, "20 modules maximum"),
  publicConcerne: z
    .string()
    .trim()
    .min(1, "Le public concerné est obligatoire")
    .max(1000, "Le public concerné doit faire moins de 1000 caractères"),
  prerequis: z
    .string()
    .trim()
    .min(1, "Les prérequis sont obligatoires")
    .max(1000, "Les prérequis doivent faire moins de 1000 caractères"),
  niveau: z.enum(NIVEAUX as [string, ...string[]], {
    error: "Le niveau est obligatoire",
  }),
  modalitesAcces: z.string().trim().max(2000),
  encadrement: z.string().trim().max(2000),
  accompagnementPedagogique: z.array(z.string().trim().max(500)),
  suivi: z.string().trim().max(2000),
  modalitesEvaluation: z.array(z.string().trim().max(500)),
  validationFormation: z.string().trim().max(1000),
  methodesPedagogiques: z.array(z.string().trim().max(500)),
  moyensPedagogiques: z.array(z.string().trim().max(500)),
  // Champs remplis par l'IA, modifiables ensuite par l'utilisateur
  objectifsPedagogiques: z.array(z.string().trim().max(500)),
  modules: z.array(
    z.object({
      titre: z.string().trim().max(200),
      points: z.array(z.string().trim().max(500)),
    }),
  ),
});

export type ProgrammeFormValues = z.input<typeof programmeSchema>;

export const VALEURS_FORMULAIRE_DEFAUT: ProgrammeFormValues = {
  titre: "",
  modeFormation: "Présentiel",
  plateforme: "",
  dureeHeures: "" as unknown as number,
  nombreModules: 3,
  publicConcerne: "",
  prerequis: "",
  niveau: "Débutant",
  modalitesAcces: VALEURS_DEFAUT.modalitesAcces,
  encadrement: VALEURS_DEFAUT.encadrement,
  accompagnementPedagogique: [...VALEURS_DEFAUT.accompagnementPedagogique],
  suivi: VALEURS_DEFAUT.suivi,
  modalitesEvaluation: [...VALEURS_DEFAUT.modalitesEvaluation],
  validationFormation: VALEURS_DEFAUT.validationFormation,
  methodesPedagogiques: [...VALEURS_DEFAUT.methodesPedagogiques],
  moyensPedagogiques: [...VALEURS_DEFAUT.moyensPedagogiques],
  objectifsPedagogiques: [],
  modules: [],
};

/** Construit un ProgrammeFormation complet à partir des valeurs validées. */
export function versProgrammeFormation(
  valeurs: z.output<typeof programmeSchema>,
): ProgrammeFormation {
  return {
    ...valeurs,
    modeFormation: valeurs.modeFormation as ProgrammeFormation["modeFormation"],
    niveau: valeurs.niveau as ProgrammeFormation["niveau"],
  };
}
