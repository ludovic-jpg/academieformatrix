import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { nomFichierSur } from "@/lib/storage";

export interface FichierDossier {
  id: string;
  nom: string;
  url: string;
  type?: string;
  date?: string;
}

export interface QuestionnaireDossier {
  id: string;
  type: "positionnement" | "acquis";
  titre: string;
  questions: { question: string; propositions: string[] }[];
  resultat: ResultatQuestionnaire | null;
}

export interface ResultatQuestionnaire {
  questionnaireId: string;
  type: "positionnement" | "acquis";
  score: number;
  total: number;
  pourcentage: number;
  reponses: number[];
  soumisAt: string;
}

export interface SupportCoursDossier {
  id: string;
  numeroModule: number;
  titreModule: string;
  contenu: import("@/lib/supports/cours").ModuleCours;
}

export interface ContenuDossier {
  titreFormation: string;
  dureeHeures: number;
  apprenantPrenom: string;
  apprenantNom: string;
  formateur: string;
  etape: string;
  fichiersCoffre: FichierDossier[];
  questionnaires: QuestionnaireDossier[];
  documentsDeposes: FichierDossier[];
  reponsesRecueil: Record<string, string>;
  recueilSoumis: boolean;
  supportsCours: SupportCoursDossier[];
  resultatsQuestionnaires: ResultatQuestionnaire[];
}

const jetonSchema = z.string().trim().min(10).max(100);

async function chargerDossier(jeton: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: dossier } = await supabaseAdmin
    .from("dossiers_apprenant")
    .select("id, formateur_id, apprenant_id, formation_id, etape")
    .eq("jeton", jeton)
    .maybeSingle();
  if (!dossier) throw new Error("Ce lien n'est plus valide.");
  return { supabaseAdmin, dossier };
}

/** Consultation de l'espace apprenant à partir de son lien personnel. */
export const consulterDossier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ jeton: jetonSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<ContenuDossier> => {
    const { supabaseAdmin, dossier } = await chargerDossier(data.jeton);

    const [
      { data: formation },
      { data: apprenant },
      { data: profil },
      { data: fichiers },
      { data: questionnaires },
      { data: documents },
      { data: recueil },
      { data: supportsCours },
      { data: resultats },
    ] = await Promise.all([
      supabaseAdmin
        .from("formations")
        .select("titre, duree_heures")
        .eq("id", dossier.formation_id)
        .maybeSingle(),
      supabaseAdmin
        .from("apprenants")
        .select("apprenant_prenom, apprenant_nom")
        .eq("id", dossier.apprenant_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profils_formateurs")
        .select("prenom, nom")
        .eq("user_id", dossier.formateur_id)
        .maybeSingle(),
      supabaseAdmin
        .from("coffre_fichiers")
        .select("id, nom, chemin")
        .eq("formation_id", dossier.formation_id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("questionnaires")
        .select("id, type, titre, questions, created_at")
        .eq("formation_id", dossier.formation_id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("documents_dossier")
        .select("id, nom, chemin, type, created_at")
        .eq("dossier_id", dossier.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("reponses_recueil")
        .select("reponses, soumis_at")
        .eq("dossier_id", dossier.id)
        .maybeSingle(),
      supabaseAdmin
        .from("supports_cours")
        .select("id, numero_module, titre_module, contenu")
        .eq("formation_id", dossier.formation_id)
        .order("numero_module", { ascending: true }),
      supabaseAdmin
        .from("reponses_questionnaires")
        .select("questionnaire_id, reponses, score, total, soumis_at, questionnaires(type)")
        .eq("dossier_id", dossier.id),
    ]);

    const signer = async (
      bucket: string,
      liste: { id: string; nom: string; chemin: string; type?: string; created_at?: string }[],
    ) => {
      const resultats: FichierDossier[] = [];
      for (const item of liste) {
        const { data: signe } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(item.chemin, 60 * 60);
        if (signe?.signedUrl) {
          resultats.push({
            id: item.id,
            nom: item.nom,
            url: signe.signedUrl,
            ...(item.type ? { type: item.type } : {}),
            ...(item.created_at ? { date: item.created_at } : {}),
          });
        }
      }
      return resultats;
    };

    const resultatsQuestionnaires: ResultatQuestionnaire[] = (resultats ?? []).map((r) => {
      const relation = r.questionnaires as unknown as { type?: string } | null;
      const total = Number(r.total ?? 0);
      return {
        questionnaireId: r.questionnaire_id,
        type: relation?.type === "acquis" ? "acquis" : "positionnement",
        score: Number(r.score ?? 0),
        total,
        pourcentage: total > 0 ? Math.round((Number(r.score) / total) * 100) : 0,
        reponses: Array.isArray(r.reponses) ? (r.reponses as number[]) : [],
        soumisAt: r.soumis_at,
      };
    });

    // Un seul questionnaire par type : le plus récent, sans transmettre le corrigé.
    const parType = new Map<string, QuestionnaireDossier>();
    for (const q of questionnaires ?? []) {
      if (parType.has(q.type)) continue;
      parType.set(q.type, {
        id: q.id,
        type: q.type as "positionnement" | "acquis",
        titre: q.titre,
        questions: ((q.questions ?? []) as Array<{ question: string; propositions: string[] }>).map(
          (question) => ({ question: question.question, propositions: question.propositions }),
        ),
        resultat: resultatsQuestionnaires.find((r) => r.questionnaireId === q.id) ?? null,
      });
    }

    return {
      titreFormation: formation?.titre ?? "Formation",
      dureeHeures: Number(formation?.duree_heures ?? 0),
      apprenantPrenom: apprenant?.apprenant_prenom ?? "",
      apprenantNom: apprenant?.apprenant_nom ?? "",
      formateur: `${profil?.prenom ?? ""} ${profil?.nom ?? ""}`.trim(),
      etape: dossier.etape,
      fichiersCoffre: await signer("coffre", (fichiers ?? []) as never),
      questionnaires: [...parType.values()],
      documentsDeposes: await signer("coffre", (documents ?? []) as never),
      reponsesRecueil: (recueil?.reponses ?? {}) as Record<string, string>,
      recueilSoumis: !!recueil?.soumis_at,
      supportsCours: (supportsCours ?? []).map((support) => ({
        id: support.id,
        numeroModule: support.numero_module,
        titreModule: support.titre_module,
        contenu: support.contenu as unknown as SupportCoursDossier["contenu"],
      })),
      resultatsQuestionnaires,
    };
  });

/** Corrige et enregistre un QCM depuis le lien personnel de l'apprenant. */
export const soumettreQuestionnaire = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      jeton: jetonSchema,
      questionnaireId: z.string().uuid(),
      reponses: z.array(z.number().int().min(0).max(3)).length(10),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, dossier } = await chargerDossier(data.jeton);
    const { data: questionnaire } = await supabaseAdmin
      .from("questionnaires")
      .select("id, formation_id, questions")
      .eq("id", data.questionnaireId)
      .eq("formation_id", dossier.formation_id)
      .maybeSingle();
    if (!questionnaire) throw new Error("Questionnaire introuvable.");
    const questions = questionnaire.questions as unknown as Array<{ bonneReponse: number }>;
    if (questions.length !== 10) throw new Error("Ce questionnaire ne contient pas 10 questions.");
    const score = questions.reduce(
      (total, question, index) => total + (data.reponses[index] === question.bonneReponse ? 1 : 0),
      0,
    );
    const soumisAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("reponses_questionnaires").upsert({
      dossier_id: dossier.id,
      questionnaire_id: questionnaire.id,
      formateur_id: dossier.formateur_id,
      reponses: data.reponses,
      score,
      total: questions.length,
      soumis_at: soumisAt,
    }, { onConflict: "dossier_id,questionnaire_id" });
    if (error) throw new Error("L'enregistrement de vos réponses a échoué.");
    return {
      score,
      total: questions.length,
      pourcentage: Math.round((score / questions.length) * 100),
      soumisAt,
    };
  });

