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
  "Tu es un ingénieur pédagogique francophone spécialisé dans la rédaction de programmes de formation professionnelle conformes aux exigences Qualiopi. À partir du titre, de la durée totale en heures, du public concerné, du niveau, des prérequis et du nombre de modules souhaité qui te sont fournis, rédige : 1) une liste de 4 à 8 objectifs pédagogiques opérationnels formulés avec des verbes d'action à l'infinitif, sans numérotation ; 2) un découpage en {nombreModules} modules (ou jours), chacun avec un titre court et 4 à 7 points de contenu concis, de style télégraphique (comme un sommaire), sans phrases longues. N'invente aucune donnée logistique (dates, prix, noms de personnes). Réponds uniquement en JSON valide, sans aucun texte avant ou après.";

export const genererProgramme = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entreeGeneration.parse(input))
  .handler(async ({ data }): Promise<ContenuGenere> => {
    const { genererAvecClaude, extraireJsonClaude } = await import(
      "./claude.server"
    );

    const reponse = await genererAvecClaude({
      systeme: PROMPT_SYSTEME.replace(
        "{nombreModules}",
        String(data.nombreModules),
      ),
      maxTokens: 6000,
      message: [
        `Titre : ${data.titre}`,
        `Durée totale : ${data.dureeHeures} heures`,
        `Public concerné : ${data.publicConcerne}`,
        `Niveau : ${data.niveau}`,
        `Prérequis : ${data.prerequis}`,
        `Nombre de modules souhaité : ${data.nombreModules}`,
        'Réponds exclusivement avec ce JSON strict : {"objectifs":["..."],"modules":[{"titre":"...","points":["..."]}]}',
      ].join("\n"),
    });

    const contenu = extraireJsonClaude(reponse);

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
