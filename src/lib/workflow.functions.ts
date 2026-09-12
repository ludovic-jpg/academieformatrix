import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { WORKFLOWS } from "@/config/workflows";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entree = z.object({
  dossierId: z.string().uuid(),
  etape: z.enum(["positionnement", "financement", "realisation", "finalisation"]),
  origine: z.string().trim().url().max(300),
});

/**
 * Envoie à l'apprenant l'email correspondant à l'étape du parcours,
 * avec le lien vers son espace personnel, et met à jour l'étape du dossier.
 */
export const envoyerWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entree.parse(data))
  .handler(async ({ data, context }) => {
    const { data: dossier, error } = await context.supabase
      .from("dossiers_apprenant")
      .select("id, jeton, apprenant_id, formation_id, formateur_id")
      .eq("id", data.dossierId)
      .maybeSingle();
    if (error || !dossier) throw new Error("Dossier introuvable.");

    const [{ data: apprenant }, { data: formation }, { data: profil }] =
      await Promise.all([
        context.supabase
          .from("apprenants")
          .select("apprenant_prenom, apprenant_nom, apprenant_email")
          .eq("id", dossier.apprenant_id)
          .maybeSingle(),
        context.supabase
          .from("formations")
          .select("titre")
          .eq("id", dossier.formation_id)
          .maybeSingle(),
        context.supabase
          .from("profils_formateurs")
          .select("prenom, nom, email")
          .eq("user_id", dossier.formateur_id)
          .maybeSingle(),
      ]);

    const destinataire = apprenant?.apprenant_email?.trim();
    if (!destinataire) {
      throw new Error("Cet apprenant n'a pas d'adresse email renseignée.");
    }

    const etape = WORKFLOWS.find((w) => w.cle === data.etape);
    const { sendTemplateEmail } = await import(
      "@/lib/email-templates/send-email"
    );

    const resultat = await sendTemplateEmail("workflow-apprenant", destinataire, {
      idempotencyKey: `workflow-${dossier.id}-${data.etape}`,
      ...(profil?.email ? { replyTo: profil.email } : {}),
      templateData: {
        apprenantPrenom: apprenant?.apprenant_prenom ?? "",
        titreFormation: formation?.titre ?? "",
        titreEtape: etape?.titre ?? "",
        message: etape?.message ?? "",
        lien: `${data.origine.replace(/\/$/, "")}/dossier/${dossier.jeton}`,
        formateur: `${profil?.prenom ?? ""} ${profil?.nom ?? ""}`.trim(),
      },
    });

    await context.supabase
      .from("dossiers_apprenant")
      .update({ etape: data.etape })
      .eq("id", dossier.id);

    return { envoye: resultat.sent };
  });