/** Enregistre les réponses du recueil des besoins saisies en ligne. */
export const enregistrerRecueil = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        jeton: jetonSchema,
        reponses: z.record(z.string(), z.string().max(4000)),
        definitif: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, dossier } = await chargerDossier(data.jeton);
    const { error } = await supabaseAdmin.from("reponses_recueil").upsert(
      {
        dossier_id: dossier.id,
        formateur_id: dossier.formateur_id,
        reponses: data.reponses,
        soumis_at: data.definitif ? new Date().toISOString() : null,
      },
      { onConflict: "dossier_id" },
    );
    if (error) throw new Error("L'enregistrement a échoué.");
    return { ok: true as const };
  });

/** Prépare le dépôt d'un document signé par l'apprenant. */
export const preparerDepotDossier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        jeton: jetonSchema,
        type: z.enum(["recueil", "positionnement", "acquis", "autre"]),
        nom: z.string().trim().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, dossier } = await chargerDossier(data.jeton);
    const chemin = `${dossier.formateur_id}/dossiers/${dossier.id}/${data.type}-${Date.now()}-${nomFichierSur(data.nom)}`;
    const { data: signe, error } = await supabaseAdmin.storage
      .from("coffre")
      .createSignedUploadUrl(chemin);
    if (error || !signe) throw new Error("Le dépôt est indisponible.");
    return { chemin, url: signe.signedUrl, token: signe.token };
  });

/** Enregistre le document déposé une fois le transfert terminé. */
export const confirmerDepotDossier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        jeton: jetonSchema,
        type: z.enum(["recueil", "positionnement", "acquis", "autre"]),
        nom: z.string().trim().min(1).max(200),
        chemin: z.string().trim().min(1).max(500),
        taille: z.coerce.number().int().min(0).max(50 * 1024 * 1024),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, dossier } = await chargerDossier(data.jeton);
    if (!data.chemin.startsWith(`${dossier.formateur_id}/dossiers/${dossier.id}/`)) {
      throw new Error("Dépôt refusé.");
    }
    const { error } = await supabaseAdmin.from("documents_dossier").insert({
      dossier_id: dossier.id,
      formateur_id: dossier.formateur_id,
      type: data.type,
      nom: data.nom,
      chemin: data.chemin,
      taille: data.taille,
    });
    if (error) throw new Error("L'enregistrement du document a échoué.");
    return { ok: true as const };
  });
