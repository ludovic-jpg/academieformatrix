import { createFileRoute, Link } from "@tanstack/react-router";

import { EnTeteFormatrix } from "@/components/EnTeteFormatrix";
import { ORGANISME } from "@/config/organisme";

export const Route = createFileRoute("/politique-confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Formatrix" },
      {
        name: "description",
        content:
          "Politique de confidentialité de Formatrix (Back to Business) : données collectées auprès des formateurs, finalités, durée de conservation et exercice des droits.",
      },
      {
        property: "og:title",
        content: "Politique de confidentialité — Formatrix",
      },
      {
        property: "og:description",
        content:
          "Informations sur le traitement des données personnelles des formateurs par Formatrix.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Politique,
});

function Politique() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <EnTeteFormatrix
          titre="Politique de confidentialité"
          sousTitre="Version provisoire"
        />

        <div className="mt-8 rounded-md border border-dashed border-primary/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Texte provisoire, à remplacer par la version officielle Formatrix.
        </div>

        <article className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">
              1. Responsable du traitement
            </h2>
            <p>
              {ORGANISME.raisonSociale} ({ORGANISME.nomAffiche}),{" "}
              {ORGANISME.adresse}. SIRET {ORGANISME.siret}. Déclaration
              d'activité enregistrée sous le numéro{" "}
              {ORGANISME.numeroDeclarationActivite} auprès du préfet de la
              région {ORGANISME.prefecture}. Contact : {ORGANISME.email} —{" "}
              {ORGANISME.telephone}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">
              2. Données collectées
            </h2>
            <p>
              Dans le cadre des candidatures de formateurs : nom, prénom,
              adresse postale, adresse électronique, numéro de téléphone,
              numéro de déclaration d'activité, SIRET, ainsi que les pièces
              déposées (CV, diplômes, pièce d'identité, extrait de casier
              judiciaire, autres justificatifs).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">3. Finalités</h2>
            <p>
              Instruction et suivi des candidatures de formateurs, respect des
              obligations légales liées à l'activité de formation
              professionnelle et aux exigences qualité, gestion de la relation
              contractuelle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">
              4. Base légale
            </h2>
            <p>
              Exécution de mesures précontractuelles et du contrat, respect
              d'obligations légales, et consentement pour le dépôt des pièces
              justificatives.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">
              5. Destinataires
            </h2>
            <p>
              Les données sont accessibles uniquement au formateur concerné et
              aux personnes habilitées de {ORGANISME.raisonSociale}. Elles ne
              sont ni cédées ni revendues à des tiers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">
              6. Durée de conservation
            </h2>
            <p>
              Les pièces des candidatures non retenues sont conservées 12 mois.
              Les données des formateurs retenus sont conservées pendant la
              durée de la collaboration, puis pendant les durées légales de
              prescription applicables.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">7. Vos droits</h2>
            <p>
              Vous disposez d'un droit d'accès, de rectification, d'effacement,
              de limitation, d'opposition et de portabilité. Pour les exercer,
              écrivez à {ORGANISME.email}. Vous pouvez également introduire une
              réclamation auprès de la CNIL.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-primary">8. Sécurité</h2>
            <p>
              Les documents déposés sont stockés dans un espace privé et ne sont
              accessibles qu'au formateur qui les a déposés et aux personnes
              habilitées de l'organisme.
            </p>
          </section>
        </article>

        <p className="mt-10 text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
