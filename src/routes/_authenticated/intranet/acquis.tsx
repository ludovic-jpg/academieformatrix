import { createFileRoute } from "@tanstack/react-router";

import { EspaceQuestionnaire } from "@/components/EspaceQuestionnaire";

export const Route = createFileRoute("/_authenticated/intranet/acquis")({
  component: () => (
    <EspaceQuestionnaire
      type="acquis"
      intitule="Évaluation des acquis"
      nombreQuestions={8}
    />
  ),
});
