import { createFileRoute } from "@tanstack/react-router";

import { EspaceQuestionnaire } from "@/components/EspaceQuestionnaire";

export const Route = createFileRoute("/_authenticated/intranet/positionnement")(
  {
    component: () => (
      <EspaceQuestionnaire
        type="positionnement"
        intitule="Test de positionnement"
        nombreQuestions={7}
      />
    ),
  },
);
