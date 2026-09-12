import { createFileRoute } from "@tanstack/react-router";

import { FormulaireDemande } from "@/components/FormulaireDemande";

export const Route = createFileRoute(
  "/_authenticated/intranet/demande-formation",
)({
  component: DemandeFormation,
});

function DemandeFormation() {
  return (
    <FormulaireDemande
      typeDemande="formation"
      titre="Demande de formation"
      description="Constituez le dossier de formation d'un apprenant. Il est transmis à l'administration Formatrix, puis archivé une fois validé."
    />
  );
}
