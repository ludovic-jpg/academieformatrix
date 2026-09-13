import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ModuleCours } from "@/lib/supports/cours";
import { NB_SLIDES_APPROFONDIES } from "@/lib/supports/cours";

const entree = z.object({
  titreFormation: z.string().trim().min(1).max(200),
  publicCible: z.string().trim().max(1000).default(""),
  module: z.object({
    titre: z.string().trim().min(1).max(200),
    points: z.array(z.string().trim().max(500)).max(30).default([]),
  }),
});

export type EntreeCours = z.infer<typeof entree>;

const MODELE = "claude-3-5-sonnet-20241022";
const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";

const RUBRIQUES = [
  "Concepts clés",
  "Thèses et théories de référence",
  "Exemples pratiques",
  "Mises en situation",
  "Schéma conceptuel décrit en texte",
  "Synthèse et quiz de vérification",
];

function prompt(data: EntreeCours) {
  return [
    `Tu es ingénieur pédagogique francophone expert de la formation professionnelle conforme aux exigences Qualiopi.`,
    `Tu mènes une recherche théorique approfondie et structurée sur le module indiqué, puis tu produis un support e-learning.`,
    `Formation : ${data.titreFormation}`,
    `Public cible : ${data.publicCible || "non précisé"}`,
    `Module : ${data.module.titre}`,
    data.module.points.length
      ? `Points de contenu :\n${data.module.points.map((p) => `- ${p}`).join("\n")}`
      : "",
    `Produis EXACTEMENT ${NB_SLIDES_APPROFONDIES} diapositives, dans cet ordre : ${RUBRIQUES.map((r, i) => `${i + 1}. ${r}`).join(" ; ")}.`,
    `Chaque champ "content" fait 250 à 450 mots, très développé, structuré avec des sous-titres en majuscules suivis de deux-points et des retours à la ligne. Cite les auteurs et modèles théoriques lorsqu'ils existent.`,
    `"keyTakeaways" contient 3 à 5 points de rétention. "interactiveQuiz" propose une question de vérification, 3 options et l'index (0, 1 ou 2) de la bonne réponse.`,
    `N'invente aucune donnée logistique (dates, prix, noms de personnes réelles de l'organisme).`,
    `Réponds EXCLUSIVEMENT par un JSON strict, sans texte ni balises autour, de la forme :`,
    `{"modules":[{"title":"...","slides":[{"slideNumber":1,"title":"...","content":"...","keyTakeaways":["..."],"interactiveQuiz":{"question":"...","options":["A","B","C"],"answerIndex":0}}]}]}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const schemaSortie = z.object({
  modules: z
    .array(
      z.object({
        title: z.string(),
        slides: z
          .array(
            z.object({
              slideNumber: z.coerce.number().int(),
              title: z.string(),
              content: z.string(),
              keyTakeaways: z.array(z.string()).default([]),
              interactiveQuiz: z
                .object({
                  question: z.string().default(""),
                  options: z.array(z.string()).default([]),
                  answerIndex: z.coerce.number().int().default(0),
                })
                .default({ question: "", options: [], answerIndex: 0 }),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

/** Extrait le JSON d'une réponse éventuellement entourée de texte ou de balises. */
function extraireJson(texte: string) {
  const nettoye = texte.replace(/```json|```/g, "").trim();
  const debut = nettoye.indexOf("{");
  const fin = nettoye.lastIndexOf("}");
  if (debut === -1 || fin === -1) throw new Error("json-absent");
  return nettoye.slice(debut, fin + 1);
}

async function appelAnthropic(cle: string, data: EntreeCours) {
  const res = await fetch(URL_ANTHROPIC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cle,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 8000,
      temperature: 0.4,
      stream: true,
      messages: [{ role: "user", content: prompt(data) }],
    }),
  });

  if (!res.ok || !res.body) {
    const brut = await res.text().catch(() => "");
    let message = brut;
    try {
      const parsed = JSON.parse(brut) as { error?: { message?: string } };
      message = parsed.error?.message ?? brut;
    } catch {
      // message brut conservé
    }
    return { ok: false as const, status: res.status, body: message };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let texte = "";
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

/**
 * Recherche théorique approfondie d'un module et production des
 * 6 diapositives e-learning correspondantes (Claude 3.5 Sonnet).
 */
export const genererCoursApprofondi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => entree.parse(input))
  .handler(async ({ data }): Promise<ModuleCours> => {
    const cle = process.env["ANTHROPIC_API_KEY"];
    if (!cle) {
      throw new Error(
        "La clé Anthropic n'est pas encore enregistrée côté serveur.",
      );
    }

    let tentative = await appelAnthropic(cle, data);
    if (
      !tentative.ok &&
      (tentative.status === 429 || tentative.status >= 500)
    ) {
      await new Promise((r) => setTimeout(r, 4000));
      tentative = await appelAnthropic(cle, data);
    }
    if (!tentative.ok) {
      throw new Error(
        `La recherche théorique a échoué (${tentative.status}) : ${tentative.body || "erreur inconnue"}`,
      );
    }

    let brut: unknown;
    try {
      brut = JSON.parse(extraireJson(tentative.body));
    } catch {
      throw new Error("La réponse de Claude n'est pas un JSON exploitable.");
    }

    const valide = schemaSortie.safeParse(brut);
    if (!valide.success) {
      throw new Error("La réponse de Claude ne respecte pas le format attendu.");
    }
    const premier = valide.data.modules[0]!;
    return {
      title: premier.title || data.module.titre,
      slides: premier.slides.map((s, i) => ({ ...s, slideNumber: i + 1 })),
    };
  });
