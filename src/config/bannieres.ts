import {
  Banknote,
  BookOpen,
  ClipboardCheck,
  FileSignature,
  GraduationCap,
  Presentation,
  ShieldCheck,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface Banniere {
  titre: string;
  description: string;
  icone: LucideIcon;
}

/** Bandeau affiché en haut de chaque onglet, indexé par chemin de route. */
export const BANNIERES: Record<string, Banniere> = {
  "/intranet/profil": {
    titre: "Profil formateur",
    description:
      "Vos informations, vos pièces justificatives et votre consentement RGPD.",
    icone: UserRound,
  },
  "/intranet/formations": {
    titre: "Mes formations",
    description:
      "Créez vos programmes de formation et retrouvez l'ensemble de vos parcours.",
    icone: GraduationCap,
  },
  "/intranet/positionnement": {
    titre: "Test de positionnement",
    description:
      "Évaluez le niveau de départ de vos apprenants avant l'entrée en formation.",
    icone: Target,
  },
  "/intranet/acquis": {
    titre: "Évaluation des acquis",
    description:
      "Mesurez les compétences acquises à l'issue de l'action de formation.",
    icone: ClipboardCheck,
  },
  "/intranet/coffre": {
    titre: "Coffre-fort pédagogique",
    description:
      "Centralisez et partagez les documents de chaque parcours en toute sécurité.",
    icone: ShieldCheck,
  },
  "/intranet/supports": {
    titre: "Mes supports de formation",
    description:
      "Générez vos diaporamas, vos PDF et vos modules e-learning SCORM 1.2.",
    icone: Presentation,
  },
  "/intranet/budget": {
    titre: "Demande de budget",
    description: "Transmettez vos demandes de financement à Formatrix.",
    icone: Banknote,
  },
  "/intranet/demande-formation": {
    titre: "Demande de formation",
    description:
      "Constituez le dossier de formation d'un apprenant et de son entreprise.",
    icone: FileSignature,
  },
  "/intranet/admin": {
    titre: "Administration",
    description:
      "Demandes de budget, dossiers de formation et candidatures de formateurs.",
    icone: BookOpen,
  },
};
