import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const entreeGeneration = z.object({
  titre: z.string().trim().min(1).max(200),
  dureeHeures: z.coerce.number().positive().max(1000),
  publicConcerne: z.string().trim().min(1).max(1000),
  niveau: z.string().trim().min(1).max(50),
  prerequis: z.string().trim().min(1).max(1000),
  nombreModules: z.coerce.number().int().min(1).max(20),
});

export type EntreeGeneration = z.infer<typeof entreeGeneration>;

export interface ContenuGenere {
  objectifs: string[];
  modules: { titre: string; points: string[] }[];
}

const PROMPT_SYSTEME =
  "Tu es un ingénieur pédagogique francophone spécialisé dans la rédaction de programmes de formation professionnelle conformes aux exigences Qualiopi. À partir du titre, de la durée totale en heures, du public concerné, du niveau, des prérequis et du nombre de modules souhaité qui te sont fournis, rédige : 1) une liste de 4 à 8 objectifs pédagogiques opérationnels formulés avec des verbes d'action à l'infinitif, sans numérotation ; 2) un découpage en {nombreModules} modules (ou jours), chacun avec un titre court et 4 à 7 points de contenu concis, de style télégraphique (comme un sommaire), sans phrases longues. N'invente aucune donnée logistique (dates, prix, noms de personnes). Réponds uniquement en JSON valide strictement conforme au schéma demandé, sans aucun texte avant ou après.";

const SCHEMA_JSON = {
  type: "object",
  additionalProperties: false,
  properties: {
    objectifs: { type: "array", items: { type: "string" } },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titre: { type: "string" },
          points: { type: "array", items: { type: "string" } },
        },
        required: ["titre", "points"],
      },
    },
  },
  required: ["objectifs", "modules"],
} as const;

const URL_GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

async function appelGateway(
  apiKey: string,
  entree: EntreeGeneration,
): Promise<{ ok: boolean; status: number; body: string }> {
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
          name: "programme_formation",
          strict: true,
          schema: SCHEMA_JSON,
        },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: PROMPT_SYSTEME.replace(
                "{nombreModules}",
                String(entree.nombreModules),
              ),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Titre : ${entree.titre}`,
                `Durée totale : ${entree.dureeHeures} heures`,
                `Public concerné : ${entree.publicConcerne}`,
                `Niveau : ${entree.niveau}`,
                `Prérequis : ${entree.prerequis}`,
                `Nombre de modules souhaité : ${entree.nombreModules}`,
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
      const parsed = JSON.parse(texte) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? texte;
    } catch {
      // message brut conservé
    }
    return { ok: false, status: res.status, body: message };
  }

  // Lecture du flux SSE : accumulation du texte de sortie.
  let texte = "";
  const reader = res.body?.getReader();
  if (!reader) return { ok: false, status: 500, body: "Flux de réponse indisponible." };
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
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          texte = evt.response.output_text;
        }
      } catch {
        // événement non JSON ignoré
      }
    }
  }
  return { ok: true, status: 200, body: texte };
}

export const genererProgramme = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entreeGeneration.parse(input))
  .handler(async ({ data }): Promise<ContenuGenere> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "Configuration IA manquante côté serveur (clé Lovable AI absente).",
      );
    }

    let tentative = await appelGateway(apiKey, data);
    if (!tentative.ok && (tentative.status === 429 || tentative.status >= 500)) {
      // Une seule nouvelle tentative, avec délai, pour les erreurs transitoires.
      await new Promise((r) => setTimeout(r, 3000));
      tentative = await appelGateway(apiKey, data);
    }
    if (!tentative.ok) {
      throw new Error(
        `La génération a échoué (${tentative.status}) : ${tentative.body || "erreur inconnue"}`,
      );
    }

    let contenu: ContenuGenere;
    try {
      contenu = JSON.parse(tentative.body) as ContenuGenere;
    } catch {
      throw new Error("La réponse de l'IA n'est pas un JSON valide.");
    }

    const schemaSortie = z.object({
      objectifs: z.array(z.string()),
      modules: z.array(z.object({ titre: z.string(), points: z.array(z.string()) })),
    });
    const valide = schemaSortie.safeParse(contenu);
    if (!valide.success) {
      throw new Error("La réponse de l'IA ne respecte pas le format attendu.");
    }
    if (valide.data.modules.length !== data.nombreModules) {
      throw new Error(
        `L'IA a généré ${valide.data.modules.length} modules au lieu de ${data.nombreModules}. Relancez la génération.`,
      );
    }
    return valide.data;
  });
