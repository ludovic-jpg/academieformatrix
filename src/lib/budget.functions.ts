import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entree = z.object({ demandeId: z.string().uuid() });

/**
 * Envoie la notification de nouvelle demande de budget à l'administration.
 * La demande est relue côté serveur avec les droits du formateur connecté.
 */
export const notifierDemandeBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entree.parse(data))
  .handler(async ({ data, context }) => {
    const { data: demande, error } = await context.supabase
      .from("demandes_budget")
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
      "demande-budget",
      "ludovic@formatrix.fr",
      {
        idempotencyKey: `demande-budget-${demande.id}`,
        replyTo: demande.contact_email || undefined,
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
          periode: demande.periode,
          nombreHeures: demande.nombre_heures,
          budgetEstime: demande.budget_estime,
          commentaire: demande.commentaire,
        },
      },
    );

    return { envoye: resultat.sent };
  });
