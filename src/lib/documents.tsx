import { avecRubriquesFixes, type ProgrammeFormation } from "@/config/programme";

/** Déclenche le téléchargement d'un blob quelconque dans le navigateur. */
export function telechargerBlob(nom: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
}

/** Télécharge le programme au format PDF (charte Formatrix). */
export async function telechargerProgrammePdf(programme: ProgrammeFormation) {
  // La librairie PDF s'appuie sur Buffer pour décoder le logo.
  const { Buffer } = await import("buffer");
  const global = globalThis as unknown as { Buffer?: unknown };
  if (!global.Buffer) global.Buffer = Buffer;
  const [{ pdf }, { ProgrammePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/ProgrammePdf"),
  ]);
  const blob = await pdf(<ProgrammePdf programme={avecRubriquesFixes(programme)} />).toBlob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `Programme - ${programme.titre}.pdf`;
  lien.click();
  URL.revokeObjectURL(url);
}

/** Télécharge le programme au format Word (charte Formatrix). */
export async function telechargerProgrammeWord(programme: ProgrammeFormation) {
  const { genererWord } = await import("@/lib/word/generateWord");
  await genererWord(avecRubriquesFixes(programme));
}

/** Télécharge un questionnaire (test ou évaluation) au format PDF. */
export async function telechargerQuestionnairePdf(questionnaire: {
  titre: string;
  questions: { question: string; propositions: string[]; bonneReponse?: number }[];
  avecCorrige?: boolean;
}) {
  const { Buffer } = await import("buffer");
  const global = globalThis as unknown as { Buffer?: unknown };
  if (!global.Buffer) global.Buffer = Buffer;
  const [{ pdf }, { QuestionnairePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/QuestionnairePdf"),
  ]);
  const blob = await pdf(
    <QuestionnairePdf
      titre={questionnaire.titre}
      questions={questionnaire.questions}
      avecCorrige={questionnaire.avecCorrige ?? false}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${questionnaire.titre}${questionnaire.avecCorrige ? " - corrigé" : ""}.pdf`;
  lien.click();
  URL.revokeObjectURL(url);
}

/** Télécharge le recueil des besoins (vierge ou pré-rempli) au format PDF. */
export async function telechargerRecueilPdf(
  infos: import("@/lib/pdf/RecueilPdf").InfosRecueil,
  reponses?: Record<string, string>,
) {
  const { Buffer } = await import("buffer");
  const global = globalThis as unknown as { Buffer?: unknown };
  if (!global.Buffer) global.Buffer = Buffer;
  const [{ pdf }, { RecueilPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/RecueilPdf"),
  ]);
  const blob = await pdf(<RecueilPdf infos={infos} {...(reponses ? { reponses } : {})} />).toBlob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `Recueil des besoins - ${infos.nomStagiaire || "apprenant"}.pdf`;
  lien.click();
  URL.revokeObjectURL(url);
}
