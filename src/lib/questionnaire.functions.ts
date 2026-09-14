import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entree = z.object({
  titre: z.string().trim().min(1).max(200),
  niveau: z.string().trim().min(1).max(50),
  publicConcerne: z.string().trim().max(1000).default(""),
  contenu: z.string().trim().max(8000).default(""),
  nombreQuestions: z.coerce.number().int().min(1).max(20),
  type: z.enum(["positionnement", "acquis"]),
});

export type EntreeQuestionnaire = z.infer<typeof entree>;

export interface QuestionQcm {
  question: string;
  propositions: string[];
  bonneReponse: number;
}

export interface ContenuQuestionnaire {
  questions: QuestionQcm[];
}

function promptSysteme(data: EntreeQuestionnaire) {
  const intitule =
    data.type === "positionnement"
      ? "un test de positionnement, passé AVANT la formation pour situer le niveau initial de l'apprenant"
      : "une évaluation des acquis, passée À L'ISSUE de la formation pour mesurer ce qui a été appris";
  return `Tu es un ingénieur pédagogique francophone spécialisé dans la formation professionnelle conforme aux exigences Qualiopi. Tu rédiges ${intitule}. À partir du titre de la formation, du niveau, du public et du contenu détaillé qui te sont fournis, rédige exactement ${data.nombreQuestions} questions à choix multiples, adaptées au niveau indiqué et strictement fondées sur le contenu de la formation. Chaque question comporte 4 propositions de réponse claires et une seule bonne réponse, indiquée par son index (0 à 3). Les questions sont formulées en français, sans numérotation dans le texte. N'invente aucune donnée logistique (dates, prix, noms de personnes). Réponds uniquement en JSON valide strictement conforme au schéma demandé, sans aucun texte avant ou après.`;
}

function promptMessage(data: EntreeQuestionnaire) {
  return [
    `Titre de la formation : ${data.titre}`,
    `Niveau : ${data.niveau}`,
    `Public concerné : ${data.publicConcerne}`,
    `Nombre de questions attendu : ${data.nombreQuestions}`,
    "Contenu de la formation :",
    data.contenu,
    'Réponds exclusivement avec ce JSON strict : {"questions":[{"question":"...","propositions":["...","...","...","..."],"bonneReponse":0}]}',
  ].join("\n");
}

export const genererQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => entree.parse(input))
  .handler(async ({ data }): Promise<ContenuQuestionnaire> => {
    const { genererAvecClaude, extraireJsonClaude } = await import("./claude.server");

    const texte = await genererAvecClaude({
      systeme: promptSysteme(data),
      message: promptMessage(data),
      maxTokens: 6000,
    });

    let contenu: unknown;
    try {
      contenu = extraireJsonClaude(texte);
    } catch {
      throw new Error("La réponse de l'IA n'est pas un JSON valide.");
    }

    const schemaSortie = z.object({
      questions: z.array(
        z.object({
          question: z.string(),
          propositions: z.array(z.string()).length(4),
          bonneReponse: z.number().int().min(0).max(3),
        }),
      ),
    });
    const valide = schemaSortie.safeParse(contenu);
    if (!valide.success) {
      throw new Error("La réponse de l'IA ne respecte pas le format attendu.");
    }
    if (valide.data.questions.length !== data.nombreQuestions) {
      throw new Error(
        `L'IA a généré ${valide.data.questions.length} questions au lieu de ${data.nombreQuestions}. Relancez la génération.`,
      );
    }
    return valide.data;
  });
