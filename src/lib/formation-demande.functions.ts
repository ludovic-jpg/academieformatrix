import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entree = z.object({ demandeId: z.string().uuid() });

/**
 * Envoie la notification de nouvelle demande de formation à l'administration.
 * La demande est relue côté serveur avec les droits du formateur connecté.
 */
export const notifierDemandeFormation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entree.parse(data))
  .handler(async ({ data, context }) => {
    const { data: demande, error } = await context.supabase
      .from("demandes_formation")
      .select("*")
      .eq("id", data.demandeId)
      .maybeSingle();

    if (error || !demande) {
      return { envoye: false as const };
    }

    const { sendTemplateEmail } = await import(
      "@/lib/email-templates/send-email"
    );

    const resultat = await sendTemplateEmail(
      "demande-formation",
      "ludovic@formatrix.fr",
      {
        idempotencyKey: `demande-formation-${demande.id}`,
        ...(demande.contact_email ? { replyTo: demande.contact_email } : {}),
        templateData: {
          apprenantPrenom: demande.apprenant_prenom,
          apprenantNom: demande.apprenant_nom,
          apprenantEmail: demande.apprenant_email,
          apprenantTelephone: demande.apprenant_telephone,
          entrepriseNom: demande.entreprise_nom,
          entrepriseSiret: demande.entreprise_siret,
          entrepriseAdresse: demande.entreprise_adresse,
          contactNom: demande.contact_nom,
          contactEmail: demande.contact_email,
          formationSouhaitee: demande.formation_souhaitee,
        },
      },
    );

    return { envoye: resultat.sent };
  });
