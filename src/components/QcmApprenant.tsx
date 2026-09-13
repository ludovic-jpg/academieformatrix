import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { QuestionnaireDossier, ResultatQuestionnaire } from "@/lib/dossier.functions";

export function QcmApprenant({ questionnaire, onSubmit }: {
  questionnaire: QuestionnaireDossier;
  onSubmit: (questionnaireId: string, reponses: number[]) => Promise<ResultatQuestionnaire>;
}) {
  const [reponses, setReponses] = useState<number[]>(questionnaire.resultat?.reponses ?? []);
  const [resultat, setResultat] = useState(questionnaire.resultat);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    setReponses(questionnaire.resultat?.reponses ?? []);
    setResultat(questionnaire.resultat);
  }, [questionnaire]);

  const soumettre = async () => {
    if (!questionnaire.questions.every((_, index) => Number.isInteger(reponses[index]))) {
      setErreur("Répondez aux 10 questions avant de transmettre votre évaluation.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      setResultat(await onSubmit(questionnaire.id, reponses));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La transmission a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-5">
      {resultat && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <div>
            <p className="font-bold text-primary">Résultat : {resultat.score}/{resultat.total} — {resultat.pourcentage} %</p>
            <p className="text-xs text-muted-foreground">Vous pouvez modifier vos réponses puis transmettre à nouveau.</p>
          </div>
        </div>
      )}
      {questionnaire.questions.map((question, index) => (
        <fieldset key={`${question.question}-${index}`} className="space-y-3 rounded-md border p-4">
          <legend className="px-1 text-sm font-bold text-primary">{index + 1}. {question.question}</legend>
          <RadioGroup
            value={reponses[index]?.toString() ?? null}
            onValueChange={(value) => setReponses((actuelles) => {
              const suivantes = [...actuelles];
              suivantes[index] = Number(value);
              return suivantes;
            })}
          >
            {question.propositions.map((proposition, choix) => (
              <Label key={proposition} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal hover:bg-accent">
                <RadioGroupItem value={String(choix)} className="mt-0.5" />
                <span>{proposition}</span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
      ))}
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <Button disabled={envoi || questionnaire.questions.length !== 10} onClick={() => void soumettre()}>
        {envoi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {resultat ? "Mettre à jour mes réponses" : "Transmettre mon évaluation"}
      </Button>
    </div>
  );
}