import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const entree = z.object({
  titreParcours: z.string().trim().min(1).max(200),
  numeroModule: z.coerce.number().int().min(1).max(50),
  titreModule: z.string().trim().min(1).max(200),
  points: z.array(z.string().trim().max(500)).max(30).default([]),
  niveau: z.string().trim().max(50).default(""),
  publicConcerne: z.string().trim().max(1000).default(""),
  partie: z.enum(["theorie", "exercices"]),
});

export type EntreeSupport = z.infer<typeof entree>;

export interface SlideSupport {
  titre: string;
  puces: string[];
  commentaire: string;
}

export interface ContenuSupport {
  slides: SlideSupport[];
}

const NB_SLIDES = 15;

const SCHEMA_JSON = {
  type: "object",
  additionalProperties: false,
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titre: { type: "string" },
          puces: { type: "array", items: { type: "string" } },
          commentaire: { type: "string" },
        },
        required: ["titre", "puces", "commentaire"],
      },
    },
  },
  required: ["slides"],
} as const;

const URL_GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

function promptSysteme(data: EntreeSupport) {
  const nature =
    data.partie === "theorie"
      ? "un support de formation THÉORIQUE : apports de contenu, définitions, méthodes, repères clés, exemples illustratifs"
      : "un support de formation consacré exclusivement à la PRATIQUE : consignes d'exercices, mises en situation, cas pratiques, questions de travail, corrigés commentés";
  return `Tu es un ingénieur pédagogique francophone spécialisé dans la formation professionnelle conforme aux exigences Qualiopi. Tu conçois ${nature}, destiné à être projeté en diaporama. Rédige exactement ${NB_SLIDES} diapositives pour le module indiqué, strictement fondées sur le titre du module et ses points de contenu, adaptées au niveau et au public fournis. Chaque diapositive comporte un titre court (moins de 80 caractères), 3 à 6 puces de style télégraphique (moins de 140 caractères chacune) et un commentaire d'animation pour le formateur (2 à 3 phrases). La première diapositive introduit le module et ses objectifs, la dernière fait la synthèse. N'invente aucune donnée logistique (dates, prix, noms de personnes). Réponds uniquement en JSON valide strictement conforme au schéma demandé, sans aucun texte avant ou après.`;
}

async function appelGateway(apiKey: string, data: EntreeSupport) {
  const res = await fetch(URL_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: "support_formation",
          strict: true,
          schema: SCHEMA_JSON,
        },
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: promptSysteme(data) }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Parcours de formation : ${data.titreParcours}`,
                `Module ${data.numeroModule} : ${data.titreModule}`,
                `Points de contenu du module :`,
                ...data.points.map((p) => `- ${p}`),
                `Niveau : ${data.niveau || "non précisé"}`,
                `Public concerné : ${data.publicConcerne || "non précisé"}`,
              ].join("\n"),
            },
          ],
        },
      ],
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
    return { ok: false, status: res.status, body: message };
  }

  let texte = "";
  const reader = res.body?.getReader();
  if (!reader)
    return { ok: false, status: 500, body: "Flux de réponse indisponible." };
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
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && evt.delta) {
          texte += evt.delta;
        } else if (
          evt.type === "response.completed" &&
          evt.response?.output_text
        ) {
          texte = evt.response.output_text;
        }
      } catch {
        // événement non JSON ignoré
      }
    }
  }
  return { ok: true, status: 200, body: texte };
}

export const genererSupport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entree.parse(input))
  .handler(async ({ data }): Promise<ContenuSupport> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "Configuration IA manquante côté serveur (clé Lovable AI absente).",
      );
    }

    let tentative = await appelGateway(apiKey, data);
    if (!tentative.ok && (tentative.status === 429 || tentative.status >= 500)) {
      await new Promise((r) => setTimeout(r, 3000));
      tentative = await appelGateway(apiKey, data);
    }
    if (!tentative.ok) {
      throw new Error(
        `La génération a échoué (${tentative.status}) : ${tentative.body || "erreur inconnue"}`,
      );
    }

    let contenu: unknown;
    try {
      contenu = JSON.parse(tentative.body);
    } catch {
      throw new Error("La réponse de l'IA n'est pas un JSON valide.");
    }

    const schemaSortie = z.object({
      slides: z.array(
        z.object({
          titre: z.string(),
          puces: z.array(z.string()),
          commentaire: z.string(),
        }),
      ),
    });
    const valide = schemaSortie.safeParse(contenu);
    if (!valide.success) {
      throw new Error("La réponse de l'IA ne respecte pas le format attendu.");
    }
    if (valide.data.slides.length === 0) {
      throw new Error("L'IA n'a produit aucune diapositive. Relancez la génération.");
    }
    return valide.data;
  });
