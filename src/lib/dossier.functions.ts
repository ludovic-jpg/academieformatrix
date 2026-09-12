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
  questions: { question: string; propositions: string[]; bonneReponse: number }[];
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

    // Un seul questionnaire par type : le plus récent.
    const parType = new Map<string, QuestionnaireDossier>();
    for (const q of questionnaires ?? []) {
      if (parType.has(q.type)) continue;
      parType.set(q.type, {
        id: q.id,
        type: q.type as "positionnement" | "acquis",
        titre: q.titre,
        questions: (q.questions ?? []) as QuestionnaireDossier["questions"],
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
