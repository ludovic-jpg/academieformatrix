import { createFileRoute } from "@tanstack/react-router";

import { FormulaireDemandeFormation } from "@/components/FormulaireDemandeFormation";

export const Route = createFileRoute(
  "/_authenticated/intranet/demande-formation",
)({
  component: FormulaireDemandeFormation,
});
