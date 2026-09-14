import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface FichierPartage {
  id: string;
  nom: string;
  taille: number;
  url: string;
  numeroModule: number | null;
}

export interface ModulePartage {
  titre: string;
}

export interface ContenuPartage {
  titreFormation: string;
  modules: ModulePartage[];
  fichiers: FichierPartage[];
}

/**
 * Consultation publique, en lecture seule, des fichiers du coffre-fort
 * associés à un lien de partage actif. Aucun compte n'est nécessaire ;
 * seuls les fichiers de la formation partagée sont exposés.
 */
export const consulterPartage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ jeton: z.string().trim().min(10).max(100) }).parse(input),
  )
  .handler(async ({ data }): Promise<ContenuPartage> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: partage, error: erreurPartage } = await supabaseAdmin
      .from("partages_coffre")
      .select("formation_id, actif")
      .eq("jeton", data.jeton)
      .maybeSingle();

    if (erreurPartage) throw new Error("Lien de partage indisponible.");
    if (!partage || !partage.actif) {
      throw new Error("Ce lien de partage n'est plus valide.");
    }

    const { data: formation } = await supabaseAdmin
      .from("formations")
      .select("titre, programme")
      .eq("id", partage.formation_id)
      .maybeSingle();

    const programme = formation?.programme as { modules?: { titre: string }[] } | null;
    const modules: ModulePartage[] = (programme?.modules ?? []).map((m) => ({
      titre: m.titre,
    }));

    const { data: fichiers, error: erreurFichiers } = await supabaseAdmin
      .from("coffre_fichiers")
      .select("id, nom, chemin, taille")
      .eq("formation_id", partage.formation_id)
      .order("created_at", { ascending: true });

    if (erreurFichiers) throw new Error("Fichiers indisponibles.");

    const resultats: FichierPartage[] = [];
    for (const fichier of fichiers ?? []) {
      // Le coffre-fort partagé ne contient que des PDF, jamais de PowerPoint.
      if (/\.pptx?$/i.test(fichier.nom)) continue;
      const { data: signe } = await supabaseAdmin.storage
        .from("coffre")
        .createSignedUrl(fichier.chemin, 60 * 60);
      if (signe?.signedUrl) {
        const correspondance = fichier.nom.match(/Module ([0-9]+)/);
        resultats.push({
          id: fichier.id,
          nom: fichier.nom,
          taille: Number(fichier.taille ?? 0),
          url: signe.signedUrl,
          numeroModule: correspondance ? Number(correspondance[1]) : null,
        });
      }
    }

    return {
      titreFormation: formation?.titre ?? "Formation",
      modules,
      fichiers: resultats,
    };
  });
