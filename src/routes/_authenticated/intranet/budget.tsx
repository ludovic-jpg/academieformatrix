import { createFileRoute } from "@tanstack/react-router";

import { FormulaireDemande } from "@/components/FormulaireDemande";

export const Route = createFileRoute("/_authenticated/intranet/budget")({
  component: DemandeBudget,
});

function DemandeBudget() {
  return (
    <FormulaireDemande
      typeDemande="budget"
      titre="Demande de budget"
      description="Renseignez les informations concernant l'apprenant et son entreprise. La demande est transmise à l'administration Formatrix pour traitement."
    />
  );
}
