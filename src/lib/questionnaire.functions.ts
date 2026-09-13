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

const MODELE = "claude-sonnet-5";
const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";

function promptSysteme(data: EntreeQuestionnaire) {
  const intitule =
    data.type === "positionnement"
      ? "un test de positionnement, passé AVANT la formation pour situer le niveau initial de l'apprenant"
      : "une évaluation des acquis, passée À L'ISSUE de la formation pour mesurer ce qui a été appris";
  return `Tu es un ingénieur pédagogique francophone spécialisé dans la formation professionnelle conforme aux exigences Qualiopi. Tu rédiges ${intitule}. À partir du titre de la formation, du niveau, du public et du contenu détaillé qui te sont fournis, rédige exactement ${data.nombreQuestions} questions à choix multiples, adaptées au niveau indiqué et strictement fondées sur le contenu de la formation. Chaque question comporte 4 propositions de réponse claires et une seule bonne réponse, indiquée par son index (0 à 3). Les questions sont formulées en français, sans numérotation dans le texte. N'invente aucune donnée logistique (dates, prix, noms de personnes). Réponds uniquement en JSON valide strictement conforme au schéma demandé, sans aucun texte avant ou après.`;
}

async function appelAnthropic(apiKey: string, data: EntreeQuestionnaire) {
  const res = await fetch(URL_ANTHROPIC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 6000,
      stream: true,
      system: promptSysteme(data),
      messages: [{
        role: "user",
        content: [
          `Titre de la formation : ${data.titre}`,
          `Niveau : ${data.niveau}`,
          `Public concerné : ${data.publicConcerne}`,
          `Nombre de questions attendu : ${data.nombreQuestions}`,
          "Contenu de la formation :",
          data.contenu,
          'Réponds exclusivement avec ce JSON strict : {"questions":[{"question":"...","propositions":["...","...","...","..."],"bonneReponse":0}]}',
        ].join("\n"),
      }],
    }),
  });

  if (!res.ok) {
    const texte = await res.text().catch(() => "");
    let message = texte;
    try {
      const parsed = JSON.parse(texte) as {
        error?: { message?: string };
        message?: string;
      };
      message = parsed.error?.message ?? parsed.message ?? texte;
    } catch {
      // message brut conservé
    }
    return { ok: false as const, status: res.status, body: message };
  }

  let texte = "";
  const reader = res.body?.getReader();
  if (!reader)
    return { ok: false as const, status: 500, body: "Flux indisponible." };
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lignes = buffer.split("\n");
    buffer = lignes.pop() ?? "";
    for (const ligne of lignes) {
      const t = ligne.trim();
      if (!t.startsWith("data:")) continue;
      const donnees = t.slice(5).trim();
      if (!donnees || donnees === "[DONE]") continue;
      try {
        const evt = JSON.parse(donnees) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (evt.type === "content_block_delta" && evt.delta?.text) {
          texte += evt.delta.text;
        }
      } catch {
        // événement non JSON ignoré
      }
    }
  }
  return { ok: true as const, status: 200, body: texte };
}

export const genererQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => entree.parse(input))
  .handler(async ({ data }): Promise<ContenuQuestionnaire> => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "Configuration Claude manquante côté serveur.",
      );
    }

    let tentative = await appelAnthropic(apiKey, data);
    if (!tentative.ok && (tentative.status === 429 || tentative.status >= 500)) {
      await new Promise((r) => setTimeout(r, 3000));
      tentative = await appelAnthropic(apiKey, data);
    }
    if (!tentative.ok) {
      throw new Error(
        `La génération a échoué (${tentative.status}) : ${tentative.body || "erreur inconnue"}`,
      );
    }

    let contenu: unknown;
    try {
      const nettoye = tentative.body.replace(/```json|```/g, "").trim();
      const debut = nettoye.indexOf("{");
      const fin = nettoye.lastIndexOf("}");
      if (debut < 0 || fin < debut) throw new Error("json-absent");
      contenu = JSON.parse(nettoye.slice(debut, fin + 1));
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
