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

function promptSysteme(data: EntreeSupport) {
  const nature =
    data.partie === "theorie"
      ? "un support de formation THÉORIQUE : apports de contenu approfondis, définitions précises, concepts clés, théories et modèles de référence du domaine, repères chiffrés, exemples illustratifs concrets"
      : "un support de formation consacré exclusivement à la PRATIQUE : consignes d'exercices, mises en situation réalistes, cas pratiques ancrés dans les méthodes et outils reconnus du domaine, questions de travail, corrigés commentés";
  return [
    `Tu es un ingénieur pédagogique francophone spécialisé dans la formation professionnelle conforme aux exigences Qualiopi.`,
    `Avant de rédiger, mène une recherche théorique sur les concepts clés, les théories et les modèles de référence propres au module indiqué, afin de produire un contenu réellement approfondi et non générique.`,
    `Tu conçois ${nature}, destiné à être projeté en diaporama.`,
    `Rédige exactement ${NB_SLIDES} diapositives pour le module indiqué, strictement fondées sur le titre du module et ses points de contenu, adaptées au niveau et au public fournis.`,
    `Chaque diapositive comporte un titre court (moins de 80 caractères), 3 à 6 puces de style télégraphique (moins de 140 caractères chacune) qui intègrent les concepts clés identifiés et, lorsqu'ils existent, les théories ou auteurs de référence, ainsi qu'un commentaire d'animation pour le formateur (2 à 3 phrases) qui explicite ces concepts pour l'intervenant.`,
    `La première diapositive introduit le module et ses objectifs, la dernière fait la synthèse.`,
    `N'invente aucune donnée logistique (dates, prix, noms de personnes).`,
    `Réponds uniquement en JSON valide, sans aucun texte avant ou après.`,
  ].join(" ");
}

export const genererSupport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entree.parse(input))
  .handler(async ({ data }): Promise<ContenuSupport> => {
    const { genererAvecClaude, extraireJsonClaude } = await import("./claude.server");

    const reponse = await genererAvecClaude({
      systeme: promptSysteme(data),
      maxTokens: 16000,
      message: [
        `Parcours de formation : ${data.titreParcours}`,
        `Module ${data.numeroModule} : ${data.titreModule}`,
        `Points de contenu du module :`,
        ...data.points.map((p) => `- ${p}`),
        `Niveau : ${data.niveau || "non précisé"}`,
        `Public concerné : ${data.publicConcerne || "non précisé"}`,
        'Réponds exclusivement avec ce JSON strict : {"slides":[{"titre":"...","puces":["..."],"commentaire":"..."}]}',
      ].join("\n"),
    });

    const contenu = extraireJsonClaude(reponse);

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
